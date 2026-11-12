using Hangfire.Dashboard;

namespace API.Security;

/// <summary>
/// Strictly authorizes Hangfire Dashboard access to authenticated users with the Admin role.
/// Never allows anonymous or non-Admin users even for local requests.
/// </summary>
public sealed class HangfireAdminDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var user = context.GetHttpContext().User;
        return user?.Identity?.IsAuthenticated == true && user.IsInRole("Admin");
    }
}
