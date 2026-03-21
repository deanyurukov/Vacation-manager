using MongoDB.Bson;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.Users;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Services;

public sealed class UserService
{
    private readonly MongoDbContext _dbContext;
    private readonly PasswordHasher _passwordHasher;

    public UserService(MongoDbContext dbContext, PasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<PagedResponse<UserListItemDto>> GetPagedAsync(UserFilterQuery query, CancellationToken cancellationToken)
    {
        var filter = Builders<User>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var escaped = Escape(query.Search);
            var regex = new BsonRegularExpression(escaped, "i");
            filter &= Builders<User>.Filter.Or(
                Builders<User>.Filter.Regex(x => x.Username, regex),
                Builders<User>.Filter.Regex(x => x.FirstName, regex),
                Builders<User>.Filter.Regex(x => x.LastName, regex));
        }

        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            filter &= Builders<User>.Filter.Regex(x => x.RoleName, new BsonRegularExpression($"^{Escape(query.Role)}$", "i"));
        }

        var total = await _dbContext.Users.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var users = await _dbContext.Users
            .Find(filter)
            .SortBy(x => x.Username)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<UserListItemDto>
        {
            Items = users.Select(MapListItem).ToArray(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<UserDetailDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return null;
        }

        var teamName = string.Empty;
        if (!string.IsNullOrWhiteSpace(user.TeamId))
        {
            teamName = (await _dbContext.Teams.Find(x => x.Id == user.TeamId).FirstOrDefaultAsync(cancellationToken))?.Name ?? string.Empty;
        }

        return new UserDetailDto
        {
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            RoleName = user.RoleName,
            RoleId = user.RoleId,
            TeamId = user.TeamId,
            TeamName = teamName,
            LeadsTeamId = user.LeadsTeamId
        };
    }

    public async Task<UserDetailDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        await EnsureUniqueUsernameAsync(request.Username, null, cancellationToken);

        var role = await ResolveRoleAsync(request.RoleId, cancellationToken);
        var user = new User
        {
            Username = request.Username.Trim(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            RoleId = role?.Id,
            RoleName = role?.Name ?? "Unassigned",
            TeamId = request.TeamId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        await _dbContext.Users.InsertOneAsync(user, cancellationToken: cancellationToken);
        await SyncTeamMembershipAsync(user.Id, null, request.TeamId, cancellationToken);

        return (await GetByIdAsync(user.Id, cancellationToken))!;
    }

    public async Task<UserDetailDto?> UpdateAsync(string id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return null;
        }

        var oldTeamId = user.TeamId;
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.TeamId = request.TeamId;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var role = await ResolveRoleAsync(request.RoleId, cancellationToken);
        user.RoleId = role?.Id;
        user.RoleName = role?.Name ?? "Unassigned";

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = _passwordHasher.Hash(request.Password.Trim());
        }

        await _dbContext.Users.ReplaceOneAsync(x => x.Id == id, user, cancellationToken: cancellationToken);
        await SyncTeamMembershipAsync(user.Id, oldTeamId, request.TeamId, cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(user.TeamId))
        {
            var pullUser = Builders<Team>.Update.Pull(x => x.MemberIds, user.Id);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == user.TeamId, pullUser, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(user.LeadsTeamId))
        {
            var unsetLead = Builders<Team>.Update.Set(x => x.TeamLeadId, null as string);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == user.LeadsTeamId, unsetLead, cancellationToken: cancellationToken);
        }

        var result = await _dbContext.Users.DeleteOneAsync(x => x.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    private async Task EnsureUniqueUsernameAsync(string username, string? currentUserId, CancellationToken cancellationToken)
    {
        var filter = Builders<User>.Filter.Regex(x => x.Username, new BsonRegularExpression($"^{Escape(username)}$", "i"));
        if (!string.IsNullOrWhiteSpace(currentUserId))
        {
            filter &= Builders<User>.Filter.Ne(x => x.Id, currentUserId);
        }

        var exists = await _dbContext.Users.Find(filter).AnyAsync(cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("A user with the same username already exists.");
        }
    }

    private async Task<Role?> ResolveRoleAsync(string? roleId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(roleId))
        {
            return await _dbContext.Roles.Find(x => x.NormalizedName == "UNASSIGNED").FirstOrDefaultAsync(cancellationToken);
        }

        return await _dbContext.Roles.Find(x => x.Id == roleId).FirstOrDefaultAsync(cancellationToken)
               ?? throw new InvalidOperationException("Role not found.");
    }

    private async Task SyncTeamMembershipAsync(string userId, string? oldTeamId, string? newTeamId, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(oldTeamId) && oldTeamId != newTeamId)
        {
            var pull = Builders<Team>.Update.Pull(x => x.MemberIds, userId);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == oldTeamId, pull, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(newTeamId))
        {
            var team = await _dbContext.Teams.Find(x => x.Id == newTeamId).FirstOrDefaultAsync(cancellationToken)
                       ?? throw new InvalidOperationException("Team not found.");

            if (!team.MemberIds.Contains(userId))
            {
                var push = Builders<Team>.Update.AddToSet(x => x.MemberIds, userId);
                await _dbContext.Teams.UpdateOneAsync(x => x.Id == newTeamId, push, cancellationToken: cancellationToken);
            }
        }
    }

    private static string Escape(string value) => System.Text.RegularExpressions.Regex.Escape(value.Trim());

    private static UserListItemDto MapListItem(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        FirstName = user.FirstName,
        LastName = user.LastName,
        RoleName = user.RoleName,
        TeamId = user.TeamId
    };
}
