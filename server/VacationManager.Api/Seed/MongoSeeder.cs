using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.LeaveRequests;
using VacationManager.Api.Models.DTOs.Projects;
using VacationManager.Api.Models.DTOs.Teams;
using VacationManager.Api.Models.DTOs.Users;
using VacationManager.Api.Models.Entities;
using VacationManager.Api.Models.Enums;
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

        if (configuration.GetValue("Seed:EnableDemoData", false))
        {
            await EnsureDemoDataAsync(serviceProvider);
        }
    }

    /// <summary>
    /// Idempotent demo users, projects, teams, and an extra role. Safe to run multiple times.
    /// </summary>
    public static async Task EnsureDemoDataAsync(
        IServiceProvider serviceProvider,
        CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

        if (await db.Users.Find(x => x.Username == "demo_lead").AnyAsync(cancellationToken))
        {
            return;
        }

        await EnsureDemoRoleAsync(db, cancellationToken);

        var userService = scope.ServiceProvider.GetRequiredService<UserService>();
        var projectService = scope.ServiceProvider.GetRequiredService<ProjectService>();
        var teamService = scope.ServiceProvider.GetRequiredService<TeamService>();

        const string demoPassword = "Demo123!";

        var teamLeadRole = await db.Roles.Find(x => x.NormalizedName == "TEAMLEAD").FirstAsync(cancellationToken);
        var devRole = await db.Roles.Find(x => x.NormalizedName == "DEVELOPER").FirstAsync(cancellationToken);
        var unassignedRole = await db.Roles.Find(x => x.NormalizedName == "UNASSIGNED").FirstAsync(cancellationToken);

        var lead = await userService.CreateAsync(new CreateUserRequest
        {
            Username = "demo_lead",
            Password = demoPassword,
            FirstName = "Alex",
            LastName = "Rivera",
            RoleId = teamLeadRole.Id,
            TeamId = null
        }, cancellationToken);

        var dev1 = await userService.CreateAsync(new CreateUserRequest
        {
            Username = "demo_dev1",
            Password = demoPassword,
            FirstName = "Sam",
            LastName = "Chen",
            RoleId = devRole.Id,
            TeamId = null
        }, cancellationToken);

        var dev2 = await userService.CreateAsync(new CreateUserRequest
        {
            Username = "demo_dev2",
            Password = demoPassword,
            FirstName = "Jordan",
            LastName = "Taylor",
            RoleId = devRole.Id,
            TeamId = null
        }, cancellationToken);

        await userService.CreateAsync(new CreateUserRequest
        {
            Username = "demo_unassigned",
            Password = demoPassword,
            FirstName = "Riley",
            LastName = "Morgan",
            RoleId = unassignedRole.Id,
            TeamId = null
        }, cancellationToken);

        var project1 = await projectService.CreateAsync(new CreateProjectRequest
        {
            Name = "Demo — Mobile App",
            Description = "Sample project for Vacation Manager demos."
        }, cancellationToken);

        await projectService.CreateAsync(new CreateProjectRequest
        {
            Name = "Demo — Billing API",
            Description = "Second sample project with no teams assigned yet."
        }, cancellationToken);

        var team = await teamService.CreateAsync(new CreateTeamRequest
        {
            Name = "Squad Alpha",
            ProjectId = project1.Id,
            TeamLeadId = lead.Id
        }, cancellationToken);

        await teamService.AddMemberAsync(team.Id, dev1.Id, cancellationToken);
        await teamService.AddMemberAsync(team.Id, dev2.Id, cancellationToken);

        // Create additional demo teams
        var team2 = await teamService.CreateAsync(new CreateTeamRequest
        {
            Name = "Squad Beta",
            ProjectId = project1.Id,
            TeamLeadId = dev1.Id
        }, cancellationToken);

        // Create demo leave requests directly in the database
        var today = DateOnly.FromDateTime(DateTime.Now);

        await db.LeaveRequests.InsertOneAsync(new LeaveRequest
        {
            Type = LeaveType.Paid,
            FromDate = today.AddDays(10).ToDateTime(TimeOnly.MinValue),
            ToDate = today.AddDays(14).ToDateTime(TimeOnly.MinValue),
            IsHalfDay = false,
            ApplicantId = lead.Id,
            ApplicantFullName = $"{lead.FirstName} {lead.LastName}",
            TeamId = lead.TeamId,
            Status = LeaveStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        }, cancellationToken: cancellationToken);

        await db.LeaveRequests.InsertOneAsync(new LeaveRequest
        {
            Type = LeaveType.Paid,
            FromDate = today.AddDays(5).ToDateTime(TimeOnly.MinValue),
            ToDate = today.AddDays(6).ToDateTime(TimeOnly.MinValue),
            IsHalfDay = true,
            ApplicantId = dev1.Id,
            ApplicantFullName = $"{dev1.FirstName} {dev1.LastName}",
            TeamId = dev1.TeamId,
            Status = LeaveStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        }, cancellationToken: cancellationToken);
    }

    private static async Task EnsureDemoRoleAsync(MongoDbContext dbContext, CancellationToken cancellationToken)
    {
        const string name = "QA";
        var normalized = name.ToUpperInvariant();
        var exists = await dbContext.Roles.Find(x => x.NormalizedName == normalized).AnyAsync(cancellationToken);
        if (exists)
        {
            return;
        }

        await dbContext.Roles.InsertOneAsync(new Role
        {
            Name = name,
            NormalizedName = normalized,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        }, cancellationToken: cancellationToken);
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
