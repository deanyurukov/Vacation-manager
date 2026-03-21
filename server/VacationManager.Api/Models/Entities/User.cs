using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.Entities;

public sealed class User : BaseEntity
{
    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public string? RoleId { get; set; }
    public string RoleName { get; set; } = "Unassigned";
    public string? TeamId { get; set; }
    public string? LeadsTeamId { get; set; }
}
