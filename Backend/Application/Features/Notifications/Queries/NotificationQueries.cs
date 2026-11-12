using Application.Common;
using Application.Common.Messaging;
using Application.DTOs;
using Application.Services;
using MediatR;

namespace Application.Features.Notifications.Queries;

public sealed record GetMyNotificationsQuery(int UserId, int Page, int PageSize)
    : IQuery<PagedResult<NotificationDto>>;

public sealed class GetMyNotificationsQueryHandler
    : IRequestHandler<GetMyNotificationsQuery, ServiceResult<PagedResult<NotificationDto>>>
{
    private readonly INotificationService _notifications;

    public GetMyNotificationsQueryHandler(INotificationService notifications) => _notifications = notifications;

    public Task<ServiceResult<PagedResult<NotificationDto>>> Handle(
        GetMyNotificationsQuery request, CancellationToken ct)
        => _notifications.MyAsync(request.UserId, request.Page, request.PageSize, ct);
}

public sealed record GetUnreadNotificationsCountQuery(int UserId)
    : IQuery<int>;

public sealed class GetUnreadNotificationsCountQueryHandler
    : IRequestHandler<GetUnreadNotificationsCountQuery, ServiceResult<int>>
{
    private readonly INotificationService _notifications;

    public GetUnreadNotificationsCountQueryHandler(INotificationService notifications) => _notifications = notifications;

    public Task<ServiceResult<int>> Handle(
        GetUnreadNotificationsCountQuery request, CancellationToken ct)
        => _notifications.UnreadCountAsync(request.UserId, ct);
}

