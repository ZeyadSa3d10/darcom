using Application.Services;
using Application.Stores;
using Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Notifications;

public sealed class AdminNotificationDispatcher : IAdminRealtimeNotifier
{
    private readonly IRequestStore _requests;
    private readonly IEngagementStore _engagement;
    private readonly IRealtimeHubPublisher _hubPublisher;
    private readonly ILogger<AdminNotificationDispatcher> _logger;

    public AdminNotificationDispatcher(
        IRequestStore requests,
        IEngagementStore engagement,
        IRealtimeHubPublisher hubPublisher,
        ILogger<AdminNotificationDispatcher> logger)
    {
        _requests = requests;
        _engagement = engagement;
        _hubPublisher = hubPublisher;
        _logger = logger;
    }

    public async Task NotifyAdminsAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId = null,
        string? relatedEntityType = null,
        string? eventKey = null,
        CancellationToken ct = default)
    {
        var adminIds = await _requests.GetAdminUserIdsAsync(ct);
        if (adminIds.Count == 0)
            return;

        var createdNotifications = new List<Notification>();
        foreach (var adminId in adminIds)
        {
            var added = await _engagement.AddNotificationWithMetaAsync(
                adminId,
                title,
                message,
                eventType,
                relatedEntityId,
                relatedEntityType,
                eventKey,
                ct);

            if (added is not null)
                createdNotifications.Add(added);
        }

        if (createdNotifications.Count == 0)
            return;

        // 1. Persist permanently BEFORE pushing real-time SignalR message
        await _engagement.SaveChangesAsync(ct);

        var first = createdNotifications[0];
        var payload = new AdminRealtimeNotification(
            first.Id,
            eventType,
            title,
            message,
            relatedEntityId,
            relatedEntityType,
            first.CreatedAt);

        // 2. Push real-time notification safely without exposing PII or failing the caller
        try
        {
            await _hubPublisher.PublishToAdminsAsync(payload, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR broadcast failed for event {EventType}, notification persisted in DB.", eventType);
        }
    }
}

