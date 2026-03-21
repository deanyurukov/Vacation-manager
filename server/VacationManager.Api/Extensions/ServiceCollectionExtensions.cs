using VacationManager.Api.Infrastructure;
using VacationManager.Api.Services;

namespace VacationManager.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<MongoDbContext>();
        services.AddScoped<PasswordHasher>();
        services.AddScoped<JwtTokenService>();
        services.AddScoped<AuthService>();
        services.AddScoped<CurrentUserAccessor>();
        services.AddScoped<FileStorageService>();
        services.AddScoped<UserService>();
        services.AddScoped<RoleService>();
        services.AddScoped<TeamService>();
        services.AddScoped<ProjectService>();
        services.AddScoped<LeaveRequestService>();

        return services;
    }
}
