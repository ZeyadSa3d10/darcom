using Application.BackgroundJobs;
using Application.Security;
using Application.Services;
using Domain.Entities;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.BackgroundJobs;

/// <summary>
/// Hangfire producer service enqueuing idempotent email jobs on dedicated queues.
/// Never stores plaintext passwords, tokens, or OTPs in job arguments.
/// </summary>
public sealed class HangfireEmailJobService : IEmailJobService
{
    private readonly IBackgroundJobService _jobs;

    public HangfireEmailJobService(IBackgroundJobService jobs) => _jobs = jobs;

    public Task EnqueueOtpEmailAsync(int otpRecordId, string toEmail, string protectedPayload, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendOtpEmailAsync(otpRecordId, toEmail, protectedPayload, CancellationToken.None),
            queue: "critical");
        return Task.CompletedTask;
    }

    public Task EnqueueWelcomeEmailAsync(int userId, string toEmail, string fullName, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendWelcomeEmailAsync(userId, toEmail, fullName, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }

    public Task EnqueueBookingCreatedEmailAsync(int bookingId, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendBookingCreatedEmailAsync(bookingId, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }

    public Task EnqueueBookingStatusEmailAsync(int bookingId, string status, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendBookingStatusEmailAsync(bookingId, status, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }

    public Task EnqueueListingRequestStatusEmailAsync(int listingRequestId, string status, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendListingRequestStatusEmailAsync(listingRequestId, status, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }

    public Task EnqueueBrokerStatusEmailAsync(int brokerProfileId, string status, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendBrokerStatusEmailAsync(brokerProfileId, status, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }

    public Task EnqueueRequirementConfirmationEmailAsync(int requirementId, CancellationToken ct = default)
    {
        _jobs.Enqueue<EmailBackgroundJobWorker>(
            w => w.SendRequirementConfirmationEmailAsync(requirementId, CancellationToken.None),
            queue: "emails");
        return Task.CompletedTask;
    }
}

/// <summary>
/// Worker executed by Hangfire Server. Enforces expiry checks and idempotency via JobDispatchLogs.
/// </summary>
public sealed class EmailBackgroundJobWorker
{
    public const string OtpProtectorPurpose = "Darcom.EmailOtpDispatch.v1";

    private readonly DarcomDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly ITimeLimitedDataProtector _otpProtector;
    private readonly EmailOtpOptions _otpOptions;
    private readonly ILogger<EmailBackgroundJobWorker> _logger;

    public EmailBackgroundJobWorker(
        DarcomDbContext db,
        IEmailSender emailSender,
        IDataProtectionProvider dataProtection,
        IOptions<EmailOtpOptions> otpOptions,
        ILogger<EmailBackgroundJobWorker> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _otpProtector = dataProtection.CreateProtector(OtpProtectorPurpose).ToTimeLimitedDataProtector();
        _otpOptions = otpOptions.Value;
        _logger = logger;
    }

    [Queue("critical")]
    public async Task SendOtpEmailAsync(
        int otpRecordId,
        string toEmail,
        string protectedPayload,
        CancellationToken ct = default)
    {
        var dispatchKey = $"email:otp:{otpRecordId}";
        if (await IsAlreadySentAsync(dispatchKey, ct))
            return;

        var record = await _db.EmailOtpCodes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == otpRecordId, ct);
        if (record is null || record.IsUsed || record.ExpiresAt <= DateTime.UtcNow)
        {
            await MarkSkippedAsync(dispatchKey, "Email", "OTP record is expired, used, or missing.", ct);
            _logger.LogWarning("Skipping expired/used OTP email dispatch for record #{OtpRecordId}.", otpRecordId);
            return;
        }

        string code;
        try
        {
            code = _otpProtector.Unprotect(protectedPayload);
        }
        catch (Exception ex)
        {
            await MarkSkippedAsync(dispatchKey, "Email", "Protected OTP dispatch payload expired or invalid.", ct);
            _logger.LogWarning(ex, "Skipping expired/invalid protected OTP dispatch payload for record #{OtpRecordId}.", otpRecordId);
            return;
        }

        var expiryMinutes = Math.Clamp(_otpOptions.ExpiryMinutes, 1, 30);
        var html = EmailTemplates.BuildOtpHtml(code, expiryMinutes);

        await ExecuteIdempotentEmailAsync(
            dispatchKey,
            toEmail,
            "رمز التحقق لتسجيل الدخول في داركم | Darcom Verification Code",
            html,
            ct);
    }

    [Queue("emails")]
    public async Task SendWelcomeEmailAsync(int userId, string toEmail, string fullName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:welcome:{userId}",
            toEmail,
            "مرحباً بك في داركم | Welcome to Darcom",
            EmailTemplates.BuildWelcomeHtml(fullName),
            ct);
    }

    [Queue("emails")]
    public async Task SendBookingCreatedEmailAsync(int bookingId, CancellationToken ct = default)
    {
        var booking = await _db.BookingRequests
            .AsNoTracking()
            .Include(b => b.Property)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

        if (booking is null || string.IsNullOrWhiteSpace(booking.Email))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:booking-created:{bookingId}",
            booking.Email,
            $"تم استلام طلب الحجز {booking.RequestNumber} | Darcom",
            EmailTemplates.BuildBookingCreatedHtml(
                booking.FullName, booking.RequestNumber, booking.Property?.Title ?? "Property",
                booking.StartDate, booking.EndDate),
            ct);
    }

    [Queue("emails")]
    public async Task SendBookingStatusEmailAsync(int bookingId, string status, CancellationToken ct = default)
    {
        var booking = await _db.BookingRequests
            .AsNoTracking()
            .Include(b => b.Property)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

        if (booking is null || string.IsNullOrWhiteSpace(booking.Email))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:booking-status:{bookingId}:{status.Trim().ToLowerInvariant()}",
            booking.Email,
            $"تحديث حالة طلب الحجز {booking.RequestNumber} | Darcom",
            EmailTemplates.BuildBookingStatusHtml(
                booking.FullName, booking.RequestNumber, booking.Property?.Title ?? "Property", status),
            ct);
    }

    [Queue("emails")]
    public async Task SendListingRequestStatusEmailAsync(int listingRequestId, string status, CancellationToken ct = default)
    {
        var req = await _db.PropertyListingRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Village)
            .FirstOrDefaultAsync(r => r.Id == listingRequestId, ct);

        if (req?.User is null || string.IsNullOrWhiteSpace(req.User.Email))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:listing-status:{listingRequestId}:{status.Trim().ToLowerInvariant()}",
            req.User.Email,
            $"تحديث طلب عرض العقار {req.RequestNumber} | Darcom",
            EmailTemplates.BuildListingRequestStatusHtml(
                req.User.FullName, req.RequestNumber, req.Village?.Name ?? string.Empty, status, req.InspectionDate),
            ct);
    }

    [Queue("emails")]
    public async Task SendBrokerStatusEmailAsync(int brokerProfileId, string status, CancellationToken ct = default)
    {
        var profile = await _db.BrokerProfiles
            .AsNoTracking()
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == brokerProfileId, ct);

        if (profile?.User is null || string.IsNullOrWhiteSpace(profile.User.Email))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:broker-status:{brokerProfileId}:{status.Trim().ToLowerInvariant()}",
            profile.User.Email,
            "تحديث حالة تسجيل الوسيط | Darcom Broker Status",
            EmailTemplates.BuildBrokerStatusHtml(profile.User.FullName, status, profile.AdminNotes),
            ct);
    }

    [Queue("emails")]
    public async Task SendRequirementConfirmationEmailAsync(int requirementId, CancellationToken ct = default)
    {
        var req = await _db.PropertyRequirements.AsNoTracking().FirstOrDefaultAsync(r => r.Id == requirementId, ct);
        if (req is null || string.IsNullOrWhiteSpace(req.CustomerEmail))
            return;

        await ExecuteIdempotentEmailAsync(
            $"email:requirement-created:{requirementId}",
            req.CustomerEmail,
            "تم استلام طلب مواصفات العقار | Darcom",
            EmailTemplates.BuildRequirementConfirmationHtml(req.CustomerName, req.Id, req.Purpose.ToString()),
            ct);
    }

    public Task<bool> ExecuteIdempotentEmailAsync(
        string dispatchKey,
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken ct = default)
        => ExecuteIdempotentAsync(dispatchKey, "Email", async innerCt =>
        {
            var sent = await _emailSender.SendEmailAsync(toEmail, subject, htmlBody, innerCt);
            if (!sent)
            {
                _logger.LogWarning("Email skipped because SMTP is not configured for {DispatchKey}.", dispatchKey);
                return DispatchOutcome.Skipped;
            }
            return DispatchOutcome.Sent;
        }, ct);

    public async Task<bool> IsAlreadySentAsync(string dispatchKey, CancellationToken ct)
        => await _db.JobDispatchLogs.AnyAsync(l => l.DispatchKey == dispatchKey && l.Status == "Sent", ct);

    private async Task MarkSkippedAsync(string dispatchKey, string category, string reason, CancellationToken ct)
    {
        var log = await _db.JobDispatchLogs.FirstOrDefaultAsync(l => l.DispatchKey == dispatchKey, ct);
        if (log is null)
        {
            log = new JobDispatchLog
            {
                DispatchKey = dispatchKey,
                Category = category,
                Status = "Skipped",
                AttemptCount = 1,
                LastError = reason,
                CompletedAt = DateTime.UtcNow
            };
            _db.JobDispatchLogs.Add(log);
        }
        else if (log.Status != "Sent")
        {
            log.Status = "Skipped";
            log.AttemptCount += 1;
            log.LastError = reason;
            log.CompletedAt = DateTime.UtcNow;
            log.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
    }

    internal enum DispatchOutcome { Sent, Skipped }

    private async Task<bool> ExecuteIdempotentAsync(
        string dispatchKey,
        string category,
        Func<CancellationToken, Task<DispatchOutcome>> action,
        CancellationToken ct)
    {
        var log = await _db.JobDispatchLogs.FirstOrDefaultAsync(l => l.DispatchKey == dispatchKey, ct);
        if (log is not null && log.Status == "Sent")
        {
            _logger.LogDebug("Skipping duplicate background dispatch for key {DispatchKey}.", dispatchKey);
            return true;
        }

        if (log is null)
        {
            log = new JobDispatchLog
            {
                DispatchKey = dispatchKey,
                Category = category,
                Status = "Pending",
                AttemptCount = 0
            };
            _db.JobDispatchLogs.Add(log);
            await _db.SaveChangesAsync(ct);
        }

        log.AttemptCount += 1;
        log.UpdatedAt = DateTime.UtcNow;

        try
        {
            var outcome = await action(ct);
            log.Status = outcome == DispatchOutcome.Sent ? "Sent" : "Skipped";
            log.CompletedAt = DateTime.UtcNow;
            log.LastError = null;
            await _db.SaveChangesAsync(ct);
            return outcome == DispatchOutcome.Sent;
        }
        catch (Exception ex)
        {
            log.Status = "Failed";
            log.LastError = ex.Message.Length > 1900 ? ex.Message[..1900] : ex.Message;
            await _db.SaveChangesAsync(ct);
            _logger.LogError(ex, "Background dispatch failed for key {DispatchKey} (attempt {Attempt}).", dispatchKey, log.AttemptCount);
            throw;
        }
    }
}

