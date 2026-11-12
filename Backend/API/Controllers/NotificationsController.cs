using Application.Common;
using Application.DTOs;
using Application.Features.Notifications.Commands;
using Application.Features.Notifications.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class NotificationsController : ApiBaseController
{
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<NotificationDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<NotificationDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => SendAsync(new GetMyNotificationsQuery(CurrentUserId(), page, pageSize), ct);

    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), 200)]
    public Task<ActionResult<ApiResponse<int>>> UnreadCount(CancellationToken ct)
        => SendAsync(new GetUnreadNotificationsCountQuery(CurrentUserId()), ct);

    [HttpPost("{id:int}/read")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<object?>>> MarkRead(int id, CancellationToken ct)
        => SendAsync(new MarkNotificationReadCommand(CurrentUserId(), id), ct);

    [HttpPost("read-all")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public Task<ActionResult<ApiResponse<object?>>> MarkAllRead(CancellationToken ct)
        => SendAsync(new MarkAllNotificationsReadCommand(CurrentUserId()), ct);
}
