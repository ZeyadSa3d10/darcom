namespace Application.BackgroundJobs;

/// <summary>
/// Configuration options for Hangfire queues, retries, retention policies,
/// reminders, and daily reports (never stores secrets or credentials).
/// </summary>
public sealed class HangfireOptions
{
    public const string Section = "Hangfire";

    public bool Enabled { get; set; } = true;
    public bool EnableDashboard { get; set; } = true;
    public bool ReadOnlyDashboardInProduction { get; set; } = false;

    public string[] Queues { get; set; } = ["critical", "emails", "default", "maintenance"];
    public int WorkerCount { get; set; } = 4;
    public int RetryAttempts { get; set; } = 3;

    // Booking & viewing reminders
    public int[] ViewingReminderHoursBefore { get; set; } = [24, 1];
    public int BookingReminderHoursBeforeStart { get; set; } = 24;
    public int BookingReminderHoursBeforeEnd { get; set; } = 24;

    // Pending request monitoring thresholds (hours)
    public int PendingRequestAlertHours { get; set; } = 24;
    public int PendingRequestEscalationHours { get; set; } = 48;
    public string PendingMonitorCron { get; set; } = "0 * * * *"; // hourly

    // Security token & OTP retention
    public int OtpRetentionHours { get; set; } = 24;
    public string OtpCleanupCron { get; set; } = "0 */6 * * *"; // every 6 hours
    public int RefreshTokenRetentionDays { get; set; } = 30;
    public string RefreshTokenCleanupCron { get; set; } = "0 3 * * *"; // daily 03:00

    // Daily admin report & scheduled property publishing
    public string DailyReportCron { get; set; } = "0 8 * * *"; // daily 08:00
    public string? DailyReportRecipientEmail { get; set; }
    public string TimeZoneId { get; set; } = "Africa/Cairo";
    public string PropertyPublishingCron { get; set; } = "*/5 * * * *"; // every 5 minutes

    // Image optimization settings
    public ImageProcessingOptions ImageProcessing { get; set; } = new();
}

public sealed class ImageProcessingOptions
{
    public bool Enabled { get; set; } = true;
    public int MaxWidth { get; set; } = 1920;
    public int ThumbnailWidth { get; set; } = 480;
    public int Quality { get; set; } = 82;
}

