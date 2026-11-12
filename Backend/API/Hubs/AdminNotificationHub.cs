using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

[Authorize(Roles = "Admin")]
public sealed class AdminNotificationHub : Hub
{
    public const string AdminsGroup = "Admins";

    private readonly ILogger<AdminNotificationHub> _logger;

    public AdminNotificationHub(ILogger<AdminNotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        // Derive identity & role strictly from verified JWT Claims; never accept group names from clients.
        var isAdmin = Context.User?.IsInRole("Admin") == true;
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        if (!isAdmin || string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
        _logger.LogInformation("Admin user {UserId} connected to AdminNotificationHub ({ConnectionId})",
            userId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, AdminsGroup);
        await base.OnDisconnectedAsync(exception);
    }
}

