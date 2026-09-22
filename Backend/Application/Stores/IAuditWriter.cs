using Application.Common;
using Application.DTOs;

namespace Application.Stores;

/// <summary>Audit trail writer (website.md #45). IP is captured where appropriate.</summary>
public interface IAuditWriter
{
    Task LogAsync(
        int? userId,
        string action,
        string entity,
        string entityId,
        string? oldValue = null,
        string? newValue = null,
        string? ipAddress = null,
        CancellationToken ct = default);

    Task<PagedResult<AuditLogDto>> GetLogsAsync(
        string? entity, int page, int pageSize, CancellationToken ct = default);
}
