using Application.BackgroundJobs;
using Application.Services;
using Domain.Enums;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.BackgroundJobs;

public sealed class HangfireReminderJobService : IReminderJobService
{
    private readonly DarcomDbContext _db;
    private readonly IBackgroundJobService _jobs;
    private readonly HangfireOptions _options;
    private readonly ILogger<HangfireReminderJobService> _logger;

    public HangfireReminderJobService(
        DarcomDbContext db,
        IBackgroundJobService jobs,
        IOptions<HangfireOptions> options,
        ILogger<HangfireReminderJobService> logger)
    {
        _db = db;
        _jobs = jobs;
        _options = options.Value;
        _logger = logger;
    }

    public async Task ScheduleBookingRemindersAsync(int bookingId, CancellationToken ct = default)
    {
        await CancelEntityRemindersAsync("BookingRequest", bookingId, ct);

        var booking = await _db.BookingRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

        if (booking is null || booking.Status != RequestStatus.Approved || !booking.StartDate.HasValue)
            return;

        var now = DateTime.UtcNow;
        var startUtc = NormalizeUtc(booking.StartDate.Value);
        var hoursBeforeStart = Math.Max(1, _options.BookingReminderHoursBeforeStart);
        var startReminderUtc = startUtc.AddHours(-hoursBeforeStart);

        if (startReminderUtc > now)
        {
            var jobId = _jobs.Schedule<ReminderBackgroundJobWorker>(
                w => w.SendBookingReminderAsync(bookingId, "start", CancellationToken.None),
                new DateTimeOffset(startReminderUtc, TimeSpan.Zero),
                queue: "emails");

            await TrackScheduledJobAsync("BookingRequest", bookingId, "booking.reminder.start", jobId, startReminderUtc, ct);
        }

        if (booking.EndDate.HasValue && _options.BookingReminderHoursBeforeEnd > 0)
        {
            var endUtc = NormalizeUtc(booking.EndDate.Value);
            var endReminderUtc = endUtc.AddHours(-_options.BookingReminderHoursBeforeEnd);
            if (endReminderUtc > now)
            {
                var jobId = _jobs.Schedule<ReminderBackgroundJobWorker>(
                    w => w.SendBookingReminderAsync(bookingId, "end", CancellationToken.None),
                    new DateTimeOffset(endReminderUtc, TimeSpan.Zero),
                    queue: "emails");

                await TrackScheduledJobAsync("BookingRequest", bookingId, "booking.reminder.end", jobId, endReminderUtc, ct);
            }
        }
    }

    public async Task ScheduleViewingRemindersAsync(int listingRequestId, CancellationToken ct = default)
    {
        await CancelEntityRemindersAsync("PropertyListingRequest", listingRequestId, ct);

        var req = await _db.PropertyListingRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == listingRequestId, ct);

        if (req is null || req.Status != ListingRequestStatus.InspectionScheduled || !req.InspectionDate.HasValue)
            return;

        var now = DateTime.UtcNow;
        var inspectionUtc = NormalizeUtc(req.InspectionDate.Value);
        var intervals = _options.ViewingReminderHoursBefore is { Length: > 0 }
            ? _options.ViewingReminderHoursBefore.Distinct().Where(h => h > 0)
            : [24, 1];

