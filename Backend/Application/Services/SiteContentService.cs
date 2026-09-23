using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;

namespace Application.Services;

public interface ISiteContentService
{
    Task<ServiceResult<SiteContentDto>> GetByKeyAsync(string key, CancellationToken ct = default);
    Task<ServiceResult<List<SiteContentDto>>> GetAllAsync(CancellationToken ct = default);
    Task<ServiceResult<Dictionary<string, string>>> GetBulkAsync(string[] keys, CancellationToken ct = default);
    Task<ServiceResult<SiteContentDto>> UpsertAsync(int adminId, UpsertSiteContentRequest request, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteAsync(int adminId, string key, string? ipAddress, CancellationToken ct = default);
}

public sealed class SiteContentService : ISiteContentService
{
    private readonly ISiteContentStore _store;
    private readonly IAuditWriter _audit;

    public SiteContentService(ISiteContentStore store, IAuditWriter audit)
    {
        _store = store;
        _audit = audit;
    }

    public async Task<ServiceResult<SiteContentDto>> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        var entity = await _store.GetByKeyAsync(key, ct);
        if (entity is null)
            return ServiceResult<SiteContentDto>.NotFound($"Content key '{key}' not found.");
        return ServiceResult<SiteContentDto>.Ok(Map(entity));
    }

    public async Task<ServiceResult<List<SiteContentDto>>> GetAllAsync(CancellationToken ct = default)
    {
        var all = await _store.GetAllAsync(ct);
        return ServiceResult<List<SiteContentDto>>.Ok(all.Select(Map).ToList());
    }

    public async Task<ServiceResult<Dictionary<string, string>>> GetBulkAsync(string[] keys, CancellationToken ct = default)
    {
        var result = await _store.GetBulkAsync(keys, ct);
        return ServiceResult<Dictionary<string, string>>.Ok(result);
    }

    public async Task<ServiceResult<SiteContentDto>> UpsertAsync(int adminId, UpsertSiteContentRequest request, string? ipAddress, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.ContentKey))
            return ServiceResult<SiteContentDto>.Fail("ContentKey is required.", 422,
                new() { new("ContentKey is required.", "contentKey") });

        if (string.IsNullOrWhiteSpace(request.ContentValue))
            return ServiceResult<SiteContentDto>.Fail("ContentValue is required.", 422,
                new() { new("ContentValue is required.", "contentValue") });

        var entity = await _store.UpsertAsync(
            request.ContentKey.Trim().ToLowerInvariant(),
            request.ContentValue,
            request.Description,
            adminId,
            ct);

        await _audit.LogAsync(adminId, "site-content.upsert", "SiteContent",
            entity.Id.ToString(), null, request.ContentKey, ipAddress, ct);

        return ServiceResult<SiteContentDto>.Ok(Map(entity), "Content saved.");
    }

    public async Task<ServiceResult<object?>> DeleteAsync(int adminId, string key, string? ipAddress, CancellationToken ct = default)
    {
        if (!await _store.DeleteAsync(key, ct))
            return ServiceResult<object?>.NotFound($"Content key '{key}' not found.");

        await _audit.LogAsync(adminId, "site-content.deleted", "SiteContent",
            key, null, "Deleted", ipAddress, ct);

        return ServiceResult<object?>.Ok(null, "Content deleted.");
    }

    private static SiteContentDto Map(SiteContent e)
        => new(e.Id, e.ContentKey, e.ContentValue, e.Description, e.UpdatedBy, e.CreatedAt, e.UpdatedAt);
}
