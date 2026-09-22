using Application.Common;
using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class NotificationsController : ApiBaseController
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<NotificationDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<NotificationDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _notifications.MyAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<NotificationDto>>.Ok(result.Data!));
    }

    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), 200)]
    public async Task<ActionResult<ApiResponse<int>>> UnreadCount(CancellationToken ct)
    {
        var result = await _notifications.UnreadCountAsync(CurrentUserId(), ct);
        return Ok(ApiResponse<int>.Ok(result.Data!));
    }

    [HttpPost("{id:int}/read")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ApiResponse<object?>>> MarkRead(int id, CancellationToken ct)
    {
        var result = await _notifications.MarkReadAsync(CurrentUserId(), id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    [HttpPost("read-all")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> MarkAllRead(CancellationToken ct)
    {
        var result = await _notifications.MarkAllReadAsync(CurrentUserId(), ct);
        return Ok(ApiResponse<object?>.Ok(result.Message));
    }
}
