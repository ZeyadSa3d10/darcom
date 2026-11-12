using Application.BackgroundJobs;
using Application.Services;
using Domain.Entities;
using Domain.Enums;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.BackgroundJobs;

/// <summary>
/// Recurring maintenance jobs:
/// 1) Pending requests aging alerts for Admins (Booking, Listing, Viewing Requirements, Inquiries, Brokers).
/// 2) Expired OTP & Refresh Token retention cleanup without deleting active records.
/// 3) Daily Admin analytics report & Scheduled Property Publishing.
/// </summary>
public sealed class PendingRequestsMonitorJob
{
    private readonly DarcomDbContext _db;
    private readonly IAdminRealtimeNotifier _notifier;
    private readonly HangfireOptions _options;
    private readonly ILogger<PendingRequestsMonitorJob> _logger;

    public PendingRequestsMonitorJob(
        DarcomDbContext db,
        IAdminRealtimeNotifier notifier,
        IOptions<HangfireOptions> options,
        ILogger<PendingRequestsMonitorJob> logger)
    {
        _db = db;
        _notifier = notifier;
        _options = options.Value;
        _logger = logger;
    }

    [Queue("maintenance")]
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var alertHours = Math.Max(1, _options.PendingRequestAlertHours);
        var escalationHours = Math.Max(alertHours + 1, _options.PendingRequestEscalationHours);
        var now = DateTime.UtcNow;
        var alertCutoff = now.AddHours(-alertHours);
        var escalationCutoff = now.AddHours(-escalationHours);

        var sentAlerts = 0;

        // 1. Pending Booking Requests
        var bookings = await _db.BookingRequests
            .AsNoTracking()
            .Where(b => b.Status == RequestStatus.Pending && b.CreatedAt <= alertCutoff)
            .Select(b => new { b.Id, b.RequestNumber, b.CreatedAt })
            .ToListAsync(ct);

        foreach (var b in bookings)
        {
            var isEscalation = b.CreatedAt <= escalationCutoff;
            var tier = isEscalation ? "escalation" : "alert";
            var hrs = isEscalation ? escalationHours : alertHours;
            await _notifier.NotifyAdminsAsync(
                "pending.request.alert",
                isEscalation ? "Escalation: Pending Booking Request" : "Pending Booking Request Reminder",
                $"Booking {b.RequestNumber} has remained pending for more than {hrs} hours.",
                relatedEntityId: b.Id,
                relatedEntityType: "BookingRequest",
                eventKey: $"pending-monitor:BookingRequest:{b.Id}:{tier}",
                ct: ct);
            sentAlerts++;
        }

        // 2. Pending Property Listing Requests
        var listings = await _db.PropertyListingRequests
            .AsNoTracking()
            .Where(r => r.Status == ListingRequestStatus.Pending && r.CreatedAt <= alertCutoff)
            .Select(r => new { r.Id, r.RequestNumber, r.CreatedAt })
            .ToListAsync(ct);

        foreach (var l in listings)
        {
            var isEscalation = l.CreatedAt <= escalationCutoff;
            var tier = isEscalation ? "escalation" : "alert";
            var hrs = isEscalation ? escalationHours : alertHours;
            await _notifier.NotifyAdminsAsync(
                "pending.request.alert",
                isEscalation ? "Escalation: Pending Listing Request" : "Pending Listing Request Reminder",
                $"Listing request {l.RequestNumber} has remained pending for more than {hrs} hours.",
                relatedEntityId: l.Id,
                relatedEntityType: "PropertyListingRequest",
                eventKey: $"pending-monitor:PropertyListingRequest:{l.Id}:{tier}",
                ct: ct);
            sentAlerts++;
        }

        // 3. Pending Property Requirements (Viewing / Custom Leads)
        var requirements = await _db.PropertyRequirements
            .AsNoTracking()
            .Where(r => r.Status == RequestStatus.Pending && r.CreatedAt <= alertCutoff)
            .Select(r => new { r.Id, r.CreatedAt })
            .ToListAsync(ct);

        foreach (var r in requirements)
        {
            var isEscalation = r.CreatedAt <= escalationCutoff;
            var tier = isEscalation ? "escalation" : "alert";
            var hrs = isEscalation ? escalationHours : alertHours;
            await _notifier.NotifyAdminsAsync(
                "pending.request.alert",
                isEscalation ? "Escalation: Pending Viewing Requirement" : "Pending Viewing Requirement Reminder",
                $"Customer requirement #{r.Id} has remained pending for more than {hrs} hours.",
                relatedEntityId: r.Id,
                relatedEntityType: "PropertyRequirement",
                eventKey: $"pending-monitor:PropertyRequirement:{r.Id}:{tier}",
                ct: ct);
            sentAlerts++;
        }

