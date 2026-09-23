using Application.Stores;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class SiteContentStore : ISiteContentStore
{
    private readonly DarcomDbContext _db;

    public SiteContentStore(DarcomDbContext db) => _db = db;

    public Task<SiteContent?> GetByKeyAsync(string key, CancellationToken ct = default)
        => _db.SiteContents.FirstOrDefaultAsync(s => s.ContentKey == key, ct);

    public Task<List<SiteContent>> GetAllAsync(CancellationToken ct = default)
        => _db.SiteContents.OrderBy(s => s.ContentKey).ToListAsync(ct);

    public async Task<Dictionary<string, string>> GetBulkAsync(string[] keys, CancellationToken ct = default)
    {
        var rows = await _db.SiteContents
            .Where(s => keys.Contains(s.ContentKey))
            .Select(s => new { s.ContentKey, s.ContentValue })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.ContentKey, r => r.ContentValue);
    }

    public async Task<SiteContent> UpsertAsync(string key, string value, string? description, int? updatedBy, CancellationToken ct = default)
    {
        var existing = await _db.SiteContents.FirstOrDefaultAsync(s => s.ContentKey == key, ct);
        if (existing is not null)
        {
            existing.ContentValue = value;
            existing.Description = description ?? existing.Description;
            existing.UpdatedBy = updatedBy;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new SiteContent
            {
                ContentKey = key,
                ContentValue = value,
                Description = description,
                UpdatedBy = updatedBy,
            };
            _db.SiteContents.Add(existing);
        }

        await _db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteAsync(string key, CancellationToken ct = default)
    {
        var row = await _db.SiteContents.FirstOrDefaultAsync(s => s.ContentKey == key, ct);
        if (row is null) return false;
        _db.SiteContents.Remove(row);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
