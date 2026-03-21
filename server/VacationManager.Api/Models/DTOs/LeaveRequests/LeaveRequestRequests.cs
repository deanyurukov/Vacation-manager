using System.ComponentModel.DataAnnotations;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.Enums;

namespace VacationManager.Api.Models.DTOs.LeaveRequests;

public sealed class CreateLeaveRequest
{
    [Required]
    public LeaveType Type { get; set; }

    [Required]
    public DateOnly FromDate { get; set; }

    [Required]
    public DateOnly ToDate { get; set; }

    public bool IsHalfDay { get; set; }
}

public sealed class UpdateLeaveRequest
{
    [Required]
    public DateOnly FromDate { get; set; }

    [Required]
    public DateOnly ToDate { get; set; }

    public bool IsHalfDay { get; set; }
}

public sealed class LeaveRequestFilterQuery : PagedQuery
{
    public DateTime? CreatedAfterUtc { get; set; }
    public bool MineOnly { get; set; } = true;
}

public sealed class ReviewLeaveRequest
{
    public bool Approve { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }
}

public sealed class LeaveRequestDto
{
    public string Id { get; init; } = string.Empty;
    public LeaveType Type { get; init; }
    public DateOnly FromDate { get; init; }
    public DateOnly ToDate { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public bool IsHalfDay { get; init; }
    public LeaveStatus Status { get; init; }
    public string ApplicantId { get; init; } = string.Empty;
    public string ApplicantFullName { get; init; } = string.Empty;
    public string? TeamId { get; init; }
    public bool HasSickNote { get; init; }
    public string? ApprovedById { get; init; }
    public DateTime? ApprovedAtUtc { get; init; }
    public string? RejectionReason { get; init; }
}
