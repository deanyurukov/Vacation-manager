using MongoDB.Driver;
using VacationManager.Api.Infrastructure;
using VacationManager.Api.Models.DTOs.LeaveRequests;
using VacationManager.Api.Models.Entities;
using VacationManager.Api.Models.Enums;

namespace VacationManager.Api.Services;

public sealed class LeaveRequestService
{
    private readonly MongoDbContext _dbContext;
    private readonly FileStorageService _fileStorageService;

    public LeaveRequestService(MongoDbContext dbContext, FileStorageService fileStorageService)
    {
        _dbContext = dbContext;
        _fileStorageService = fileStorageService;
    }

    public async Task<PagedResponse<LeaveRequestDto>> GetPagedAsync(
        LeaveRequestFilterQuery query,
        string currentUserId,
        string currentRole,
        CancellationToken cancellationToken)
    {
        var filter = Builders<LeaveRequest>.Filter.Empty;

        if (query.CreatedAfterUtc.HasValue)
        {
            filter &= Builders<LeaveRequest>.Filter.Gt(x => x.CreatedAtUtc, query.CreatedAfterUtc.Value);
        }

        if (query.MineOnly || (currentRole != "CEO" && currentRole != "TeamLead"))
        {
            filter &= Builders<LeaveRequest>.Filter.Eq(x => x.ApplicantId, currentUserId);
        }
        else if (currentRole == "TeamLead")
        {
            var currentUser = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                              ?? throw new InvalidOperationException("Current user not found.");

            if (string.IsNullOrWhiteSpace(currentUser.LeadsTeamId))
            {
                filter &= Builders<LeaveRequest>.Filter.Eq(x => x.ApplicantId, currentUserId);
            }
            else
            {
                filter &= Builders<LeaveRequest>.Filter.Eq(x => x.TeamId, currentUser.LeadsTeamId);
            }
        }

        var total = await _dbContext.LeaveRequests.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var requests = await _dbContext.LeaveRequests.Find(filter)
            .SortByDescending(x => x.CreatedAtUtc)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<LeaveRequestDto>
        {
            Items = requests.Select(Map).ToArray(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<LeaveRequestDto?> GetByIdAsync(string id, string currentUserId, string currentRole, CancellationToken cancellationToken)
    {
        var request = await _dbContext.LeaveRequests.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (request is null)
        {
            return null;
        }

        var currentUser = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Current user not found.");

        EnsureCanAccess(request, currentUser, currentRole);
        return Map(request);
    }

    public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequest request, IFormFile? sickNoteFile, string currentUserId, CancellationToken cancellationToken)
    {
        ValidateDates(request.FromDate, request.ToDate);

        var user = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                   ?? throw new InvalidOperationException("Current user not found.");

        var entity = new LeaveRequest
        {
            Type = request.Type,
            FromDate = request.FromDate.ToDateTime(TimeOnly.MinValue),
            ToDate = request.ToDate.ToDateTime(TimeOnly.MinValue),
            IsHalfDay = request.IsHalfDay,
            ApplicantId = user.Id,
            ApplicantFullName = $"{user.FirstName} {user.LastName}",
            TeamId = user.TeamId,
            Status = LeaveStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        if (request.Type == LeaveType.Sick)
        {
            if (sickNoteFile is null)
            {
                throw new InvalidOperationException("Sick leave requires an attached document.");
            }

            entity.IsHalfDay = false;
            var savedFile = await _fileStorageService.SaveAsync(sickNoteFile, cancellationToken);
            entity.SickNoteStoredFileName = savedFile.StoredFileName;
            entity.SickNoteOriginalFileName = savedFile.OriginalFileName;
            entity.SickNoteContentType = savedFile.ContentType;
        }

        await _dbContext.LeaveRequests.InsertOneAsync(entity, cancellationToken: cancellationToken);
        return Map(entity);
    }

    public async Task<LeaveRequestDto?> UpdateAsync(string id, UpdateLeaveRequest request, string currentUserId, CancellationToken cancellationToken)
    {
        ValidateDates(request.FromDate, request.ToDate);

        var entity = await _dbContext.LeaveRequests.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (entity.ApplicantId != currentUserId)
        {
            throw new InvalidOperationException("Only the applicant can edit the leave request.");
        }

        if (entity.Status != LeaveStatus.Pending)
        {
            throw new InvalidOperationException("Only pending leave requests can be edited.");
        }

        entity.FromDate = request.FromDate.ToDateTime(TimeOnly.MinValue);
        entity.ToDate = request.ToDate.ToDateTime(TimeOnly.MinValue);
        entity.IsHalfDay = entity.Type == LeaveType.Sick ? false : request.IsHalfDay;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.LeaveRequests.ReplaceOneAsync(x => x.Id == id, entity, cancellationToken: cancellationToken);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, string currentUserId, string currentRole, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.LeaveRequests.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (entity is null)
        {
            return false;
        }

        var currentUser = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Current user not found.");

        var isApplicantDeletingPending = entity.ApplicantId == currentUserId && entity.Status == LeaveStatus.Pending;
        var canManagerDelete = CanReview(entity, currentUser, currentRole);

        if (!isApplicantDeletingPending && !canManagerDelete)
        {
            throw new InvalidOperationException("You do not have permission to delete this leave request.");
        }

        var result = await _dbContext.LeaveRequests.DeleteOneAsync(x => x.Id == id, cancellationToken);
        if (result.DeletedCount > 0 && !string.IsNullOrWhiteSpace(entity.SickNoteStoredFileName))
        {
            await _fileStorageService.DeleteAsync(entity.SickNoteStoredFileName);
        }

        return result.DeletedCount > 0;
    }

    public async Task<LeaveRequestDto?> ReviewAsync(string id, ReviewLeaveRequest review, string currentUserId, string currentRole, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.LeaveRequests.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var currentUser = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Current user not found.");

        if (!CanReview(entity, currentUser, currentRole))
        {
            throw new InvalidOperationException("You do not have permission to approve or reject this leave request.");
        }

        if (entity.Status != LeaveStatus.Pending)
        {
            throw new InvalidOperationException("Only pending leave requests can be reviewed.");
        }

        entity.Status = review.Approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
        entity.RejectionReason = review.Approve ? null : string.IsNullOrWhiteSpace(review.RejectionReason) ? "Rejected by reviewer." : review.RejectionReason.Trim();
        entity.ApprovedById = currentUserId;
        entity.ApprovedAtUtc = DateTime.UtcNow;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.LeaveRequests.ReplaceOneAsync(x => x.Id == id, entity, cancellationToken: cancellationToken);
        return Map(entity);
    }

    public async Task<(byte[] Content, string ContentType, string FileName)?> DownloadSickNoteAsync(string id, string currentUserId, string currentRole, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.LeaveRequests.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (entity.Type != LeaveType.Sick || string.IsNullOrWhiteSpace(entity.SickNoteStoredFileName) || string.IsNullOrWhiteSpace(entity.SickNoteOriginalFileName))
        {
            throw new InvalidOperationException("This leave request does not have an attached sick note.");
        }

        var currentUser = await _dbContext.Users.Find(x => x.Id == currentUserId).FirstOrDefaultAsync(cancellationToken)
                          ?? throw new InvalidOperationException("Current user not found.");

        EnsureCanAccess(entity, currentUser, currentRole);
        return await _fileStorageService.ReadAsync(entity.SickNoteStoredFileName, entity.SickNoteOriginalFileName, entity.SickNoteContentType, cancellationToken);
    }

    private static void ValidateDates(DateOnly fromDate, DateOnly toDate)
    {
        if (toDate < fromDate)
        {
            throw new InvalidOperationException("The end date cannot be earlier than the start date.");
        }
    }

    private static LeaveRequestDto Map(LeaveRequest entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type,
        FromDate = DateOnly.FromDateTime(entity.FromDate),
        ToDate = DateOnly.FromDateTime(entity.ToDate),
        CreatedAtUtc = entity.CreatedAtUtc,
        IsHalfDay = entity.IsHalfDay,
        Status = entity.Status,
        ApplicantId = entity.ApplicantId,
        ApplicantFullName = entity.ApplicantFullName,
        TeamId = entity.TeamId,
        HasSickNote = !string.IsNullOrWhiteSpace(entity.SickNoteStoredFileName),
        ApprovedById = entity.ApprovedById,
        ApprovedAtUtc = entity.ApprovedAtUtc,
        RejectionReason = entity.RejectionReason
    };

    private static void EnsureCanAccess(LeaveRequest request, User currentUser, string currentRole)
    {
        var canAccess = request.ApplicantId == currentUser.Id || CanReview(request, currentUser, currentRole) || currentRole == "CEO";
        if (!canAccess)
        {
            throw new InvalidOperationException("You do not have access to this leave request.");
        }
    }

    private static bool CanReview(LeaveRequest request, User currentUser, string currentRole)
    {
        if (request.ApplicantId == currentUser.Id)
        {
            return false;
        }

        if (currentRole == "CEO")
        {
            return true;
        }

        return currentRole == "TeamLead" && !string.IsNullOrWhiteSpace(currentUser.LeadsTeamId) && currentUser.LeadsTeamId == request.TeamId;
    }
}
