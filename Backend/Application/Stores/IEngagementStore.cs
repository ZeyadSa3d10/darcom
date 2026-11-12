using Application.Common;
using Application.DTOs;
using Domain.Entities;

namespace Application.Stores;

public interface IEngagementStore
{
    // Favorites
    Task<bool> IsFavoritedAsync(int userId, int propertyId, CancellationToken ct = default);
    Task AddFavoriteAsync(int userId, int propertyId, CancellationToken ct = default);
    Task RemoveFavoriteAsync(int userId, int propertyId, CancellationToken ct = default);
    Task<PagedResult<PropertyListDto>> GetFavoritesAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<bool> PropertyExistsAsync(int propertyId, CancellationToken ct = default);

    // Notifications
    Task AddNotificationAsync(int userId, string title, string body, string? type, CancellationToken ct = default);
    Task<Notification?> AddNotificationWithMetaAsync(
        int userId,
        string title,
        string body,
        string? type,
        int? relatedEntityId,
        string? relatedEntityType,
        string? eventKey,
        CancellationToken ct = default);
    Task<PagedResult<NotificationDto>> GetNotificationsAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default);
    Task<bool> MarkReadAsync(int userId, int notificationId, CancellationToken ct = default);
    Task MarkAllReadAsync(int userId, CancellationToken ct = default);

    // Inquiries
    Task AddInquiryAsync(PropertyInquiry inquiry, CancellationToken ct = default);
    Task<PagedResult<PropertyInquiry>> GetInquiriesAsync(int? propertyId, int page, int pageSize, CancellationToken ct = default);
    Task AddContactMessageAsync(ContactMessage message, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
