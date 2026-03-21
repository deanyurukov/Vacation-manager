using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VacationManager.Api.Models.DTOs.Teams;
using VacationManager.Api.Services;

namespace VacationManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class TeamsController : ControllerBase
{
    private readonly TeamService _teamService;

    public TeamsController(TeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TeamFilterQuery query, CancellationToken cancellationToken)
        => Ok(await _teamService.GetPagedAsync(query, cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var team = await _teamService.GetByIdAsync(id, cancellationToken);
        return team is null ? NotFound() : Ok(team);
    }

    [Authorize(Roles = "CEO")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var created = await _teamService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "CEO")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateTeamRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var updated = await _teamService.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "CEO")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        => await _teamService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

    [Authorize(Roles = "CEO")]
    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(string id, [FromBody] TeamMemberUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await _teamService.AddMemberAsync(id, request.UserId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "CEO")]
    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(string id, string userId, CancellationToken cancellationToken)
    {
        var result = await _teamService.RemoveMemberAsync(id, userId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
