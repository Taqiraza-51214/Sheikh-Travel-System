using Dapper;
using FluentValidation;
using MediatR;
using SheikhTravelSystem.Application.Common;
using SheikhTravelSystem.Application.Common.Exceptions;
using SheikhTravelSystem.Application.Common.Interfaces;

namespace SheikhTravelSystem.Application.Features.Fleet.Maintenance;

public record WorkOrderDto(
    int Id,
    string OrderNumber,
    int VehicleId,
    string? VehicleName,
    string? VehicleRegistration,
    string ServiceType,
    string? WorkshopName,
    string Status,
    string Priority,
    decimal EstimatedCost,
    decimal? ActualCost,
    DateTime? StartDate,
    DateTime? CompletedDate,
    string? Description,
    DateTime CreatedAt);

public record CreateWorkOrderDto(
    int VehicleId,
    string ServiceType,
    string? WorkshopName,
    string Priority,
    decimal EstimatedCost,
    decimal? ActualCost,
    DateTime? StartDate,
    string? Description);

public record GetWorkOrdersQuery : IRequest<ApiResponse<IReadOnlyList<WorkOrderDto>>>;

public record GetWorkOrderByIdQuery(int Id) : IRequest<ApiResponse<WorkOrderDto>>;

public record CreateWorkOrderCommand(CreateWorkOrderDto WorkOrder)
    : IRequest<ApiResponse<WorkOrderDto>>;

public record ApproveWorkOrderCommand(int Id) : IRequest<ApiResponse<WorkOrderDto>>;

public record UpdateWorkOrderStatusDto(string Status);

public record UpdateWorkOrderStatusCommand(int Id, UpdateWorkOrderStatusDto Body)
    : IRequest<ApiResponse<WorkOrderDto>>;

public class CreateWorkOrderCommandValidator : AbstractValidator<CreateWorkOrderCommand>
{
    public CreateWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrder.VehicleId).GreaterThan(0);
        RuleFor(x => x.WorkOrder.ServiceType).NotEmpty().MaximumLength(120);
        RuleFor(x => x.WorkOrder.Priority).NotEmpty().MaximumLength(20);
        RuleFor(x => x.WorkOrder.EstimatedCost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.WorkOrder.ActualCost).GreaterThanOrEqualTo(0).When(x => x.WorkOrder.ActualCost.HasValue);
    }
}

public class GetWorkOrdersQueryHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<GetWorkOrdersQuery, ApiResponse<IReadOnlyList<WorkOrderDto>>>
{
    public async Task<ApiResponse<IReadOnlyList<WorkOrderDto>>> Handle(
        GetWorkOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        using var connection = dbFactory.CreateConnection();

        var rows = await connection.QueryAsync<WorkOrderDto>(new CommandDefinition(
            WorkOrderSql.SelectList,
            new { TenantId = tenantId },
            cancellationToken: cancellationToken));

        return ApiResponse<IReadOnlyList<WorkOrderDto>>.SuccessResponse(rows.ToList());
    }
}

public class GetWorkOrderByIdQueryHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<GetWorkOrderByIdQuery, ApiResponse<WorkOrderDto>>
{
    public async Task<ApiResponse<WorkOrderDto>> Handle(
        GetWorkOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        using var connection = dbFactory.CreateConnection();

        var row = await connection.QueryFirstOrDefaultAsync<WorkOrderDto>(new CommandDefinition(
            WorkOrderSql.SelectById,
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (row is null)
            throw new NotFoundException("WorkOrder", request.Id);

        return ApiResponse<WorkOrderDto>.SuccessResponse(row);
    }
}

public class CreateWorkOrderCommandHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<CreateWorkOrderCommand, ApiResponse<WorkOrderDto>>
{
    public async Task<ApiResponse<WorkOrderDto>> Handle(
        CreateWorkOrderCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        var dto = request.WorkOrder;
        using var connection = dbFactory.CreateConnection();

        await EnsureVehicleExistsAsync(connection, dto.VehicleId, tenantId, cancellationToken);

        var nextNumber = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(1) FROM WorkOrders WHERE TenantId = @TenantId",
            new { TenantId = tenantId },
            cancellationToken: cancellationToken)) + 1;

        var orderNumber = $"WO-{nextNumber:D5}";

        var id = await connection.ExecuteScalarAsync<int>(new CommandDefinition("""
            INSERT INTO WorkOrders
                (TenantId, OrderNumber, VehicleId, ServiceType, WorkshopName, Status, Priority,
                 EstimatedCost, ActualCost, StartDate, Description, CreatedAt, IsDeleted)
            VALUES
                (@TenantId, @OrderNumber, @VehicleId, @ServiceType, @WorkshopName, N'open', @Priority,
                 @EstimatedCost, @ActualCost, @StartDate, @Description, @CreatedAt, 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """,
            new
            {
                TenantId = tenantId,
                OrderNumber = orderNumber,
                dto.VehicleId,
                ServiceType = dto.ServiceType.Trim(),
                WorkshopName = string.IsNullOrWhiteSpace(dto.WorkshopName) ? null : dto.WorkshopName.Trim(),
                Priority = dto.Priority.Trim().ToLowerInvariant(),
                dto.EstimatedCost,
                dto.ActualCost,
                dto.StartDate,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                CreatedAt = DateTime.UtcNow
            },
            cancellationToken: cancellationToken));

        var created = await LoadWorkOrderAsync(connection, id, tenantId, cancellationToken);
        return ApiResponse<WorkOrderDto>.SuccessResponse(created!, "Work order created successfully.");
    }

