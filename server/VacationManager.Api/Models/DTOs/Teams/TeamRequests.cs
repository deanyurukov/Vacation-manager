using System.ComponentModel.DataAnnotations;
using VacationManager.Api.Infrastructure;

namespace VacationManager.Api.Models.DTOs.Teams;

public class CreateTeamRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? ProjectId { get; set; }
    public string? TeamLeadId { get; set; }
}

public sealed class UpdateTeamRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? ProjectId { get; set; }
    public string? TeamLeadId { get; set; }
}

public sealed class TeamMemberUpdateRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
}

public sealed class TeamFilterQuery : PagedQuery
{
    [MaxLength(100)]
    public string? Search { get; set; }

    [MaxLength(150)]
    public string? ProjectName { get; set; }
}

public class TeamListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? ProjectId { get; init; }
    public string? ProjectName { get; init; }
    public string? TeamLeadId { get; init; }
    public int MembersCount { get; init; }
}

public sealed class TeamDetailDto : TeamListItemDto
{
    public IReadOnlyCollection<object> Members { get; init; } = Array.Empty<object>();
    public object? TeamLead { get; init; }
}
