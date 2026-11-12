using Application.Common;
using Application.Common.Messaging;
using Application.Services;
using MediatR;

namespace Application.Features.Notifications.Commands;

public sealed record MarkNotificationReadCommand(int UserId, int NotificationId)
    : ICommand<object?>;

public sealed class MarkNotificationReadCommandHandler
    : IRequestHandler<MarkNotificationReadCommand, ServiceResult<object?>>
{
    private readonly INotificationService _notifications;

    public MarkNotificationReadCommandHandler(INotificationService notifications) => _notifications = notifications;

    public Task<ServiceResult<object?>> Handle(MarkNotificationReadCommand cmd, CancellationToken ct)
        => _notifications.MarkReadAsync(cmd.UserId, cmd.NotificationId, ct);
}

public sealed record MarkAllNotificationsReadCommand(int UserId)
    : ICommand<object?>;

public sealed class MarkAllNotificationsReadCommandHandler
    : IRequestHandler<MarkAllNotificationsReadCommand, ServiceResult<object?>>
{
    private readonly INotificationService _notifications;

    public MarkAllNotificationsReadCommandHandler(INotificationService notifications) => _notifications = notifications;

    public Task<ServiceResult<object?>> Handle(MarkAllNotificationsReadCommand cmd, CancellationToken ct)
        => _notifications.MarkAllReadAsync(cmd.UserId, ct);
}

