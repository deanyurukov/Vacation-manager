using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.DTOs.Users;

public class CreateUserRequest
{
    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(200), MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public string? RoleId { get; set; }
    public string? TeamId { get; set; }
}

public sealed class UpdateUserRequest
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public string? RoleId { get; set; }
    public string? TeamId { get; set; }
    public string? Password { get; set; }
}

public sealed class UserFilterQuery : VacationManager.Api.Infrastructure.PagedQuery
{
    [MaxLength(100)]
    public string? Search { get; set; }

    [MaxLength(50)]
    public string? Role { get; set; }
}

public class UserListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public string? TeamId { get; init; }
}

public sealed class UserDetailDto : UserListItemDto
{
    public string? RoleId { get; init; }
    public string? LeadsTeamId { get; init; }
    public string? TeamName { get; init; }
}
