using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VacationManager.Api.Models.DTOs.LeaveRequests;
using VacationManager.Api.Services;

namespace VacationManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class LeaveRequestsController : ControllerBase
{
    private readonly LeaveRequestService _leaveRequestService;
    private readonly CurrentUserAccessor _currentUserAccessor;

    public LeaveRequestsController(LeaveRequestService leaveRequestService, CurrentUserAccessor currentUserAccessor)
    {
        _leaveRequestService = leaveRequestService;
        _currentUserAccessor = currentUserAccessor;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] LeaveRequestFilterQuery query, CancellationToken cancellationToken)
        => Ok(await _leaveRequestService.GetPagedAsync(
            query,
            _currentUserAccessor.UserId!,
            _currentUserAccessor.Role!,
            cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        try
        {
            var leaveRequest = await _leaveRequestService.GetByIdAsync(id, _currentUserAccessor.UserId!, _currentUserAccessor.Role!, cancellationToken);
            return leaveRequest is null ? NotFound() : Ok(leaveRequest);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateLeaveRequest request, IFormFile? sickNoteFile, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var created = await _leaveRequestService.CreateAsync(request, sickNoteFile, _currentUserAccessor.UserId!, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateLeaveRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var updated = await _leaveRequestService.UpdateAsync(id, request, _currentUserAccessor.UserId!, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        try
        {
            return await _leaveRequestService.DeleteAsync(id, _currentUserAccessor.UserId!, _currentUserAccessor.Role!, cancellationToken)
                ? NoContent()
                : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "CEO,TeamLead")]
    [HttpPost("{id}/review")]
    public async Task<IActionResult> Review(string id, [FromBody] ReviewLeaveRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var reviewed = await _leaveRequestService.ReviewAsync(id, request, _currentUserAccessor.UserId!, _currentUserAccessor.Role!, cancellationToken);
            return reviewed is null ? NotFound() : Ok(reviewed);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/sick-note")]
    public async Task<IActionResult> DownloadSickNote(string id, CancellationToken cancellationToken)
    {
        try
        {
            var file = await _leaveRequestService.DownloadSickNoteAsync(id, _currentUserAccessor.UserId!, _currentUserAccessor.Role!, cancellationToken);
            return file is null ? NotFound() : File(file.Value.Content, file.Value.ContentType, file.Value.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
