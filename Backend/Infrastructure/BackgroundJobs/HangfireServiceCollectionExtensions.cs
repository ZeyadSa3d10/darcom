using System.Linq.Expressions;
using Application.BackgroundJobs;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.BackgroundJobs;

public static class HangfireServiceCollectionExtensions
{
    public static IServiceCollection AddHangfireInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<HangfireOptions>(configuration.GetSection(HangfireOptions.Section));
        services.AddScoped<EmailBackgroundJobWorker>();
        services.AddScoped<ReminderBackgroundJobWorker>();
        services.AddScoped<PendingRequestsMonitorJob>();
        services.AddScoped<SecurityCleanupJob>();
        services.AddScoped<AdminNotificationBackgroundJob>();
        services.AddScoped<PropertyImageProcessingJob>();
        services.AddScoped<DailyReportJob>();
        services.AddScoped<ScheduledPropertyPublishingJob>();

        var opts = configuration.GetSection(HangfireOptions.Section).Get<HangfireOptions>() ?? new HangfireOptions();
        if (!opts.Enabled)
        {
            services.AddScoped<IBackgroundJobService, NoopBackgroundJobService>();
            services.AddScoped<IEmailJobService, NoopEmailJobService>();
            services.AddScoped<IReminderJobService, NoopReminderJobService>();
            services.AddScoped<INotificationJobService, NoopNotificationJobService>();
            services.AddScoped<IPropertyImageJobService, NoopPropertyImageJobService>();
            return services;
        }

        services.AddScoped<IBackgroundJobService, HangfireBackgroundJobService>();
        services.AddScoped<IEmailJobService, HangfireEmailJobService>();
        services.AddScoped<IReminderJobService, HangfireReminderJobService>();
        services.AddScoped<INotificationJobService, HangfireNotificationJobService>();
        services.AddScoped<IPropertyImageJobService, HangfirePropertyImageJobService>();
        services.AddHostedService<HangfireRecurringJobsRegistrar>();

        var connectionString = configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:Default must be configured to enable Hangfire SQL Server storage.");

        var retryAttempts = Math.Clamp(opts.RetryAttempts, 0, 10);

        services.AddHangfire(config =>
        {
            config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseFilter(new AutomaticRetryAttribute
                {
                    Attempts = retryAttempts,
                    DelaysInSeconds = [15, 60, 180],
                    LogEvents = true,
                    OnAttemptsExceeded = AttemptsExceededAction.Fail
                })
                .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval = TimeSpan.FromSeconds(5),
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks = true,
                    PrepareSchemaIfNecessary = true
                });
        });

        var queues = opts.Queues is { Length: > 0 }
            ? opts.Queues
            : ["critical", "emails", "default", "maintenance"];

        services.AddHangfireServer(serverOptions =>
        {
            serverOptions.WorkerCount = Math.Clamp(opts.WorkerCount, 1, 20);
            serverOptions.Queues = queues;
            serverOptions.ServerName = $"darcom-api:{Environment.MachineName}";
        });

        return services;
    }
}

internal sealed class NoopBackgroundJobService : IBackgroundJobService
{
    public string Enqueue<TJob>(Expression<Func<TJob, Task>> methodCall, string queue = "default") => string.Empty;
    public string Schedule<TJob>(Expression<Func<TJob, Task>> methodCall, DateTimeOffset enqueueAt, string queue = "default") => string.Empty;
    public bool Delete(string jobId) => false;
    public void AddOrUpdateRecurring<TJob>(string recurringJobId, Expression<Func<TJob, Task>> methodCall, string cronExpression, string queue = "maintenance", string? timeZoneId = null) { }
}

internal sealed class NoopEmailJobService : IEmailJobService
{
    public Task EnqueueOtpEmailAsync(int otpRecordId, string toEmail, string protectedPayload, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueWelcomeEmailAsync(int userId, string toEmail, string fullName, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueBookingCreatedEmailAsync(int bookingId, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueBookingStatusEmailAsync(int bookingId, string status, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueListingRequestStatusEmailAsync(int listingRequestId, string status, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueBrokerStatusEmailAsync(int brokerProfileId, string status, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnqueueRequirementConfirmationEmailAsync(int requirementId, CancellationToken ct = default) => Task.CompletedTask;
}

internal sealed class NoopReminderJobService : IReminderJobService
{
    public Task ScheduleBookingRemindersAsync(int bookingId, CancellationToken ct = default) => Task.CompletedTask;
    public Task ScheduleViewingRemindersAsync(int listingRequestId, CancellationToken ct = default) => Task.CompletedTask;
    public Task CancelEntityRemindersAsync(string entityType, int entityId, CancellationToken ct = default) => Task.CompletedTask;
}

internal sealed class NoopNotificationJobService : INotificationJobService
{
    public Task EnqueueAdminNotificationAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId = null,
        string? relatedEntityType = null,
        string? eventKey = null,
        CancellationToken ct = default) => Task.CompletedTask;
}

internal sealed class NoopPropertyImageJobService : IPropertyImageJobService
{
    public Task EnqueueImageOptimizationAsync(int propertyImageId, CancellationToken ct = default) => Task.CompletedTask;
}

