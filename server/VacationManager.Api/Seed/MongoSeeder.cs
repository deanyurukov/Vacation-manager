using Microsoft.Extensions.Options;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.Entities;
using VacationManager.Api.Services;

namespace VacationManager.Api.Seed;

public static class MongoSeeder
{
    public static async Task SeedAsync(this IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();

        await EnsureRolesAsync(dbContext);
        await EnsureDefaultCeoAsync(dbContext, configuration, passwordHasher);
    }

    private static async Task EnsureRolesAsync(MongoDbContext dbContext)
    {
        var roles = new[] { "CEO", "TeamLead", "Developer", "Unassigned" };

        foreach (var roleName in roles)
        {
            var normalized = roleName.ToUpperInvariant();
            var exists = await dbContext.Roles.Find(x => x.NormalizedName == normalized).AnyAsync();
            if (exists)
            {
                continue;
            }

            await dbContext.Roles.InsertOneAsync(new Role
            {
                Name = roleName,
                NormalizedName = normalized,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
    }

    private static async Task EnsureDefaultCeoAsync(MongoDbContext dbContext, IConfiguration configuration, PasswordHasher passwordHasher)
    {
        var username = configuration["Seed:DefaultCeoUsername"] ?? "ceo";
        var password = configuration["Seed:DefaultCeoPassword"] ?? "ChangeMe123!";

        var exists = await dbContext.Users.Find(x => x.Username == username).AnyAsync();
        if (exists)
        {
            return;
        }

        var ceoRole = await dbContext.Roles.Find(x => x.NormalizedName == "CEO").FirstAsync();
        await dbContext.Users.InsertOneAsync(new User
        {
            Username = username,
            PasswordHash = passwordHasher.Hash(password),
            FirstName = "System",
            LastName = "CEO",
            RoleId = ceoRole.Id,
            RoleName = ceoRole.Name,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
    }
}
