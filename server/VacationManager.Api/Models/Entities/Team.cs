using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.Entities;

public sealed class Team : BaseEntity
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string? TeamLeadId { get; set; }
    public List<string> MemberIds { get; set; } = new();
}
