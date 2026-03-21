using MongoDB.Bson;
using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.Roles;
using VacationManager.Api.Models.DTOs.Users;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Services;

public sealed class RoleService
{
    private readonly MongoDbContext _dbContext;

    public RoleService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResponse<RoleListItemDto>> GetPagedAsync(RoleFilterQuery query, CancellationToken cancellationToken)
    {
        var filter = Builders<Role>.Filter.Empty;
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            filter &= Builders<Role>.Filter.Regex(x => x.Name, new BsonRegularExpression(Escape(query.Search), "i"));
        }

        var total = await _dbContext.Roles.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var roles = await _dbContext.Roles
            .Find(filter)
            .SortBy(x => x.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        var items = new List<RoleListItemDto>();
        foreach (var role in roles)
        {
            var count = await _dbContext.Users.CountDocumentsAsync(x => x.RoleId == role.Id, cancellationToken: cancellationToken);
            items.Add(new RoleListItemDto
            {
                Id = role.Id,
                Name = role.Name,
                UsersCount = count
            });
        }

        return new PagedResponse<RoleListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public Task<Role?> GetByIdAsync(string id, CancellationToken cancellationToken) =>
        _dbContext.Roles.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);

    public async Task<Role> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var normalized = request.Name.Trim().ToUpperInvariant();
        var exists = await _dbContext.Roles.Find(x => x.NormalizedName == normalized).AnyAsync(cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Role already exists.");
        }

        var role = new Role
        {
            Name = request.Name.Trim(),
            NormalizedName = normalized,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        await _dbContext.Roles.InsertOneAsync(role, cancellationToken: cancellationToken);
        return role;
    }

    public async Task<Role?> UpdateAsync(string id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (role is null)
        {
            return null;
        }

        var normalized = request.Name.Trim().ToUpperInvariant();
        var exists = await _dbContext.Roles.Find(x => x.NormalizedName == normalized && x.Id != id).AnyAsync(cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Role already exists.");
        }

        var oldName = role.Name;
        role.Name = request.Name.Trim();
        role.NormalizedName = normalized;
        role.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.Roles.ReplaceOneAsync(x => x.Id == id, role, cancellationToken: cancellationToken);
        if (!string.Equals(oldName, role.Name, StringComparison.Ordinal))
        {
            var updateUsers = Builders<User>.Update.Set(x => x.RoleName, role.Name);
            await _dbContext.Users.UpdateManyAsync(x => x.RoleId == id, updateUsers, cancellationToken: cancellationToken);
        }

        return role;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var inUse = await _dbContext.Users.Find(x => x.RoleId == id).AnyAsync(cancellationToken);
        if (inUse)
        {
            throw new InvalidOperationException("Cannot delete a role that is assigned to users.");
        }

        var result = await _dbContext.Roles.DeleteOneAsync(x => x.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<PagedResponse<UserListItemDto>> GetUsersAsync(string roleId, PagedQuery query, CancellationToken cancellationToken)
    {
        var total = await _dbContext.Users.CountDocumentsAsync(x => x.RoleId == roleId, cancellationToken: cancellationToken);
        var users = await _dbContext.Users.Find(x => x.RoleId == roleId)
            .SortBy(x => x.Username)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<UserListItemDto>
        {
            Items = users.Select(x => new UserListItemDto
            {
                Id = x.Id,
                Username = x.Username,
                FirstName = x.FirstName,
                LastName = x.LastName,
                RoleName = x.RoleName,
                TeamId = x.TeamId
            }).ToArray(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    private static string Escape(string value) => System.Text.RegularExpressions.Regex.Escape(value.Trim());
}
