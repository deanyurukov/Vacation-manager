using System.ComponentModel.DataAnnotations;
using VacationManager.Api.Infrastructure;

namespace VacationManager.Api.Models.DTOs.Roles;

public sealed class CreateRoleRequest
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;
}

public sealed class UpdateRoleRequest
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;
}

public sealed class RoleFilterQuery : PagedQuery
{
    [MaxLength(50)]
    public string? Search { get; set; }
}

public sealed class RoleListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public long UsersCount { get; init; }
}
