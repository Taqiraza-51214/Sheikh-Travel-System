using Dapper;
using FluentValidation;
using MediatR;
using SheikhTravelSystem.Application.Common;
using SheikhTravelSystem.Application.Common.Exceptions;
using SheikhTravelSystem.Application.Common.Interfaces;

namespace SheikhTravelSystem.Application.Features.Fleet.Maintenance;

public record MaintenanceScheduleDto(
    int Id,
    int VehicleId,
    string? VehicleName,
    string? VehicleRegistration,
    decimal? CurrentMileage,
    string ServiceType,
    string IntervalType,
    decimal IntervalValue,
    decimal? LastServiceMileage,
    decimal? NextServiceMileage,
    string Priority,
    bool IsActive,
    DateTime CreatedAt);

public record CreateMaintenanceScheduleDto(
    int VehicleId,
    string ServiceType,
    string IntervalType,
    decimal IntervalValue,
    decimal? LastServiceMileage,
    string Priority);

public record GetMaintenanceSchedulesQuery : IRequest<ApiResponse<IReadOnlyList<MaintenanceScheduleDto>>>;

public record CreateMaintenanceScheduleCommand(CreateMaintenanceScheduleDto Schedule)
    : IRequest<ApiResponse<MaintenanceScheduleDto>>;

public record UpdateMaintenanceScheduleDto(
    string ServiceType,
    string IntervalType,
    decimal IntervalValue,
    decimal? LastServiceMileage,
    string Priority);

public record UpdateMaintenanceScheduleCommand(int Id, UpdateMaintenanceScheduleDto Schedule)
    : IRequest<ApiResponse<MaintenanceScheduleDto>>;

public class CreateMaintenanceScheduleCommandValidator : AbstractValidator<CreateMaintenanceScheduleCommand>
{
    public CreateMaintenanceScheduleCommandValidator()
    {
        RuleFor(x => x.Schedule.VehicleId).GreaterThan(0);
        RuleFor(x => x.Schedule.ServiceType).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Schedule.IntervalType).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Schedule.IntervalValue).GreaterThan(0);
        RuleFor(x => x.Schedule.Priority).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Schedule.LastServiceMileage).GreaterThanOrEqualTo(0).When(x => x.Schedule.LastServiceMileage.HasValue);
    }
}

public class UpdateMaintenanceScheduleCommandValidator : AbstractValidator<UpdateMaintenanceScheduleCommand>
{
    public UpdateMaintenanceScheduleCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Schedule.ServiceType).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Schedule.IntervalType).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Schedule.IntervalValue).GreaterThan(0);
        RuleFor(x => x.Schedule.Priority).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Schedule.LastServiceMileage).GreaterThanOrEqualTo(0).When(x => x.Schedule.LastServiceMileage.HasValue);
    }
}

public class GetMaintenanceSchedulesQueryHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<GetMaintenanceSchedulesQuery, ApiResponse<IReadOnlyList<MaintenanceScheduleDto>>>
{
    public async Task<ApiResponse<IReadOnlyList<MaintenanceScheduleDto>>> Handle(
        GetMaintenanceSchedulesQuery request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        using var connection = dbFactory.CreateConnection();

        var rows = await connection.QueryAsync<MaintenanceScheduleDto>(new CommandDefinition("""
            SELECT
                s.Id,
                s.VehicleId,
                v.Name AS VehicleName,
                v.RegistrationNumber AS VehicleRegistration,
                v.CurrentMileage AS CurrentMileage,
                s.ServiceType,
                s.IntervalType,
                s.IntervalValue,
                s.LastServiceMileage,
                CASE
                    WHEN s.IntervalType = N'mileage' AND s.LastServiceMileage IS NOT NULL
                        THEN s.LastServiceMileage + s.IntervalValue
                    WHEN s.IntervalType = N'mileage'
                        THEN v.CurrentMileage + s.IntervalValue
                    ELSE NULL
                END AS NextServiceMileage,
                s.Priority,
                s.IsActive,
                s.CreatedAt
            FROM MaintenanceSchedules s
            INNER JOIN Vehicles v ON v.Id = s.VehicleId
            WHERE s.IsDeleted = 0
              AND s.TenantId = @TenantId
              AND v.TenantId = @TenantId
              AND v.IsDeleted = 0
            ORDER BY s.CreatedAt DESC
            """, new { TenantId = tenantId }, cancellationToken: cancellationToken));

        return ApiResponse<IReadOnlyList<MaintenanceScheduleDto>>.SuccessResponse(rows.ToList());
    }
}

public class CreateMaintenanceScheduleCommandHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<CreateMaintenanceScheduleCommand, ApiResponse<MaintenanceScheduleDto>>
{
    public async Task<ApiResponse<MaintenanceScheduleDto>> Handle(
        CreateMaintenanceScheduleCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        var dto = request.Schedule;
        using var connection = dbFactory.CreateConnection();

        var vehicleExists = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            @"SELECT COUNT(1) FROM Vehicles
              WHERE Id = @VehicleId AND TenantId = @TenantId AND IsDeleted = 0",
            new { dto.VehicleId, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (vehicleExists == 0)
            throw new NotFoundException("Vehicle", dto.VehicleId);

        var id = await connection.ExecuteScalarAsync<int>(new CommandDefinition("""
            INSERT INTO MaintenanceSchedules
                (TenantId, VehicleId, ServiceType, IntervalType, IntervalValue, LastServiceMileage, Priority, IsActive, CreatedAt, IsDeleted)
            VALUES
                (@TenantId, @VehicleId, @ServiceType, @IntervalType, @IntervalValue, @LastServiceMileage, @Priority, 1, @CreatedAt, 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """,
            new
            {
                TenantId = tenantId,
                dto.VehicleId,
                ServiceType = dto.ServiceType.Trim(),
                IntervalType = dto.IntervalType.Trim().ToLowerInvariant(),
                dto.IntervalValue,
                dto.LastServiceMileage,
                Priority = dto.Priority.Trim().ToLowerInvariant(),
                CreatedAt = DateTime.UtcNow
            },
            cancellationToken: cancellationToken));

        var created = await connection.QuerySingleAsync<MaintenanceScheduleDto>(new CommandDefinition("""
            SELECT
                s.Id,
                s.VehicleId,
                v.Name AS VehicleName,
                v.RegistrationNumber AS VehicleRegistration,
                v.CurrentMileage AS CurrentMileage,
                s.ServiceType,
                s.IntervalType,
                s.IntervalValue,
                s.LastServiceMileage,
                CASE
                    WHEN s.IntervalType = N'mileage' AND s.LastServiceMileage IS NOT NULL
                        THEN s.LastServiceMileage + s.IntervalValue
                    WHEN s.IntervalType = N'mileage'
                        THEN v.CurrentMileage + s.IntervalValue
                    ELSE NULL
                END AS NextServiceMileage,
                s.Priority,
                s.IsActive,
                s.CreatedAt
            FROM MaintenanceSchedules s
            INNER JOIN Vehicles v ON v.Id = s.VehicleId
            WHERE s.Id = @Id AND s.TenantId = @TenantId AND s.IsDeleted = 0
            """, new { Id = id, TenantId = tenantId }, cancellationToken: cancellationToken));

        return ApiResponse<MaintenanceScheduleDto>.SuccessResponse(created, "Service schedule created successfully.");
    }
}

public class UpdateMaintenanceScheduleCommandHandler(IDbConnectionFactory dbFactory, ITenantContext tenantContext)
    : IRequestHandler<UpdateMaintenanceScheduleCommand, ApiResponse<MaintenanceScheduleDto>>
{
    public async Task<ApiResponse<MaintenanceScheduleDto>> Handle(
        UpdateMaintenanceScheduleCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.GetRequiredTenantId();
        var dto = request.Schedule;
        using var connection = dbFactory.CreateConnection();

        var scheduleExists = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            @"SELECT COUNT(1) FROM MaintenanceSchedules
              WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0",
            new { request.Id, TenantId = tenantId },
            cancellationToken: cancellationToken));

        if (scheduleExists == 0)
            throw new NotFoundException("MaintenanceSchedule", request.Id);

        await connection.ExecuteAsync(new CommandDefinition("""
            UPDATE MaintenanceSchedules
            SET ServiceType = @ServiceType,
                IntervalType = @IntervalType,
                IntervalValue = @IntervalValue,
                LastServiceMileage = @LastServiceMileage,
                Priority = @Priority
            WHERE Id = @Id AND TenantId = @TenantId AND IsDeleted = 0
            """,
            new
            {
                request.Id,
                TenantId = tenantId,
                ServiceType = dto.ServiceType.Trim(),
                IntervalType = dto.IntervalType.Trim().ToLowerInvariant(),
                dto.IntervalValue,
                dto.LastServiceMileage,
                Priority = dto.Priority.Trim().ToLowerInvariant()
            },
            cancellationToken: cancellationToken));

        var updated = await connection.QuerySingleAsync<MaintenanceScheduleDto>(new CommandDefinition("""
            SELECT
                s.Id,
                s.VehicleId,
                v.Name AS VehicleName,
                v.RegistrationNumber AS VehicleRegistration,
                v.CurrentMileage AS CurrentMileage,
                s.ServiceType,
                s.IntervalType,
                s.IntervalValue,
                s.LastServiceMileage,
                CASE
                    WHEN s.IntervalType = N'mileage' AND s.LastServiceMileage IS NOT NULL
                        THEN s.LastServiceMileage + s.IntervalValue
                    WHEN s.IntervalType = N'mileage'
                        THEN v.CurrentMileage + s.IntervalValue
                    ELSE NULL
                END AS NextServiceMileage,
                s.Priority,
                s.IsActive,
                s.CreatedAt
            FROM MaintenanceSchedules s
            INNER JOIN Vehicles v ON v.Id = s.VehicleId
            WHERE s.Id = @Id AND s.TenantId = @TenantId AND s.IsDeleted = 0
            """, new { request.Id, TenantId = tenantId }, cancellationToken: cancellationToken));

        return ApiResponse<MaintenanceScheduleDto>.SuccessResponse(updated, "Service schedule updated successfully.");
    }
}
