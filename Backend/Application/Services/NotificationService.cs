using Application.Common;
using Application.DTOs;
using Application.Stores;

namespace Application.Services;

public interface INotificationService
{
    Task<ServiceResult<PagedResult<NotificationDto>>> MyAsync(int userId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<int>> UnreadCountAsync(int userId, CancellationToken ct = default);
    Task<ServiceResult<object?>> MarkReadAsync(int userId, int notificationId, CancellationToken ct = default);
    Task<ServiceResult<object?>> MarkAllReadAsync(int userId, CancellationToken ct = default);
}

public sealed class NotificationService : INotificationService
{
    private readonly IEngagementStore _store;

    public NotificationService(IEngagementStore store)
    {
        _store = store;
    }

    public async Task<ServiceResult<PagedResult<NotificationDto>>> MyAsync(int userId, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<NotificationDto>>.Ok(
            await _store.GetNotificationsAsync(userId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct));

    public async Task<ServiceResult<int>> UnreadCountAsync(int userId, CancellationToken ct = default)
        => ServiceResult<int>.Ok(await _store.GetUnreadCountAsync(userId, ct));

    public async Task<ServiceResult<object?>> MarkReadAsync(int userId, int notificationId, CancellationToken ct = default)
    {
        if (!await _store.MarkReadAsync(userId, notificationId, ct))
            return ServiceResult<object?>.NotFound("Notification not found.");
        await _store.SaveChangesAsync(ct);
        return ServiceResult<object?>.Ok(null, "Marked as read.");
    }

    public async Task<ServiceResult<object?>> MarkAllReadAsync(int userId, CancellationToken ct = default)
    {
        await _store.MarkAllReadAsync(userId, ct);
        await _store.SaveChangesAsync(ct);
        return ServiceResult<object?>.Ok(null, "All notifications marked as read.");
    }
}
