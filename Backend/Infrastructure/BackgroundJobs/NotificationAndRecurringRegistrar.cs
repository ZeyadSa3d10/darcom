using Application.BackgroundJobs;
using Application.Services;
using Hangfire;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.BackgroundJobs;

public sealed class HangfireNotificationJobService : INotificationJobService
{
    private readonly IBackgroundJobService _jobs;

    public HangfireNotificationJobService(IBackgroundJobService jobs) => _jobs = jobs;

    public Task EnqueueAdminNotificationAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId = null,
        string? relatedEntityType = null,
        string? eventKey = null,
        CancellationToken ct = default)
    {
        _jobs.Enqueue<AdminNotificationBackgroundJob>(
            j => j.DispatchAsync(eventType, title, message, relatedEntityId, relatedEntityType, eventKey, CancellationToken.None),
            queue: "default");
        return Task.CompletedTask;
    }
}

public sealed class AdminNotificationBackgroundJob
{
    private readonly IAdminRealtimeNotifier _notifier;

    public AdminNotificationBackgroundJob(IAdminRealtimeNotifier notifier) => _notifier = notifier;

    [Queue("default")]
    public Task DispatchAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId,
        string? relatedEntityType,
        string? eventKey,
        CancellationToken ct = default)
        => _notifier.NotifyAdminsAsync(eventType, title, message, relatedEntityId, relatedEntityType, eventKey, ct);
}

/// <summary>
/// Registers all idempotent recurring maintenance jobs on application startup.
/// Safe to execute across restarts without duplicating schedules.
/// </summary>
public sealed class HangfireRecurringJobsRegistrar : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly HangfireOptions _options;
    private readonly ILogger<HangfireRecurringJobsRegistrar> _logger;

    public HangfireRecurringJobsRegistrar(
        IServiceScopeFactory scopeFactory,
        IOptions<HangfireOptions> options,
        ILogger<HangfireRecurringJobsRegistrar> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
            return Task.CompletedTask;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var jobs = scope.ServiceProvider.GetRequiredService<IBackgroundJobService>();
            var tz = _options.TimeZoneId;

            jobs.AddOrUpdateRecurring<PendingRequestsMonitorJob>(
                "darcom-pending-requests-monitor",
                j => j.ExecuteAsync(CancellationToken.None),
                _options.PendingMonitorCron,
                queue: "maintenance",
                timeZoneId: tz);

            jobs.AddOrUpdateRecurring<SecurityCleanupJob>(
                "darcom-otp-cleanup",
                j => j.CleanupExpiredOtpsAsync(CancellationToken.None),
                _options.OtpCleanupCron,
                queue: "maintenance",
                timeZoneId: tz);

            jobs.AddOrUpdateRecurring<SecurityCleanupJob>(
                "darcom-refresh-token-cleanup",
                j => j.CleanupExpiredRefreshTokensAsync(CancellationToken.None),
                _options.RefreshTokenCleanupCron,
                queue: "maintenance",
                timeZoneId: tz);

            jobs.AddOrUpdateRecurring<DailyReportJob>(
                "darcom-daily-report",
                j => j.ExecuteAsync(CancellationToken.None),
                _options.DailyReportCron,
                queue: "maintenance",
                timeZoneId: tz);

            jobs.AddOrUpdateRecurring<ScheduledPropertyPublishingJob>(
                "darcom-scheduled-property-publishing",
                j => j.ExecuteAsync(CancellationToken.None),
                _options.PropertyPublishingCron,
                queue: "maintenance",
                timeZoneId: tz);

            _logger.LogInformation("Registered Hangfire recurring jobs with timezone {TimeZoneId}.", tz);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register Hangfire recurring jobs on startup.");
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

