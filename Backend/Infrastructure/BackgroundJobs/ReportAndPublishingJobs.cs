using Application.BackgroundJobs;
using Application.Services;
using Domain.Enums;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.BackgroundJobs;

/// <summary>
/// Generates a daily analytics report for Admins using aggregate SQL Count queries
/// (never materializing full entity collections in memory).
/// </summary>
public sealed class DailyReportJob
{
    private readonly DarcomDbContext _db;
    private readonly EmailBackgroundJobWorker _emailWorker;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly HangfireOptions _options;
    private readonly ILogger<DailyReportJob> _logger;

    public DailyReportJob(
        DarcomDbContext db,
        EmailBackgroundJobWorker emailWorker,
        IAdminRealtimeNotifier notifier,
        IOptions<HangfireOptions> options,
        ILogger<DailyReportJob> logger)
    {
        _db = db;
        _emailWorker = emailWorker;
        _notifier = notifier;
        _options = options.Value;
        _logger = logger;
    }

    [Queue("maintenance")]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var tz = HangfireBackgroundJobService.ResolveTimeZone(_options.TimeZoneId);
        var nowUtc = DateTime.UtcNow;
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

        var localTodayStart = nowLocal.Date;
        var localYesterdayStart = localTodayStart.AddDays(-1);
        var fromUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localYesterdayStart, DateTimeKind.Unspecified), tz);
        var toUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localTodayStart, DateTimeKind.Unspecified), tz);

        var newSaleCount = await _db.Properties.AsNoTracking()
            .CountAsync(p => p.Purpose == PropertyPurpose.Sale && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc, ct);
        var newRentCount = await _db.Properties.AsNoTracking()
            .CountAsync(p => p.Purpose == PropertyPurpose.Rent && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc, ct);
        var bookingRequestsCount = await _db.BookingRequests.AsNoTracking()
            .CountAsync(b => b.CreatedAt >= fromUtc && b.CreatedAt < toUtc, ct);
        var confirmedBookingsCount = await _db.RentalPeriods.AsNoTracking()
            .CountAsync(r => r.CreatedAt >= fromUtc && r.CreatedAt < toUtc, ct);
        var viewingRequestsCount =
            await _db.PropertyListingRequests.AsNoTracking().CountAsync(l => l.CreatedAt >= fromUtc && l.CreatedAt < toUtc, ct)
            + await _db.PropertyRequirements.AsNoTracking().CountAsync(r => r.CreatedAt >= fromUtc && r.CreatedAt < toUtc, ct);
        var inquiriesCount = await _db.PropertyInquiries.AsNoTracking()
            .CountAsync(i => i.CreatedAt >= fromUtc && i.CreatedAt < toUtc, ct);
        var brokerRegistrationsCount = await _db.BrokerProfiles.AsNoTracking()
            .CountAsync(b => b.CreatedAt >= fromUtc && b.CreatedAt < toUtc, ct);

        var reportDateKey = localYesterdayStart.ToString("yyyy-MM-dd");
        var summaryMessage =
            $"Daily Report ({reportDateKey}): Sale={newSaleCount}, Rent={newRentCount}, Bookings={bookingRequestsCount} (Confirmed={confirmedBookingsCount}), Viewings={viewingRequestsCount}, Inquiries={inquiriesCount}, Brokers={brokerRegistrationsCount}.";

        await _notifier.NotifyAdminsAsync(
            "daily.report.ready",
            $"Daily Summary Report ({reportDateKey})",
            summaryMessage,
            relatedEntityType: "DailyReport",
            eventKey: $"daily-report:{reportDateKey}",
            ct: ct);

        var recipient = _options.DailyReportRecipientEmail;
        if (string.IsNullOrWhiteSpace(recipient))
        {
            var adminRoleId = await _db.Roles
                .Where(r => r.Name == "Admin")
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(ct);

            if (adminRoleId.HasValue)
            {
                recipient = await _db.UserRoles
                    .Where(ur => ur.RoleId == adminRoleId.Value)
                    .Join(_db.Users.Where(u => u.IsActive && u.Email != null),
                        ur => ur.UserId,
                        u => u.Id,
                        (_, u) => u.Email)
                    .FirstOrDefaultAsync(ct);
            }
        }

        if (!string.IsNullOrWhiteSpace(recipient))
        {
            var html = EmailTemplates.BuildDailyReportHtml(
                localYesterdayStart,
                newSaleCount,
                newRentCount,
                bookingRequestsCount,
                confirmedBookingsCount,
                viewingRequestsCount,
                inquiriesCount,
                brokerRegistrationsCount);

            await _emailWorker.ExecuteIdempotentEmailAsync(
                $"email:daily-report:{reportDateKey}",
                recipient,
                $"التقرير اليومي لمنصة داركم ({reportDateKey})",
                html,
                ct);
        }

        _logger.LogInformation("DailyReportJob completed for {ReportDate}.", reportDateKey);
    }
}

/// <summary>
/// Publishes scheduled properties when PublishAt <= UtcNow and archives expired properties when ExpiresAt <= UtcNow.
/// </summary>
public sealed class ScheduledPropertyPublishingJob
{
    private readonly DarcomDbContext _db;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly ILogger<ScheduledPropertyPublishingJob> _logger;

    public ScheduledPropertyPublishingJob(
        DarcomDbContext db,
        IAdminRealtimeNotifier notifier,
        ILogger<ScheduledPropertyPublishingJob> logger)
    {
        _db = db;
        _notifier = notifier;
        _logger = logger;
    }

    [Queue("maintenance")]
    public async Task<int> ExecuteAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var changed = 0;

        var toPublish = await _db.Properties
            .Where(p => (p.Status == PropertyStatus.Draft || p.Status == PropertyStatus.PendingReview)
                && p.PublishAt != null
                && p.PublishAt <= now
                && (p.ExpiresAt == null || p.ExpiresAt > now))
            .ToListAsync(ct);

        foreach (var prop in toPublish)
        {
            prop.Status = PropertyStatus.Published;
            prop.UpdatedAt = now;
            changed++;
        }

        var toArchive = await _db.Properties
            .Where(p => (p.Status == PropertyStatus.Published || p.Status == PropertyStatus.Featured)
                && p.ExpiresAt != null
                && p.ExpiresAt <= now)
            .ToListAsync(ct);

        foreach (var prop in toArchive)
        {
            prop.Status = PropertyStatus.Archived;
            prop.UpdatedAt = now;
            changed++;
        }

        if (changed == 0)
            return 0;

        await _db.SaveChangesAsync(ct);

        foreach (var prop in toPublish)
        {
            await _notifier.NotifyAdminsAsync(
                "property.status.changed",
                "Scheduled Property Published",
                $"Property '{prop.Title}' ({prop.ReferenceNumber}) was automatically published.",
                relatedEntityId: prop.Id,
                relatedEntityType: "Property",
                eventKey: $"property:auto-publish:{prop.Id}:{prop.PublishAt:yyyyMMddHHmm}",
                ct: ct);
        }

        foreach (var prop in toArchive)
        {
            await _notifier.NotifyAdminsAsync(
                "property.status.changed",
                "Expired Property Archived",
                $"Property '{prop.Title}' ({prop.ReferenceNumber}) expired and was archived automatically.",
                relatedEntityId: prop.Id,
                relatedEntityType: "Property",
                eventKey: $"property:auto-archive:{prop.Id}:{prop.ExpiresAt:yyyyMMddHHmm}",
                ct: ct);
        }

        _logger.LogInformation("ScheduledPropertyPublishingJob published {Published}, archived {Archived} properties.",
            toPublish.Count, toArchive.Count);

        return changed;
    }
}

