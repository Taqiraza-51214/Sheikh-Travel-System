using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SheikhTravelSystem.Application.Features.Fleet.Maintenance;

namespace SheikhTravelSystem.API.Controllers;

[Authorize]
[Route("api/fleet/maintenance")]
/// <summary>
/// Fleet maintenance hub endpoints (service schedules, requests).
/// </summary>
public class FleetMaintenanceController : BaseApiController
{
    [HttpGet("schedules")]
    public async Task<IActionResult> GetSchedules()
        => Ok(await Mediator.Send(new GetMaintenanceSchedulesQuery()));

    [HttpPost("schedules")]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateMaintenanceScheduleDto schedule)
    {
        var result = await Mediator.Send(new CreateMaintenanceScheduleCommand(schedule));
        return Created(string.Empty, result);
    }

    [HttpPut("schedules/{id:int}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateMaintenanceScheduleDto schedule)
    {
        var result = await Mediator.Send(new UpdateMaintenanceScheduleCommand(id, schedule));
        return Ok(result);
    }
}
