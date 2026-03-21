using VacationManager.Api.Models.Enums;

namespace VacationManager.Api.Models.Entities;

public sealed class LeaveRequest : BaseEntity
{
    public LeaveType Type { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public bool IsHalfDay { get; set; }
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
    public string ApplicantId { get; set; } = string.Empty;
    public string ApplicantFullName { get; set; } = string.Empty;
    public string? TeamId { get; set; }
    public string? ApprovedById { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public string? SickNoteOriginalFileName { get; set; }
    public string? SickNoteStoredFileName { get; set; }
    public string? SickNoteContentType { get; set; }
}
