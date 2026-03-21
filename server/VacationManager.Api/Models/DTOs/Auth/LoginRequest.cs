using System.ComponentModel.DataAnnotations;

namespace VacationManager.Api.Models.DTOs.Auth;

public sealed class LoginRequest
{
    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Password { get; set; } = string.Empty;
}
