using System.ComponentModel.DataAnnotations;
using VacationManager.Api.Infrastructure;

namespace VacationManager.Api.Models.DTOs.Projects;

public sealed class CreateProjectRequest
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
}

public sealed class UpdateProjectRequest
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
}

public sealed class ProjectTeamUpdateRequest
{
    [Required]
    public string TeamId { get; set; } = string.Empty;
}

public sealed class ProjectFilterQuery : PagedQuery
{
    [MaxLength(150)]
    public string? Search { get; set; }
}

public class ProjectListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int TeamsCount { get; init; }
}

public sealed class ProjectDetailDto : ProjectListItemDto
{
    public IReadOnlyCollection<object> Teams { get; init; } = Array.Empty<object>();
}
