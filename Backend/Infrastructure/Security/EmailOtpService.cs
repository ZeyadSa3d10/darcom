using System.Security.Cryptography;
using System.Text;
using Application.BackgroundJobs;
using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Services;
using Domain.Entities;
using Infrastructure.BackgroundJobs;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Security;

public sealed class EmailOtpService : IEmailOtpService
{
    private readonly DarcomDbContext _db;
    private readonly EmailOtpOptions _options;
    private readonly JwtOptions _jwtOptions;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<EmailOtpService> _logger;
    private readonly IEmailJobService? _emailJobs;
    private readonly ITimeLimitedDataProtector? _otpProtector;
    private readonly SmtpOptions? _smtpOptions;

    public EmailOtpService(
        DarcomDbContext db,
        IOptions<EmailOtpOptions> options,
        IOptions<JwtOptions> jwtOptions,
        IEmailSender emailSender,
        ILogger<EmailOtpService> logger,
        IEmailJobService? emailJobs = null,
        IDataProtectionProvider? dataProtection = null,
        IOptions<SmtpOptions>? smtpOptions = null)
    {
        _db = db;
        _options = options.Value;
        _jwtOptions = jwtOptions.Value;
        _emailSender = emailSender;
        _logger = logger;
        _emailJobs = emailJobs;
        _otpProtector = dataProtection?.CreateProtector(EmailBackgroundJobWorker.OtpProtectorPurpose).ToTimeLimitedDataProtector();
        _smtpOptions = smtpOptions?.Value;
    }

