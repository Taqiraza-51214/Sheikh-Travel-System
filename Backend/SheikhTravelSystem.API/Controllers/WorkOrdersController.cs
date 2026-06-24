using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SheikhTravelSystem.Application.Features.Fleet.Maintenance;

namespace SheikhTravelSystem.API.Controllers;

[Authorize]
[Route("api/workorders")]
/// <summary>
/// Fleet maintenance work orders.
/// </summary>
public class WorkOrdersController : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await Mediator.Send(new GetWorkOrdersQuery()));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await Mediator.Send(new GetWorkOrderByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto workOrder)
    {
        var result = await Mediator.Send(new CreateWorkOrderCommand(workOrder));
        return Created(string.Empty, result);
    }

    [HttpPut("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
        => Ok(await Mediator.Send(new ApproveWorkOrderCommand(id)));

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateWorkOrderStatusDto body)
        => Ok(await Mediator.Send(new UpdateWorkOrderStatusCommand(id, body)));
}
