using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Tracks Hangfire JobIds scheduled for bookings, inspections, or entities
/// so they can be cancelled or rescheduled cleanly on modification/cancellation.
/// </summary>
public sealed class ScheduledJobRecord : EntityBase
{
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string JobType { get; set; } = string.Empty;
    public string HangfireJobId { get; set; } = string.Empty;
    public DateTime ScheduledForUtc { get; set; }
    public bool IsCancelled { get; set; }
    public bool IsExecuted { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

/// <summary>
/// Idempotency and delivery ledger for background email/notification dispatches
/// so Hangfire retries never emit duplicate emails or duplicate alerts.
/// </summary>
public sealed class JobDispatchLog : EntityBase
{
    public string DispatchKey { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending | Sent | Failed | Skipped
    public int AttemptCount { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? LastError { get; set; }
}