        foreach (var hoursBefore in intervals)
        {
            var triggerUtc = inspectionUtc.AddHours(-hoursBefore);
            if (triggerUtc <= now)
                continue;

            var jobId = _jobs.Schedule<ReminderBackgroundJobWorker>(
                w => w.SendViewingReminderAsync(listingRequestId, hoursBefore, CancellationToken.None),
                new DateTimeOffset(triggerUtc, TimeSpan.Zero),
                queue: "emails");

            await TrackScheduledJobAsync(
                "PropertyListingRequest",
                listingRequestId,
                $"viewing.reminder.{hoursBefore}h",
                jobId,
                triggerUtc,
                ct);
        }
    }

    public async Task CancelEntityRemindersAsync(string entityType, int entityId, CancellationToken ct = default)
    {
        var activeRecords = await _db.ScheduledJobRecords
            .Where(r => r.EntityType == entityType
                && r.EntityId == entityId
                && !r.IsCancelled
                && !r.IsExecuted)
            .ToListAsync(ct);

        if (activeRecords.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var rec in activeRecords)
        {
            if (!string.IsNullOrWhiteSpace(rec.HangfireJobId))
            {
                try { _jobs.Delete(rec.HangfireJobId); }
                catch (Exception ex) { _logger.LogDebug(ex, "Could not delete Hangfire job {JobId}.", rec.HangfireJobId); }
            }

            rec.IsCancelled = true;
            rec.CancelledAt = now;
            rec.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task TrackScheduledJobAsync(
        string entityType,
        int entityId,
        string jobType,
        string? hangfireJobId,
        DateTime scheduledForUtc,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(hangfireJobId))
            hangfireJobId = $"local:{Guid.NewGuid():N}";

        _db.ScheduledJobRecords.Add(new Domain.Entities.ScheduledJobRecord
        {
            EntityType = entityType,
            EntityId = entityId,
            JobType = jobType,
            HangfireJobId = hangfireJobId,
            ScheduledForUtc = scheduledForUtc
        });
        await _db.SaveChangesAsync(ct);
    }

    private static DateTime NormalizeUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
}

public sealed class ReminderBackgroundJobWorker
{
    private readonly DarcomDbContext _db;
    private readonly EmailBackgroundJobWorker _emailWorker;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly HangfireOptions _options;
    private readonly ILogger<ReminderBackgroundJobWorker> _logger;

    public ReminderBackgroundJobWorker(
        DarcomDbContext db,
        EmailBackgroundJobWorker emailWorker,
        IAdminRealtimeNotifier notifier,
        IOptions<HangfireOptions> options,
        ILogger<ReminderBackgroundJobWorker> logger)
    {
        _db = db;
        _emailWorker = emailWorker;
        _notifier = notifier;
        _options = options.Value;
        _logger = logger;
    }

    [Queue("emails")]
    public async Task SendBookingReminderAsync(int bookingId, string kind, CancellationToken ct = default)
    {
        var booking = await _db.BookingRequests
            .AsNoTracking()
            .Include(b => b.Property)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

        var jobType = kind == "end" ? "booking.reminder.end" : "booking.reminder.start";
        if (booking is null || booking.Status != RequestStatus.Approved || !booking.StartDate.HasValue)
        {
            _logger.LogInformation("Skipping booking reminder for #{BookingId} ({Kind}) because status is no longer Approved.", bookingId, kind);
            await MarkExecutedAsync("BookingRequest", bookingId, jobType, ct);
            return;
        }

        if (kind == "end" && !booking.EndDate.HasValue)
        {
            await MarkExecutedAsync("BookingRequest", bookingId, jobType, ct);
            return;
        }

        var hasActiveSchedule = await _db.ScheduledJobRecords.AnyAsync(
            r => r.EntityType == "BookingRequest" && r.EntityId == bookingId && r.JobType == jobType && !r.IsCancelled,
            ct);
        var anyTracked = await _db.ScheduledJobRecords.AnyAsync(
            r => r.EntityType == "BookingRequest" && r.EntityId == bookingId && r.JobType == jobType,
            ct);
        if (anyTracked && !hasActiveSchedule)
        {
            _logger.LogInformation("Skipping cancelled booking reminder for #{BookingId} ({Kind}).", bookingId, kind);
            return;
        }

        var tz = HangfireBackgroundJobService.ResolveTimeZone(_options.TimeZoneId);
        var targetDate = kind == "end" ? booking.EndDate!.Value : booking.StartDate.Value;
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(targetDate, DateTimeKind.Utc), tz);

        var subject = kind == "end"
            ? $"تذكير بانتهاء فترة الإيجار ({booking.RequestNumber}) | Darcom"
            : $"تذكير باقتراب موعد الإيجار ({booking.RequestNumber}) | Darcom";
        var details = kind == "end"
            ? $"نذكركم بأن فترة إيجار الوحدة \"{booking.Property?.Title}\" ستنتهي بتاريخ {localDate:yyyy-MM-dd HH:mm} بتوقيت القاهرة."
            : $"نذكركم باقتراب موعد بدء إيجار الوحدة \"{booking.Property?.Title}\" بتاريخ {localDate:yyyy-MM-dd HH:mm} بتوقيت القاهرة.";

