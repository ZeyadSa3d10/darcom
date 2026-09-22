using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class EngagementStore : IEngagementStore
{
    private readonly DarcomDbContext _db;

    public EngagementStore(DarcomDbContext db)
    {
        _db = db;
    }

    public Task<bool> IsFavoritedAsync(int userId, int propertyId, CancellationToken ct = default)
        => _db.Favorites.AnyAsync(f => f.UserId == userId && f.PropertyId == propertyId, ct);

    public async Task AddFavoriteAsync(int userId, int propertyId, CancellationToken ct = default)
        => await _db.Favorites.AddAsync(new Favorite { UserId = userId, PropertyId = propertyId }, ct);

    public async Task RemoveFavoriteAsync(int userId, int propertyId, CancellationToken ct = default)
    {
        var existing = await _db.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.PropertyId == propertyId, ct);
        if (existing is not null)
            _db.Favorites.Remove(existing);
    }

    public async Task<PagedResult<PropertyListDto>> GetFavoritesAsync(int userId, int page, int pageSize, CancellationToken ct = default)
    {
        // NOTE: Includes must precede materialization — EF ignores Include() after Select().
        var favoriteIds = await _db.Favorites.AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.PropertyId)
            .ToListAsync(ct);
        var total = favoriteIds.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var pageIds = favoriteIds.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var properties = await _db.Properties.AsNoTracking()
            .Where(p => pageIds.Contains(p.Id))
            .Include(p => p.PropertyType)
            .Include(p => p.Location).ThenInclude(l => l.City)
            .Include(p => p.Images)
            .ToListAsync(ct);
        var ordered = pageIds
            .Select(id => properties.FirstOrDefault(p => p.Id == id))
            .Where(p => p is not null)
            .Select(p => PropertyStore.ToListDto(p!))
            .ToList();
        return new PagedResult<PropertyListDto>(ordered, page, pageSize, total, totalPages);
    }

    public Task<bool> PropertyExistsAsync(int propertyId, CancellationToken ct = default)
        => _db.Properties.AnyAsync(p => p.Id == propertyId, ct);

    public async Task AddNotificationAsync(int userId, string title, string body, string? type, CancellationToken ct = default)
        => await _db.Notifications.AddAsync(new Notification
        {
            UserId = userId,
            Title = title,
            Body = body,
            Type = type,
            IsRead = false
        }, ct);

    public async Task<PagedResult<NotificationDto>> GetNotificationsAsync(int userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.Type, n.IsRead, n.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<NotificationDto>(items, page, pageSize, total, totalPages);
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default)
        => _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task<bool> MarkReadAsync(int userId, int notificationId, CancellationToken ct = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, ct);
        if (notification is null) return false;
        notification.IsRead = true;
        return true;
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken ct = default)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(ct);
        foreach (var n in unread)
            n.IsRead = true;
    }

    public async Task AddInquiryAsync(PropertyInquiry inquiry, CancellationToken ct = default)
        => await _db.PropertyInquiries.AddAsync(inquiry, ct);

    public async Task AddContactMessageAsync(ContactMessage message, CancellationToken ct = default)
        => await _db.ContactMessages.AddAsync(message, ct);
    public async Task<PagedResult<PropertyInquiry>> GetInquiriesAsync(int? propertyId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PropertyInquiries.AsNoTracking().Include(i => i.Property).AsQueryable();
        if (propertyId.HasValue)
            query = query.Where(i => i.PropertyId == propertyId.Value);
        query = query.OrderByDescending(i => i.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<PropertyInquiry>(items, page, pageSize, total, totalPages);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
