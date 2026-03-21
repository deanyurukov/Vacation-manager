using MongoDB.Bson;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.Auth;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Services;

public sealed class AuthService
{
    private readonly MongoDbContext _dbContext;
    private readonly PasswordHasher _passwordHasher;
    private readonly JwtTokenService _jwtTokenService;

    public AuthService(MongoDbContext dbContext, PasswordHasher passwordHasher, JwtTokenService jwtTokenService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var filter = Builders<User>.Filter.Regex(x => x.Username, new BsonRegularExpression($"^{RegexEscape(request.Username)}$", "i"));
        var user = await _dbContext.Users.Find(filter).FirstOrDefaultAsync(cancellationToken);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        return _jwtTokenService.Create(user);
    }

    private static string RegexEscape(string value) => System.Text.RegularExpressions.Regex.Escape(value.Trim());
}
