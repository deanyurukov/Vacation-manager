using Microsoft.Extensions.Options;
using MongoDB.Driver;
using VacationManager.Api.Models.Entities;

namespace VacationManager.Api.Infrastructure;

public sealed class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var mongoSettings = settings.Value;
        var client = new MongoClient(mongoSettings.ConnectionString);
        _database = client.GetDatabase(mongoSettings.DatabaseName);
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    public IMongoCollection<Role> Roles => _database.GetCollection<Role>("roles");
    public IMongoCollection<Team> Teams => _database.GetCollection<Team>("teams");
    public IMongoCollection<Project> Projects => _database.GetCollection<Project>("projects");
    public IMongoCollection<LeaveRequest> LeaveRequests => _database.GetCollection<LeaveRequest>("leave_requests");
}
