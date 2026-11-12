using System.Linq.Expressions;

namespace Application.BackgroundJobs;

/// <summary>
/// Clean Architecture abstraction over Hangfire BackgroundJobClient & RecurringJobManager.
/// </summary>
public interface IBackgroundJobService
{
    string Enqueue<TJob>(Expression<Func<TJob, Task>> methodCall, string queue = "default");
    string Schedule<TJob>(Expression<Func<TJob, Task>> methodCall, DateTimeOffset enqueueAt, string queue = "default");
    bool Delete(string jobId);
    void AddOrUpdateRecurring<TJob>(
        string recurringJobId,
        Expression<Func<TJob, Task>> methodCall,
        string cronExpression,
        string queue = "maintenance",
        string? timeZoneId = null);
}

public interface IEmailJobService
{
    Task EnqueueOtpEmailAsync(int otpRecordId, string toEmail, string protectedPayload, CancellationToken ct = default);
    Task EnqueueWelcomeEmailAsync(int userId, string toEmail, string fullName, CancellationToken ct = default);
    Task EnqueueBookingCreatedEmailAsync(int bookingId, CancellationToken ct = default);
    Task EnqueueBookingStatusEmailAsync(int bookingId, string status, CancellationToken ct = default);
    Task EnqueueListingRequestStatusEmailAsync(int listingRequestId, string status, CancellationToken ct = default);
    Task EnqueueBrokerStatusEmailAsync(int brokerProfileId, string status, CancellationToken ct = default);
    Task EnqueueRequirementConfirmationEmailAsync(int requirementId, CancellationToken ct = default);
}

public interface IReminderJobService
{
    Task ScheduleBookingRemindersAsync(int bookingId, CancellationToken ct = default);
    Task ScheduleViewingRemindersAsync(int listingRequestId, CancellationToken ct = default);
    Task CancelEntityRemindersAsync(string entityType, int entityId, CancellationToken ct = default);
}

public interface INotificationJobService
{
    Task EnqueueAdminNotificationAsync(
        string eventType,
        string title,
        string message,
        int? relatedEntityId = null,
        string? relatedEntityType = null,
        string? eventKey = null,
        CancellationToken ct = default);
}

public interface IPropertyImageJobService
{
    Task EnqueueImageOptimizationAsync(int propertyImageId, CancellationToken ct = default);
}