    private static async Task EnsureVehicleExistsAsync(
        System.Data.IDbConnection connection,
        int vehicleId,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var vehicleExists = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            @"SELECT COUNT(1) FROM Vehicles
              WHERE Id = @VehicleId AND TenantId = @TenantId AND IsDeleted = 0",
            new { VehicleId = vehicleId, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (vehicleExists == 0)
            throw new NotFoundException("Vehicle", vehicleId);
    }

    private static async Task<WorkOrderDto?> LoadWorkOrderAsync(
        System.Data.IDbConnection connection,
        int id,
        int tenantId,
        CancellationToken cancellationToken)
        => await connection.QueryFirstOrDefaultAsync<WorkOrderDto>(new CommandDefinition(
            WorkOrderSql.SelectById,
            new { Id = id, TenantId = tenantId },
            cancellationToken: cancellationToken));
}

public class ApproveWorkOrderCommandHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<ApproveWorkOrderCommand, ApiResponse<WorkOrderDto>>
{
    public async Task<ApiResponse<WorkOrderDto>> Handle(
        ApproveWorkOrderCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        using var connection = dbFactory.CreateConnection();

        var currentStatus = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(
            @"SELECT Status FROM WorkOrders
              WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0",
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (currentStatus is null)
            throw new NotFoundException("WorkOrder", request.Id);

        var normalized = (currentStatus ?? "open").Trim().ToLowerInvariant();
        if (normalized is not ("open" or "approved"))
            throw new ConflictException($"Work order cannot be approved from status '{currentStatus ?? "unknown"}'.");

        if (normalized == "open")
        {
            await connection.ExecuteAsync(new CommandDefinition(
                @"UPDATE WorkOrders SET Status = N'approved'
                  WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0",
                new { request.Id, TenantId = tenantId },
                cancellationToken: cancellationToken));
        }

        var updated = await connection.QueryFirstOrDefaultAsync<WorkOrderDto>(new CommandDefinition(
            WorkOrderSql.SelectById,
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (updated is null)
            throw new NotFoundException("WorkOrder", request.Id);

        return ApiResponse<WorkOrderDto>.SuccessResponse(updated, "Work order approved successfully.");
    }
}

public class UpdateWorkOrderStatusCommandHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<UpdateWorkOrderStatusCommand, ApiResponse<WorkOrderDto>>
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "open", "approved", "in_progress", "completed", "cancelled"
    };

    public async Task<ApiResponse<WorkOrderDto>> Handle(
        UpdateWorkOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        var status = request.Body.Status.Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(status))
            throw new ConflictException($"Status '{request.Body.Status}' is not supported.");

        using var connection = dbFactory.CreateConnection();

        var exists = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            @"SELECT COUNT(1) FROM WorkOrders
              WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0",
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (exists == 0)
            throw new NotFoundException("WorkOrder", request.Id);

        await connection.ExecuteAsync(new CommandDefinition(
            @"UPDATE WorkOrders
              SET Status = @Status,
                  CompletedDate = CASE WHEN @Status = N'completed' THEN COALESCE(CompletedDate, @Now) ELSE CompletedDate END
              WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0",
            new { request.Id, TenantId = tenantId, Status = status, Now = DateTime.UtcNow },
            cancellationToken: cancellationToken));

        var updated = await connection.QueryFirstOrDefaultAsync<WorkOrderDto>(new CommandDefinition(
            WorkOrderSql.SelectById,
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (updated is null)
            throw new NotFoundException("WorkOrder", request.Id);

        return ApiResponse<WorkOrderDto>.SuccessResponse(updated, "Work order status updated.");
    }
}

internal static class WorkOrderSql
{
    internal const string SelectList = """
        SELECT
            w.Id,
            COALESCE(NULLIF(LTRIM(RTRIM(w.OrderNumber)), ''), CONCAT('WO-', RIGHT(CONCAT('00000', CAST(w.Id AS NVARCHAR(10))), 5))) AS OrderNumber,
            w.VehicleId,
            v.Name AS VehicleName,
            v.RegistrationNumber AS VehicleRegistration,
            COALESCE(NULLIF(LTRIM(RTRIM(w.ServiceType)), ''), N'General Service') AS ServiceType,
            w.WorkshopName,
            COALESCE(NULLIF(LTRIM(RTRIM(w.Status)), ''), N'open') AS Status,
            COALESCE(NULLIF(LTRIM(RTRIM(w.Priority)), ''), N'medium') AS Priority,
            COALESCE(w.EstimatedCost, 0) AS EstimatedCost,
            w.ActualCost,
            w.StartDate,
            w.CompletedDate,
            w.Description,
            COALESCE(w.CreatedAt, SYSUTCDATETIME()) AS CreatedAt
        FROM WorkOrders w
        LEFT JOIN Vehicles v ON v.Id = w.VehicleId AND v.TenantId = w.TenantId AND v.IsDeleted = 0
        WHERE w.IsDeleted = 0
          AND w.TenantId = @TenantId
        ORDER BY w.CreatedAt DESC
        """;

    internal const string SelectById = """
        SELECT
            w.Id,
            COALESCE(NULLIF(LTRIM(RTRIM(w.OrderNumber)), ''), CONCAT('WO-', RIGHT(CONCAT('00000', CAST(w.Id AS NVARCHAR(10))), 5))) AS OrderNumber,
            w.VehicleId,
            v.Name AS VehicleName,
            v.RegistrationNumber AS VehicleRegistration,
            COALESCE(NULLIF(LTRIM(RTRIM(w.ServiceType)), ''), N'General Service') AS ServiceType,
            w.WorkshopName,
            COALESCE(NULLIF(LTRIM(RTRIM(w.Status)), ''), N'open') AS Status,
            COALESCE(NULLIF(LTRIM(RTRIM(w.Priority)), ''), N'medium') AS Priority,
            COALESCE(w.EstimatedCost, 0) AS EstimatedCost,
            w.ActualCost,
            w.StartDate,
            w.CompletedDate,
            w.Description,
            COALESCE(w.CreatedAt, SYSUTCDATETIME()) AS CreatedAt
        FROM WorkOrders w
        LEFT JOIN Vehicles v ON v.Id = w.VehicleId AND v.TenantId = w.TenantId AND v.IsDeleted = 0
        WHERE w.Id = @Id
          AND w.TenantId = @TenantId
          AND w.IsDeleted = 0
        """;
}