        var dispatchKey = $"reminder:booking:{bookingId}:{kind}:{targetDate:yyyyMMddHHmm}";
        await _emailWorker.ExecuteIdempotentEmailAsync(
            dispatchKey,
            booking.Email,
            subject,
            EmailTemplates.BuildReminderHtml(booking.FullName, subject, details),
            ct);

        await MarkExecutedAsync("BookingRequest", bookingId, jobType, ct);
    }

    [Queue("emails")]
    public async Task SendViewingReminderAsync(int listingRequestId, int hoursBefore, CancellationToken ct = default)
    {
        var req = await _db.PropertyListingRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Village)
            .FirstOrDefaultAsync(r => r.Id == listingRequestId, ct);

        var jobType = $"viewing.reminder.{hoursBefore}h";
        if (req is null || req.Status != ListingRequestStatus.InspectionScheduled || !req.InspectionDate.HasValue)
        {
            _logger.LogInformation("Skipping viewing reminder for ListingRequest #{Id} because status is no longer InspectionScheduled.", listingRequestId);
            await MarkExecutedAsync("PropertyListingRequest", listingRequestId, jobType, ct);
            return;
        }

        var hasActiveSchedule = await _db.ScheduledJobRecords.AnyAsync(
            r => r.EntityType == "PropertyListingRequest" && r.EntityId == listingRequestId && r.JobType == jobType && !r.IsCancelled,
            ct);
        var anyTracked = await _db.ScheduledJobRecords.AnyAsync(
            r => r.EntityType == "PropertyListingRequest" && r.EntityId == listingRequestId && r.JobType == jobType,
            ct);
        if (anyTracked && !hasActiveSchedule)
        {
            _logger.LogInformation("Skipping cancelled viewing reminder for ListingRequest #{Id}.", listingRequestId);
            return;
        }

        var tz = HangfireBackgroundJobService.ResolveTimeZone(_options.TimeZoneId);
        var localTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(req.InspectionDate.Value, DateTimeKind.Utc), tz);

        if (req.User is not null && !string.IsNullOrWhiteSpace(req.User.Email))
        {
            var subject = $"تذكير بموعد المعاينة ({req.RequestNumber}) | Darcom";
            var details = $"موعد معاينة العقار في {req.Village?.Name} (مبنى {req.BuildingNumber} - وحدة {req.UnitNumber}) مقرر بتاريخ {localTime:yyyy-MM-dd HH:mm} (خلال {hoursBefore} ساعة).";
            var dispatchKey = $"reminder:viewing:{listingRequestId}:{hoursBefore}h:{req.InspectionDate.Value:yyyyMMddHHmm}";

            await _emailWorker.ExecuteIdempotentEmailAsync(
                dispatchKey,
                req.User.Email,
                subject,
                EmailTemplates.BuildReminderHtml(req.User.FullName, subject, details),
                ct);
        }

        // Notify admins cleanly (persisted + SignalR with EventKey deduplication)
        await _notifier.NotifyAdminsAsync(
            "viewing.reminder",
            "Upcoming Inspection Reminder",
            $"Inspection for listing request {req.RequestNumber} starts in ~{hoursBefore}h ({localTime:yyyy-MM-dd HH:mm}).",
            relatedEntityId: req.Id,
            relatedEntityType: "PropertyListingRequest",
            eventKey: $"viewing-reminder:{listingRequestId}:{hoursBefore}h:{req.InspectionDate.Value:yyyyMMddHHmm}",
            ct: ct);

        await MarkExecutedAsync("PropertyListingRequest", listingRequestId, jobType, ct);
    }

    private async Task MarkExecutedAsync(string entityType, int entityId, string jobType, CancellationToken ct)
    {
        var pending = await _db.ScheduledJobRecords
            .Where(r => r.EntityType == entityType && r.EntityId == entityId && r.JobType == jobType && !r.IsCancelled && !r.IsExecuted)
            .ToListAsync(ct);

        if (pending.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var rec in pending)
        {
            rec.IsExecuted = true;
            rec.ExecutedAt = now;
            rec.UpdatedAt = now;
        }
        await _db.SaveChangesAsync(ct);
    }
}