        // 4. Unread Inquiries
        var inquiries = await _db.PropertyInquiries
            .AsNoTracking()
            .Where(i => !i.IsRead && i.CreatedAt <= alertCutoff)
            .Select(i => new { i.Id, i.PropertyId, i.CreatedAt })
            .ToListAsync(ct);

        foreach (var i in inquiries)
        {
            var isEscalation = i.CreatedAt <= escalationCutoff;
            var tier = isEscalation ? "escalation" : "alert";
            var hrs = isEscalation ? escalationHours : alertHours;
            await _notifier.NotifyAdminsAsync(
                "pending.request.alert",
                isEscalation ? "Escalation: Unread Property Inquiry" : "Unread Property Inquiry Reminder",
                $"Inquiry #{i.Id} (Property #{i.PropertyId}) has remained unread for more than {hrs} hours.",
                relatedEntityId: i.Id,
                relatedEntityType: "PropertyInquiry",
                eventKey: $"pending-monitor:PropertyInquiry:{i.Id}:{tier}",
                ct: ct);
            sentAlerts++;
        }

        // 5. Pending Broker Registrations
        var brokers = await _db.BrokerProfiles
            .AsNoTracking()
            .Where(b => b.Status == BrokerStatus.Pending && b.CreatedAt <= alertCutoff)
            .Select(b => new { b.Id, b.CreatedAt })
            .ToListAsync(ct);

        foreach (var br in brokers)
        {
            var isEscalation = br.CreatedAt <= escalationCutoff;
            var tier = isEscalation ? "escalation" : "alert";
            var hrs = isEscalation ? escalationHours : alertHours;
            await _notifier.NotifyAdminsAsync(
                "pending.request.alert",
                isEscalation ? "Escalation: Pending Broker Approval" : "Pending Broker Registration Reminder",
                $"Broker registration #{br.Id} has been awaiting approval for more than {hrs} hours.",
                relatedEntityId: br.Id,
                relatedEntityType: "BrokerProfile",
                eventKey: $"pending-monitor:BrokerProfile:{br.Id}:{tier}",
                ct: ct);
            sentAlerts++;
        }

        _logger.LogInformation("PendingRequestsMonitorJob checked overdue items; alerts processed: {Count}.", sentAlerts);
    }
}

public sealed class SecurityCleanupJob
{
    private readonly DarcomDbContext _db;
    private readonly HangfireOptions _options;
    private readonly ILogger<SecurityCleanupJob> _logger;

    public SecurityCleanupJob(
        DarcomDbContext db,
        IOptions<HangfireOptions> options,
        ILogger<SecurityCleanupJob> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    [Queue("maintenance")]
    public async Task<int> CleanupExpiredOtpsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var retentionCutoff = now.AddHours(-Math.Max(1, _options.OtpRetentionHours));

        // Never delete still-active unused OTPs; only purge expired or used OTPs older than retention cutoff.
        var query = _db.EmailOtpCodes.Where(o =>
            (o.IsUsed && (o.UsedAt ?? o.CreatedAt) <= retentionCutoff)
            || (o.ExpiresAt <= retentionCutoff));

        int deleted;
        if (_db.Database.IsRelational())
        {
            deleted = await query.ExecuteDeleteAsync(ct);
        }
        else
        {
            var rows = await query.ToListAsync(ct);
            deleted = rows.Count;
            if (deleted > 0)
            {
                _db.EmailOtpCodes.RemoveRange(rows);
                await _db.SaveChangesAsync(ct);
            }
        }

        _logger.LogInformation("OTP cleanup purged {Count} expired/used records older than {Cutoff:u}.", deleted, retentionCutoff);
        return deleted;
    }

    [Queue("maintenance")]
    public async Task<int> CleanupExpiredRefreshTokensAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var retentionCutoff = now.AddDays(-Math.Max(1, _options.RefreshTokenRetentionDays));

        // Preserve active tokens AND recently revoked tokens within security audit retention window.
        var query = _db.UserRefreshTokens.Where(t =>
            t.ExpiresAt <= retentionCutoff
            || (t.RevokedAt != null && t.RevokedAt <= retentionCutoff));

        int deleted;
        if (_db.Database.IsRelational())
        {
            deleted = await query.ExecuteDeleteAsync(ct);
        }
        else
        {
            var rows = await query.ToListAsync(ct);
            deleted = rows.Count;
            if (deleted > 0)
            {
                _db.UserRefreshTokens.RemoveRange(rows);
                await _db.SaveChangesAsync(ct);
            }
        }

        _logger.LogInformation("Refresh token cleanup purged {Count} expired/revoked tokens older than {Cutoff:u}.", deleted, retentionCutoff);
        return deleted;
    }
}

