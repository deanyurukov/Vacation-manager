namespace VacationManager.Api.Models.DTOs.Auth;

public sealed class LoginResponse
{
    public string AccessToken { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
    public UserSummaryDto User { get; init; } = new();
}

public sealed class UserSummaryDto
{
    public string Id { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public string? TeamId { get; init; }
}
