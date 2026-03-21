using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VacationManager.Api.Models.DTOs.Projects;
using VacationManager.Api.Services;

namespace VacationManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ProjectsController : ControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectsController(ProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProjectFilterQuery query, CancellationToken cancellationToken)
        => Ok(await _projectService.GetPagedAsync(query, cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var project = await _projectService.GetByIdAsync(id, cancellationToken);
        return project is null ? NotFound() : Ok(project);
    }

    [Authorize(Roles = "CEO")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var created = await _projectService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [Authorize(Roles = "CEO")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var updated = await _projectService.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [Authorize(Roles = "CEO")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        => await _projectService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

    [Authorize(Roles = "CEO")]
    [HttpPost("{id}/teams")]
    public async Task<IActionResult> AddTeam(string id, [FromBody] ProjectTeamUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await _projectService.AddTeamAsync(id, request.TeamId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "CEO")]
    [HttpDelete("{id}/teams/{teamId}")]
    public async Task<IActionResult> RemoveTeam(string id, string teamId, CancellationToken cancellationToken)
    {
        var result = await _projectService.RemoveTeamAsync(id, teamId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
