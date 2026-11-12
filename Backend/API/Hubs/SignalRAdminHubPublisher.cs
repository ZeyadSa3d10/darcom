using Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

public sealed class SignalRAdminHubPublisher : IRealtimeHubPublisher
{
    private readonly IHubContext<AdminNotificationHub> _hubContext;

    public SignalRAdminHubPublisher(IHubContext<AdminNotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishToAdminsAsync(AdminRealtimeNotification payload, CancellationToken ct = default)
        => _hubContext.Clients
            .Group(AdminNotificationHub.AdminsGroup)
            .SendAsync("AdminNotification", payload, ct);
}

