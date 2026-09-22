namespace Application.Common;

/// <summary>Server-side pagination envelope (website.md #27). Never returns unbounded lists.</summary>
public sealed record PagedResult<T>(
    List<T> Data,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
