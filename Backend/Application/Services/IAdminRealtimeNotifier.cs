namespace Application.Services;

public sealed record AdminRealtimeNotification(
    int? NotificationId,
    string EventType,
    string Title,
    string Message,
    int? RelatedEntityId,
    string? RelatedEntityType,
    DateTime CreatedAt);

public interface IAdminRealtimeNotifier
{
    Task NotifyAdminsAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId = null,
        string? relatedEntityType = null,
        string? eventKey = null,
        CancellationToken ct = default);
}

public interface IRealtimeHubPublisher
{
    Task PublishToAdminsAsync(AdminRealtimeNotification payload, CancellationToken ct = default);
}

