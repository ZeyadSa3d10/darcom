using System.Linq.Expressions;
using Application.BackgroundJobs;
using Hangfire;
using Hangfire.States;

namespace Infrastructure.BackgroundJobs;

public sealed class HangfireBackgroundJobService : IBackgroundJobService
{
    private readonly IBackgroundJobClient _client;
    private readonly IRecurringJobManager _recurring;

    public HangfireBackgroundJobService(
        IBackgroundJobClient client,
        IRecurringJobManager recurring)
    {
        _client = client;
        _recurring = recurring;
    }

    public string Enqueue<TJob>(Expression<Func<TJob, Task>> methodCall, string queue = "default")
    {
        var state = new EnqueuedState(NormalizeQueue(queue));
        return _client.Create(methodCall, state);
    }

    public string Schedule<TJob>(
        Expression<Func<TJob, Task>> methodCall,
        DateTimeOffset enqueueAt,
        string queue = "default")
    {
        // Note: Enqueued queue on scheduled transition uses [Queue] attribute or default queue,
        // and Schedule creates the Hangfire ScheduledState cleanly.
        return _client.Schedule(methodCall, enqueueAt);
    }

    public bool Delete(string jobId)
    {
        if (string.IsNullOrWhiteSpace(jobId))
            return false;
        return _client.Delete(jobId);
    }

    public void AddOrUpdateRecurring<TJob>(
        string recurringJobId,
        Expression<Func<TJob, Task>> methodCall,
        string cronExpression,
        string queue = "maintenance",
        string? timeZoneId = null)
    {
        var tz = ResolveTimeZone(timeZoneId);
        _recurring.AddOrUpdate(
            recurringJobId,
            NormalizeQueue(queue),
            methodCall,
            cronExpression,
            new RecurringJobOptions { TimeZone = tz });
    }

    private static string NormalizeQueue(string? queue)
        => string.IsNullOrWhiteSpace(queue) ? "default" : queue.Trim().ToLowerInvariant();

    public static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        if (!string.IsNullOrWhiteSpace(timeZoneId))
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId); }
            catch (TimeZoneNotFoundException)
            {
                // Fallback on Windows when IANA ID ("Africa/Cairo") isn't mapped directly
                if (timeZoneId.Equals("Africa/Cairo", StringComparison.OrdinalIgnoreCase))
                {
                    try { return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time"); }
                    catch { /* ignore */ }
                }
            }
            catch (InvalidTimeZoneException) { /* ignore */ }
        }
        return TimeZoneInfo.Utc;
    }
}

