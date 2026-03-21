using MongoDB.Bson;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.Teams;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Services;

public sealed class TeamService
{
    private readonly MongoDbContext _dbContext;

    public TeamService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResponse<TeamListItemDto>> GetPagedAsync(TeamFilterQuery query, CancellationToken cancellationToken)
    {
        var filter = Builders<Team>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            filter &= Builders<Team>.Filter.Regex(x => x.Name, new BsonRegularExpression(Escape(query.Search), "i"));
        }

        if (!string.IsNullOrWhiteSpace(query.ProjectName))
        {
            filter &= Builders<Team>.Filter.Regex(x => x.ProjectName, new BsonRegularExpression(Escape(query.ProjectName), "i"));
        }

        var total = await _dbContext.Teams.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var teams = await _dbContext.Teams.Find(filter)
            .SortBy(x => x.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<TeamListItemDto>
        {
            Items = teams.Select(MapListItem).ToArray(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<TeamDetailDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (team is null)
        {
            return null;
        }

        var membersFilter = team.MemberIds.Count == 0 ? Builders<User>.Filter.Where(_ => false) : Builders<User>.Filter.In(x => x.Id, team.MemberIds);
        var members = await _dbContext.Users.Find(membersFilter).ToListAsync(cancellationToken);
        var lead = !string.IsNullOrWhiteSpace(team.TeamLeadId)
            ? await _dbContext.Users.Find(x => x.Id == team.TeamLeadId).FirstOrDefaultAsync(cancellationToken)
            : null;

        return new TeamDetailDto
        {
            Id = team.Id,
            Name = team.Name,
            ProjectId = team.ProjectId,
            ProjectName = team.ProjectName,
            TeamLeadId = team.TeamLeadId,
            MembersCount = team.MemberIds.Count,
            TeamLead = lead is null ? null : new { lead.Id, lead.Username, lead.FirstName, lead.LastName, lead.RoleName },
            Members = members.Select(x => (object)new { x.Id, x.Username, x.FirstName, x.LastName, x.RoleName }).ToArray()
        };
    }

    public async Task<Team> CreateAsync(CreateTeamRequest request, CancellationToken cancellationToken)
    {
        var team = new Team
        {
            Name = request.Name.Trim(),
            TeamLeadId = request.TeamLeadId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        if (!string.IsNullOrWhiteSpace(request.ProjectId))
        {
            var project = await _dbContext.Projects.Find(x => x.Id == request.ProjectId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Project not found.");
            team.ProjectId = project.Id;
            team.ProjectName = project.Name;
        }

        await _dbContext.Teams.InsertOneAsync(team, cancellationToken: cancellationToken);

        if (!string.IsNullOrWhiteSpace(team.ProjectId))
        {
            var addToProject = Builders<Project>.Update.AddToSet(x => x.TeamIds, team.Id);
            await _dbContext.Projects.UpdateOneAsync(x => x.Id == team.ProjectId, addToProject, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(team.TeamLeadId))
        {
            await AssignTeamLeadAsync(team.Id, team.TeamLeadId, cancellationToken);
        }

        return team;
    }

    public async Task<Team?> UpdateAsync(string id, UpdateTeamRequest request, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (team is null)
        {
            return null;
        }

        var oldProjectId = team.ProjectId;
        var oldTeamLeadId = team.TeamLeadId;

        team.Name = request.Name.Trim();
        team.ProjectId = null;
        team.ProjectName = null;
        team.TeamLeadId = request.TeamLeadId;
        team.UpdatedAtUtc = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.ProjectId))
        {
            var project = await _dbContext.Projects.Find(x => x.Id == request.ProjectId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Project not found.");
            team.ProjectId = project.Id;
            team.ProjectName = project.Name;
        }

        await _dbContext.Teams.ReplaceOneAsync(x => x.Id == id, team, cancellationToken: cancellationToken);

        if (oldProjectId != team.ProjectId)
        {
            if (!string.IsNullOrWhiteSpace(oldProjectId))
            {
                var pull = Builders<Project>.Update.Pull(x => x.TeamIds, team.Id);
                await _dbContext.Projects.UpdateOneAsync(x => x.Id == oldProjectId, pull, cancellationToken: cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(team.ProjectId))
            {
                var add = Builders<Project>.Update.AddToSet(x => x.TeamIds, team.Id);
                await _dbContext.Projects.UpdateOneAsync(x => x.Id == team.ProjectId, add, cancellationToken: cancellationToken);
            }
        }

        if (oldTeamLeadId != team.TeamLeadId)
        {
            if (!string.IsNullOrWhiteSpace(oldTeamLeadId))
            {
                await ReleaseTeamLeadAsync(oldTeamLeadId, removeFromTeam: false, cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(team.TeamLeadId))
            {
                await AssignTeamLeadAsync(team.Id, team.TeamLeadId, cancellationToken);
            }
        }

        return team;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (team is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(team.ProjectId))
        {
            var pullFromProject = Builders<Project>.Update.Pull(x => x.TeamIds, team.Id);
            await _dbContext.Projects.UpdateOneAsync(x => x.Id == team.ProjectId, pullFromProject, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(team.TeamLeadId))
        {
            await ReleaseTeamLeadAsync(team.TeamLeadId, removeFromTeam: true, cancellationToken);
        }

        var clearUsers = Builders<User>.Update
            .Set(x => x.TeamId, null as string)
            .Set(x => x.LeadsTeamId, null as string);
        await _dbContext.Users.UpdateManyAsync(x => x.TeamId == team.Id || x.LeadsTeamId == team.Id, clearUsers, cancellationToken: cancellationToken);

        var result = await _dbContext.Teams.DeleteOneAsync(x => x.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<TeamDetailDto?> AddMemberAsync(string teamId, string userId, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.Find(x => x.Id == teamId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("Team not found.");
        var user = await _dbContext.Users.Find(x => x.Id == userId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("User not found.");

        if (!string.IsNullOrWhiteSpace(user.LeadsTeamId) && user.LeadsTeamId != teamId)
        {
            throw new InvalidOperationException("The selected user leads another team. Reassign or remove them as team lead first.");
        }

        if (!team.MemberIds.Contains(userId))
        {
            var addMember = Builders<Team>.Update.AddToSet(x => x.MemberIds, userId);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, addMember, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(user.TeamId) && user.TeamId != teamId)
        {
            var oldTeamPull = Builders<Team>.Update.Pull(x => x.MemberIds, userId);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == user.TeamId, oldTeamPull, cancellationToken: cancellationToken);
        }

        var updateUser = Builders<User>.Update.Set(x => x.TeamId, teamId);
        await _dbContext.Users.UpdateOneAsync(x => x.Id == userId, updateUser, cancellationToken: cancellationToken);

        return await GetByIdAsync(teamId, cancellationToken);
    }

    public async Task<TeamDetailDto?> RemoveMemberAsync(string teamId, string userId, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams.Find(x => x.Id == teamId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("Team not found.");

        if (team.TeamLeadId == userId)
        {
            var clearLead = Builders<Team>.Update.Set(x => x.TeamLeadId, null as string);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, clearLead, cancellationToken: cancellationToken);
            await ReleaseTeamLeadAsync(userId, removeFromTeam: true, cancellationToken);
        }
        else
        {
            var clearUser = Builders<User>.Update.Set(x => x.TeamId, null as string);
            await _dbContext.Users.UpdateOneAsync(x => x.Id == userId, clearUser, cancellationToken: cancellationToken);
        }

        var pull = Builders<Team>.Update.Pull(x => x.MemberIds, userId);
        await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, pull, cancellationToken: cancellationToken);

        return await GetByIdAsync(teamId, cancellationToken);
    }

    private async Task AssignTeamLeadAsync(string teamId, string teamLeadId, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.Find(x => x.Id == teamLeadId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("Team lead user not found.");

        if (!string.IsNullOrWhiteSpace(user.LeadsTeamId) && user.LeadsTeamId != teamId)
        {
            var clearPreviousLead = Builders<Team>.Update.Set(x => x.TeamLeadId, null as string);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == user.LeadsTeamId, clearPreviousLead, cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(user.TeamId) && user.TeamId != teamId)
        {
            var removeFromOldTeam = Builders<Team>.Update.Pull(x => x.MemberIds, teamLeadId);
            await _dbContext.Teams.UpdateOneAsync(x => x.Id == user.TeamId, removeFromOldTeam, cancellationToken: cancellationToken);
        }

        var teamLeadRole = await _dbContext.Roles.Find(x => x.NormalizedName == "TEAMLEAD").FirstOrDefaultAsync(cancellationToken);

        var updateUser = Builders<User>.Update
            .Set(x => x.LeadsTeamId, teamId)
            .Set(x => x.TeamId, teamId)
            .Set(x => x.RoleName, "TeamLead");

        if (teamLeadRole is not null)
        {
            updateUser = updateUser.Set(x => x.RoleId, teamLeadRole.Id);
        }

        await _dbContext.Users.UpdateOneAsync(x => x.Id == teamLeadId, updateUser, cancellationToken: cancellationToken);

        var addMember = Builders<Team>.Update.AddToSet(x => x.MemberIds, teamLeadId);
        await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, addMember, cancellationToken: cancellationToken);
    }

    private async Task ReleaseTeamLeadAsync(string userId, bool removeFromTeam, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.Find(x => x.Id == userId).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return;
        }

        var update = Builders<User>.Update.Set(x => x.LeadsTeamId, null as string);
        if (removeFromTeam)
        {
            update = update.Set(x => x.TeamId, null as string);
        }

        if (string.Equals(user.RoleName, "TeamLead", StringComparison.OrdinalIgnoreCase))
        {
            var fallbackRole = await ResolveFallbackRoleAsync(removeFromTeam ? null : user.TeamId, cancellationToken);
            update = update
                .Set(x => x.RoleName, fallbackRole?.Name ?? (removeFromTeam ? "Unassigned" : "Developer"))
                .Set(x => x.RoleId, fallbackRole?.Id);
        }

        await _dbContext.Users.UpdateOneAsync(x => x.Id == userId, update, cancellationToken: cancellationToken);
    }

    private async Task<Role?> ResolveFallbackRoleAsync(string? teamId, CancellationToken cancellationToken)
    {
        var normalizedRoleName = string.IsNullOrWhiteSpace(teamId) ? "UNASSIGNED" : "DEVELOPER";
        return await _dbContext.Roles.Find(x => x.NormalizedName == normalizedRoleName).FirstOrDefaultAsync(cancellationToken);
    }

    private static TeamListItemDto MapListItem(Team team) => new()
    {
        Id = team.Id,
        Name = team.Name,
        ProjectId = team.ProjectId,
        ProjectName = team.ProjectName,
        TeamLeadId = team.TeamLeadId,
        MembersCount = team.MemberIds.Count
    };

    private static string Escape(string value) => System.Text.RegularExpressions.Regex.Escape(value.Trim());
}
