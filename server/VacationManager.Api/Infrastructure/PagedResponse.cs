namespace VacationManager.Api.Infrastructure;

public sealed class PagedResponse<T>
{
    public IReadOnlyCollection<T> Items { get; init; } = Array.Empty<T>();
    public long TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
