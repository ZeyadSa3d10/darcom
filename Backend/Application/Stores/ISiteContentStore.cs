using Domain.Entities;

namespace Application.Stores;

public interface ISiteContentStore
{
    Task<SiteContent?> GetByKeyAsync(string key, CancellationToken ct = default);
    Task<List<SiteContent>> GetAllAsync(CancellationToken ct = default);
    Task<Dictionary<string, string>> GetBulkAsync(string[] keys, CancellationToken ct = default);
    Task<SiteContent> UpsertAsync(string key, string value, string? description, int? updatedBy, CancellationToken ct = default);
    Task<bool> DeleteAsync(string key, CancellationToken ct = default);
}
