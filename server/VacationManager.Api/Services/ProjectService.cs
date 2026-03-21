using MongoDB.Bson;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.Projects;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Services;

public sealed class ProjectService
{
    private readonly MongoDbContext _dbContext;

    public ProjectService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResponse<ProjectListItemDto>> GetPagedAsync(ProjectFilterQuery query, CancellationToken cancellationToken)
    {
        var filter = Builders<Project>.Filter.Empty;
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var regex = new BsonRegularExpression(Escape(query.Search), "i");
            filter &= Builders<Project>.Filter.Or(
                Builders<Project>.Filter.Regex(x => x.Name, regex),
                Builders<Project>.Filter.Regex(x => x.Description, regex));
        }

        var total = await _dbContext.Projects.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var projects = await _dbContext.Projects.Find(filter)
            .SortBy(x => x.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<ProjectListItemDto>
        {
            Items = projects.Select(x => new ProjectListItemDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                TeamsCount = x.TeamIds.Count
            }).ToArray(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var project = await _dbContext.Projects.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (project is null)
        {
            return null;
        }

        var teamsFilter = project.TeamIds.Count == 0 ? Builders<Team>.Filter.Where(_ => false) : Builders<Team>.Filter.In(x => x.Id, project.TeamIds);
        var teams = await _dbContext.Teams.Find(teamsFilter).ToListAsync(cancellationToken);
        return new ProjectDetailDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            TeamsCount = project.TeamIds.Count,
            Teams = teams.Select(x => (object)new { x.Id, x.Name, x.ProjectId, x.TeamLeadId }).ToArray()
        };
    }

    public async Task<Project> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken)
    {
        var project = new Project
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        await _dbContext.Projects.InsertOneAsync(project, cancellationToken: cancellationToken);
        return project;
    }

    public async Task<Project?> UpdateAsync(string id, UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        var project = await _dbContext.Projects.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (project is null)
        {
            return null;
        }

        project.Name = request.Name.Trim();
        project.Description = request.Description.Trim();
        project.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.Projects.ReplaceOneAsync(x => x.Id == id, project, cancellationToken: cancellationToken);
        await _dbContext.Teams.UpdateManyAsync(x => x.ProjectId == id,
            Builders<Team>.Update.Set(x => x.ProjectName, project.Name), cancellationToken: cancellationToken);

        return project;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var clearTeams = Builders<Team>.Update
            .Set(x => x.ProjectId, null as string)
            .Set(x => x.ProjectName, null as string);
        await _dbContext.Teams.UpdateManyAsync(x => x.ProjectId == id, clearTeams, cancellationToken: cancellationToken);

        var result = await _dbContext.Projects.DeleteOneAsync(x => x.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<ProjectDetailDto?> AddTeamAsync(string projectId, string teamId, CancellationToken cancellationToken)
    {
        var project = await _dbContext.Projects.Find(x => x.Id == projectId).FirstOrDefaultAsync(cancellationToken)
                      ?? throw new InvalidOperationException("Project not found.");
        var team = await _dbContext.Teams.Find(x => x.Id == teamId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("Team not found.");

        var addTeam = Builders<Project>.Update.AddToSet(x => x.TeamIds, teamId);
        await _dbContext.Projects.UpdateOneAsync(x => x.Id == projectId, addTeam, cancellationToken: cancellationToken);

        var updateTeam = Builders<Team>.Update
            .Set(x => x.ProjectId, projectId)
            .Set(x => x.ProjectName, project.Name);
        await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, updateTeam, cancellationToken: cancellationToken);

        return await GetByIdAsync(projectId, cancellationToken);
    }

    public async Task<ProjectDetailDto?> RemoveTeamAsync(string projectId, string teamId, CancellationToken cancellationToken)
    {
        var pullTeam = Builders<Project>.Update.Pull(x => x.TeamIds, teamId);
        await _dbContext.Projects.UpdateOneAsync(x => x.Id == projectId, pullTeam, cancellationToken: cancellationToken);

        var clearTeam = Builders<Team>.Update
            .Set(x => x.ProjectId, null as string)
            .Set(x => x.ProjectName, null as string);
        await _dbContext.Teams.UpdateOneAsync(x => x.Id == teamId, clearTeam, cancellationToken: cancellationToken);

        return await GetByIdAsync(projectId, cancellationToken);
    }

    private static string Escape(string value) => System.Text.RegularExpressions.Regex.Escape(value.Trim());
}