    public async Task<ServiceResult<SendEmailOtpResponse>> SendOtpAsync(
        string email,
        string? ipAddress,
        bool isDevelopment,
        CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToUpperInvariant();
        var cleanEmail = email.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        var cooldown = Math.Max(15, _options.ResendCooldownSeconds);
        var expiryMinutes = Math.Clamp(_options.ExpiryMinutes, 1, 30);
        var maxAttempts = Math.Clamp(_options.MaxAttempts, 3, 10);

        // Enforce resend cooldown per email address
        var latestOtp = await _db.EmailOtpCodes
            .Where(o => o.NormalizedEmail == normalizedEmail)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (latestOtp is not null)
        {
            var elapsed = (now - latestOtp.CreatedAt).TotalSeconds;
            if (elapsed < cooldown)
            {
                var remaining = (int)Math.Ceiling(cooldown - elapsed);
                return ServiceResult<SendEmailOtpResponse>.Fail(
                    $"يرجى الانتظار {remaining} ثانية قبل طلب رمز جديد.",
                    429,
                    new() { new($"Please wait {remaining} seconds before requesting another code.", "email") });
            }
        }

        // Invalidate any previous unused OTPs for this email (single active OTP at a time)
        var previousUnused = await _db.EmailOtpCodes
            .Where(o => o.NormalizedEmail == normalizedEmail && !o.IsUsed)
            .ToListAsync(ct);

        foreach (var prev in previousUnused)
        {
            prev.IsUsed = true;
            prev.UsedAt = now;
        }

        // Generate cryptographically secure 6-digit code
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var salt = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));
        var codeHash = ComputeHash(normalizedEmail, code, salt);

        var otpEntity = new EmailOtpCode
        {
            NormalizedEmail = normalizedEmail,
            CodeHash = codeHash,
            Salt = salt,
            ExpiresAt = now.AddMinutes(expiryMinutes),
            AttemptCount = 0,
            MaxAttempts = maxAttempts,
            IsUsed = false,
            RequestIp = ipAddress,
            CreatedAt = now
        };

        await _db.EmailOtpCodes.AddAsync(otpEntity, ct);
        await _db.SaveChangesAsync(ct);

        if (_emailJobs is not null && _otpProtector is not null)
        {
            // Never pass plaintext OTP into Hangfire Job Arguments or SQL storage.
            var protectedCode = _otpProtector.Protect(code, TimeSpan.FromMinutes(expiryMinutes));
            await _emailJobs.EnqueueOtpEmailAsync(otpEntity.Id, cleanEmail, protectedCode, ct);

            var hasSmtpConfigured = _smtpOptions is not null
                && !string.IsNullOrWhiteSpace(_smtpOptions.Host)
                && !string.IsNullOrWhiteSpace(_smtpOptions.FromEmail);

            if (!hasSmtpConfigured && isDevelopment)
            {
                _logger.LogInformation("DEV-ONLY Email OTP issued for {Email} (SMTP unconfigured).", cleanEmail);
            }

            var queuedResponse = new SendEmailOtpResponse(
                cooldown,
                expiryMinutes,
                (!hasSmtpConfigured && isDevelopment) ? code : null);

            return ServiceResult<SendEmailOtpResponse>.Ok(
                queuedResponse,
                "تم تسجيل طلب إرسال رمز التحقق وسيصلك عبر البريد الإلكتروني خلال لحظات.");
        }

        var htmlBody = EmailTemplates.BuildOtpHtml(code, expiryMinutes);
        var sentOverSmtp = false;
        try
        {
            sentOverSmtp = await _emailSender.SendEmailAsync(
                cleanEmail,
                "رمز التحقق لتسجيل الدخول في داركم | Darcom Verification Code",
                htmlBody,
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP email to {Email}.", cleanEmail);
            if (!isDevelopment)
            {
                return ServiceResult<SendEmailOtpResponse>.Fail(
                    "تعذر إرسال البريد الإلكتروني في الوقت الحالي. يرجى المحاولة لاحقاً.",
                    503);
            }
        }

        if (!sentOverSmtp && isDevelopment)
        {
            _logger.LogInformation("DEV-ONLY Email OTP for {Email}: {Code}", cleanEmail, code);
        }

        var response = new SendEmailOtpResponse(
            cooldown,
            expiryMinutes,
            (!sentOverSmtp && isDevelopment) ? code : null);

        return ServiceResult<SendEmailOtpResponse>.Ok(
            response,
            "تم تسجيل طلب إرسال رمز التحقق بنجاح.");
    }

    public async Task<ServiceResult<object?>> VerifyOtpAsync(
        string email,
        string code,
        CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToUpperInvariant();
        var normalizedCode = PhoneNormalizer.NormalizeDigits(code).Trim();
        var now = DateTime.UtcNow;

        var record = await _db.EmailOtpCodes
            .Where(o => o.NormalizedEmail == normalizedEmail && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (record is null)
            return ServiceResult<object?>.Fail("رمز التحقق غير صحيح أو منتهي الصلاحية.", 422,
                new() { new("Invalid or expired verification code.", "code") });

        if (record.ExpiresAt <= now)
        {
            record.IsUsed = true;
            record.UsedAt = now;
            await _db.SaveChangesAsync(ct);
            return ServiceResult<object?>.Fail("انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.", 422,
                new() { new("Verification code has expired.", "code") });
        }

        if (record.AttemptCount >= record.MaxAttempts)
        {
            record.IsUsed = true;
            record.UsedAt = now;
            await _db.SaveChangesAsync(ct);
            return ServiceResult<object?>.Fail("تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.", 429,
                new() { new("Maximum verification attempts exceeded.", "code") });
        }

        var candidateHash = ComputeHash(normalizedEmail, normalizedCode, record.Salt);
        var expectedBytes = Convert.FromBase64String(record.CodeHash);
        var actualBytes = Convert.FromBase64String(candidateHash);

        if (!CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes))
        {
            record.AttemptCount += 1;
            if (record.AttemptCount >= record.MaxAttempts)
            {
                record.IsUsed = true;
                record.UsedAt = now;
            }
            await _db.SaveChangesAsync(ct);
            return ServiceResult<object?>.Fail("رمز التحقق غير صحيح.", 422,
                new() { new("Invalid verification code.", "code") });
        }

        // Single-use invalidation
        record.IsUsed = true;
        record.UsedAt = now;
        await _db.SaveChangesAsync(ct);

        return ServiceResult<object?>.Ok(null, "Verified.");
    }

    private string ComputeHash(string normalizedEmail, string code, string salt)
    {
        var pepper = !string.IsNullOrWhiteSpace(_options.SecretPepper)
            ? _options.SecretPepper
            : _jwtOptions.Key;
        var keyBytes = Encoding.UTF8.GetBytes(pepper ?? string.Empty);
        var payload = Encoding.UTF8.GetBytes($"{normalizedEmail}:{salt}:{code}");
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToBase64String(hmac.ComputeHash(payload));
    }
}

