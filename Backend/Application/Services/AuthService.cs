using Application.BackgroundJobs;
using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Storage;
using Application.Stores;
using Domain.Entities;
using Microsoft.Extensions.Options;

namespace Application.Services;

public interface IAuthService
{
    Task<ServiceResult<SendEmailOtpResponse>> SendEmailOtpAsync(SendEmailOtpRequest request, string? ipAddress, bool isDevelopment, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> VerifyEmailOtpAndSignInAsync(VerifyEmailOtpRequest request, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> GoogleLoginAsync(GoogleLoginRequest request, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> GoogleExternalLoginAsync(GoogleUserPayload payload, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> RegisterAsync(RegisterRequest request, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> RegisterBrokerAsync(RegisterBrokerDto request, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> LoginAsync(LoginRequest request, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<AuthTokenBundle>> RefreshAsync(string refreshToken, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<object?>> LogoutAsync(int userId, string? refreshToken = null, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<object?>> RevokeAllSessionsAsync(int userId, string? ipAddress = null, CancellationToken ct = default);
    Task<ServiceResult<string?>> ForgotPasswordAsync(ForgotPasswordRequest request, bool exposeToken, CancellationToken ct = default);
    Task<ServiceResult<object?>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}

public sealed class AuthService : IAuthService
{
    private readonly IAuthStore _store;
    private readonly ITokenService _tokens;
    private readonly IOtpService _phoneOtp;
    private readonly IEmailOtpService _emailOtp;
    private readonly IGoogleTokenValidator _googleValidator;
    private readonly IPrivateDocumentStorage _privateStorage;
    private readonly IAuditWriter _audit;
    private readonly JwtOptions _jwt;
    private readonly IAdminRealtimeNotifier? _notifier;
    private readonly IEmailJobService? _emailJobs;

    public AuthService(
        IAuthStore store,
        ITokenService tokens,
        IOtpService phoneOtp,
        IEmailOtpService emailOtp,
        IGoogleTokenValidator googleValidator,
        IPrivateDocumentStorage privateStorage,
        IAuditWriter audit,
        IOptions<JwtOptions> jwt,
        IAdminRealtimeNotifier? notifier = null,
        IEmailJobService? emailJobs = null)
    {
        _store = store;
        _tokens = tokens;
        _phoneOtp = phoneOtp;
        _emailOtp = emailOtp;
        _googleValidator = googleValidator;
        _privateStorage = privateStorage;
        _audit = audit;
        _jwt = jwt.Value;
        _notifier = notifier;
        _emailJobs = emailJobs;
    }

    public Task<ServiceResult<SendEmailOtpResponse>> SendEmailOtpAsync(
        SendEmailOtpRequest request,
        string? ipAddress,
        bool isDevelopment,
        CancellationToken ct = default)
        => _emailOtp.SendOtpAsync(request.Email, ipAddress, isDevelopment, ct);

    public async Task<ServiceResult<AuthTokenBundle>> VerifyEmailOtpAndSignInAsync(
        VerifyEmailOtpRequest request,
        string? ipAddress,
        CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var verifyResult = await _emailOtp.VerifyOtpAsync(email, request.Code, ct);
        if (!verifyResult.Succeeded)
            return ServiceResult<AuthTokenBundle>.Fail(verifyResult.Message, verifyResult.StatusCode, verifyResult.Errors);

        var user = await _store.FindUserByEmailAsync(email, ct);
        var isNewUser = false;

        if (user is null)
        {
            var fullName = string.IsNullOrWhiteSpace(request.FullName)
                ? DeriveNameFromEmail(email)
                : request.FullName.Trim();

            user = new User
            {
                FullName = fullName,
                Email = email,
                UserName = email,
                EmailConfirmed = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            // SECURITY: self-service OTP sign-up always assigns the least-privilege Buyer role.
            var (created, errors) = await _store.CreateUserAsync(user, null, "Buyer", ct);
            if (!created)
                return ServiceResult<AuthTokenBundle>.Fail(
                    string.Join(" ", errors), 422,
                    errors.Select(e => new ApiError(e, "email")).ToList());

            isNewUser = true;
        }
        else
        {
            if (!user.IsActive)
                return ServiceResult<AuthTokenBundle>.Unauthorized("Account is disabled.");

            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                user.UpdatedAt = DateTime.UtcNow;
                await _store.UpdateUserAsync(user, ct);
            }
        }

        var bundle = await IssueTokensAsync(user, ipAddress, ct);
        await _audit.LogAsync(user.Id, isNewUser ? "auth.otp-register" : "auth.otp-login", "User",
            user.Id.ToString(), null, email, ipAddress, ct);

        if (isNewUser && _notifier is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "user.registered",
                "New User Registered",
                $"New user '{user.FullName}' registered via Email OTP.",
                relatedEntityId: user.Id,
                relatedEntityType: "User",
                eventKey: $"user:registered:{user.Id}",
                ct: ct);
        }

        if (isNewUser && _emailJobs is not null && !string.IsNullOrWhiteSpace(user.Email))
        {
            try { await _emailJobs.EnqueueWelcomeEmailAsync(user.Id, user.Email, user.FullName, ct); }
            catch { /* Never block auth flow on background queue failure */ }
        }

        return isNewUser
            ? ServiceResult<AuthTokenBundle>.Created(bundle, "Account created and verified successfully.")
            : ServiceResult<AuthTokenBundle>.Ok(bundle, "Logged in successfully.");
    }

    public async Task<ServiceResult<AuthTokenBundle>> GoogleLoginAsync(
        GoogleLoginRequest request,
        string? ipAddress,
        CancellationToken ct = default)
    {
        var payload = await _googleValidator.ValidateAsync(request.IdToken, ct);
        if (payload is null)
            return ServiceResult<AuthTokenBundle>.Unauthorized("Invalid or unverified Google credentials.");

        return await GoogleExternalLoginAsync(payload, ipAddress, ct);
    }

    public async Task<ServiceResult<AuthTokenBundle>> GoogleExternalLoginAsync(
        GoogleUserPayload payload,
        string? ipAddress,
        CancellationToken ct = default)
    {
        if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
            return ServiceResult<AuthTokenBundle>.Unauthorized("Invalid or unverified Google credentials.");

        var email = payload.Email.Trim().ToLowerInvariant();

        // 1. Try existing external Google link first
        var user = await _store.FindUserByExternalLoginAsync("Google", payload.Subject, ct);
        var isNewUser = false;

        if (user is null)
        {
            // 2. Safe account linking: Google verified payload.EmailVerified == true
            user = await _store.FindUserByEmailAsync(email, ct);
            if (user is not null)
            {
                if (!user.IsActive)
                    return ServiceResult<AuthTokenBundle>.Unauthorized("Account is disabled.");

                if (!user.EmailConfirmed)
                {
                    user.EmailConfirmed = true;
                    user.UpdatedAt = DateTime.UtcNow;
                    await _store.UpdateUserAsync(user, ct);
                }

                await _store.AddExternalLoginAsync(user, "Google", payload.Subject, "Google", ct);
            }
            else
            {
                var fullName = string.IsNullOrWhiteSpace(payload.Name)
                    ? DeriveNameFromEmail(email)
                    : payload.Name.Trim();

                user = new User
                {
                    FullName = fullName,
                    Email = email,
                    UserName = email,
                    EmailConfirmed = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                var (created, errors) = await _store.CreateUserAsync(user, null, "Buyer", ct);
                if (!created)
                    return ServiceResult<AuthTokenBundle>.Fail(string.Join(" ", errors), 422);

                await _store.AddExternalLoginAsync(user, "Google", payload.Subject, "Google", ct);
                isNewUser = true;
            }
        }
        else if (!user.IsActive)
        {
            return ServiceResult<AuthTokenBundle>.Unauthorized("Account is disabled.");
        }

        var bundle = await IssueTokensAsync(user, ipAddress, ct);
        await _audit.LogAsync(user.Id, isNewUser ? "auth.google-register" : "auth.google-login", "User",
            user.Id.ToString(), null, email, ipAddress, ct);

        if (isNewUser && _notifier is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "user.registered",
                "New User Registered",
                $"New user '{user.FullName}' signed up with Google.",
                relatedEntityId: user.Id,
                relatedEntityType: "User",
                eventKey: $"user:registered:{user.Id}",
                ct: ct);
        }

        if (isNewUser && _emailJobs is not null && !string.IsNullOrWhiteSpace(user.Email))
        {
            try { await _emailJobs.EnqueueWelcomeEmailAsync(user.Id, user.Email, user.FullName, ct); }
            catch { /* Never block Google auth on background queue failure */ }
        }

        return ServiceResult<AuthTokenBundle>.Ok(bundle, "Logged in with Google successfully.");
    }

    public async Task<ServiceResult<AuthTokenBundle>> RegisterAsync(
        RegisterRequest request,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _store.EmailExistsAsync(email, ct))
            return ServiceResult<AuthTokenBundle>.Conflict("Email is already registered.",
                new() { new("Email is already registered.", "email") });

        var normalizedPhone = string.IsNullOrWhiteSpace(request.PhoneNumber)
            ? null
            : Common.PhoneNormalizer.Normalize(request.PhoneNumber);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            UserName = email,
            PhoneNumber = normalizedPhone,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // SECURITY: role is NEVER taken from the client — every self-registration is a Buyer.
        var (created, errors) = await _store.CreateUserAsync(user, request.Password, "Buyer", ct);
        if (!created)
            return ServiceResult<AuthTokenBundle>.Fail(
                string.Join(" ", errors), 422,
                errors.Select(e => new ApiError(e, "password")).ToList());

        var bundle = await IssueTokensAsync(user, ipAddress, ct);
        if (_notifier is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "user.registered",
                "New User Registered",
                $"New user '{user.FullName}' created an account.",
                relatedEntityId: user.Id,
                relatedEntityType: "User",
                eventKey: $"user:registered:{user.Id}",
                ct: ct);
        }
        if (_emailJobs is not null && !string.IsNullOrWhiteSpace(user.Email))
        {
            try { await _emailJobs.EnqueueWelcomeEmailAsync(user.Id, user.Email, user.FullName, ct); }
            catch { /* Never block registration on background queue failure */ }
        }
        return ServiceResult<AuthTokenBundle>.Created(bundle, "Account created successfully.");
    }

    public async Task<ServiceResult<AuthTokenBundle>> RegisterBrokerAsync(
        RegisterBrokerDto request,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var phone = Common.PhoneNormalizer.Normalize(request.PhoneNumber);
        if (string.IsNullOrWhiteSpace(phone))
            return ServiceResult<AuthTokenBundle>.Fail("رقم الهاتف مطلوب.", 422,
                new() { new("Phone number is required.", "phoneNumber") });

        if (string.IsNullOrWhiteSpace(request.FullName))
            return ServiceResult<AuthTokenBundle>.Fail("الاسم الكامل مطلوب.", 422,
                new() { new("Full name is required.", "fullName") });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return ServiceResult<AuthTokenBundle>.Fail("كلمة المرور يجب ألا تقل عن 6 أحرف.", 422,
                new() { new("Password must be at least 6 characters.", "password") });

        var isOtpValid = await _phoneOtp.VerifyOtpAsync(phone, request.OtpCode, ct);
        if (!isOtpValid)
            return ServiceResult<AuthTokenBundle>.Fail("رمز التحقق (OTP) غير صحيح أو انتهت صلاحيته.", 422,
                new() { new("Invalid or expired OTP code.", "otpCode") });

        if (await _store.PhoneExistsAsync(phone, ct))
            return ServiceResult<AuthTokenBundle>.Conflict("رقم الهاتف مسجل بالفعل مسبقاً.",
                new() { new("Phone number is already registered.", "phoneNumber") });

        var email = $"broker_{phone}@broker.darcom.local";
        if (await _store.EmailExistsAsync(email, ct))
            return ServiceResult<AuthTokenBundle>.Conflict("الحساب مسجل بالفعل مسبقاً.",
                new() { new("Account already registered.", "phoneNumber") });

        string? frontPath = null;
        if (!string.IsNullOrWhiteSpace(request.IdCardFrontBase64))
        {
            var bytes = ConvertBase64ToBytes(request.IdCardFrontBase64);
            if (bytes != null && bytes.Length > 0)
            {
                using var ms = new MemoryStream(bytes);
                frontPath = await _privateStorage.SavePrivateDocumentAsync(ms, $"id_front_{phone}.jpg", "image/jpeg", "broker-ids", ct);
            }
        }

        string? backPath = null;
        if (!string.IsNullOrWhiteSpace(request.IdCardBackBase64))
        {
            var bytes = ConvertBase64ToBytes(request.IdCardBackBase64);
            if (bytes != null && bytes.Length > 0)
            {
                using var ms = new MemoryStream(bytes);
                backPath = await _privateStorage.SavePrivateDocumentAsync(ms, $"id_back_{phone}.jpg", "image/jpeg", "broker-ids", ct);
            }
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            UserName = email,
            PhoneNumber = phone,
            PhoneNumberConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            BrokerProfile = new BrokerProfile
            {
                AgencyName = request.AgencyName?.Trim(),
                LicenseNumber = request.LicenseNumber?.Trim(),
                NationalId = request.NationalId?.Trim(),
                IdCardFrontPath = frontPath,
                IdCardBackPath = backPath,
                IsPhoneVerified = true,
                Status = BrokerStatus.Pending
            }
        };

        var (created, errors) = await _store.CreateUserAsync(user, request.Password, "Broker", ct);
        if (!created)
            return ServiceResult<AuthTokenBundle>.Fail(
                string.Join(" ", errors), 422,
                errors.Select(e => new ApiError(e, "password")).ToList());

        var bundle = await IssueTokensAsync(user, ipAddress, ct);
        if (_notifier is not null)
        {
            await _notifier.NotifyAdminsAsync(
                "broker.registered",
                "New Broker Registered",
                $"Broker '{user.FullName}' registered and is pending approval.",
                relatedEntityId: user.BrokerProfile?.Id ?? user.Id,
                relatedEntityType: "BrokerProfile",
                eventKey: $"broker:registered:{user.Id}",
                ct: ct);
        }
        return ServiceResult<AuthTokenBundle>.Created(bundle,
            "تم تقديم طلب تسجيل البروكر بنجاح، والحساب قيد مراجعة الإدارة.");
    }

    public async Task<ServiceResult<AuthTokenBundle>> LoginAsync(
        LoginRequest request,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var term = request.Email.Trim();
        var user = await _store.FindUserByEmailOrPhoneAsync(term, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<AuthTokenBundle>.Unauthorized();

        var (succeeded, isLockedOut) = await _store.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true, ct);
        if (isLockedOut)
            return ServiceResult<AuthTokenBundle>.Fail("Account temporarily locked due to multiple failed attempts. Please try again later.", 429);

        if (!succeeded)
            return ServiceResult<AuthTokenBundle>.Unauthorized();

        var bundle = await IssueTokensAsync(user, ipAddress, ct);
        return ServiceResult<AuthTokenBundle>.Ok(bundle, "Logged in successfully.");
    }

    public async Task<ServiceResult<AuthTokenBundle>> RefreshAsync(
        string refreshToken,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return ServiceResult<AuthTokenBundle>.Unauthorized("Session expired. Please log in again.");

        var tokenHash = _tokens.HashRefreshToken(refreshToken);
        var stored = await _store.FindRefreshTokenByHashAsync(tokenHash, ct);
        if (stored is null)
            return ServiceResult<AuthTokenBundle>.Unauthorized("Session expired. Please log in again.");

        // Reuse detection: if an already-revoked/rotated refresh token is presented, revoke the whole token family.
        if (stored.IsRevoked)
        {
            await _store.RevokeAllUserRefreshTokensAsync(stored.UserId, ipAddress, "Attempted reuse of revoked refresh token", ct);
            await _store.SaveChangesAsync(ct);
            await _audit.LogAsync(stored.UserId, "auth.refresh-reuse-detected", "User",
                stored.UserId.ToString(), null, "All sessions revoked", ipAddress, ct);
            return ServiceResult<AuthTokenBundle>.Unauthorized("Session invalidated for security. Please log in again.");
        }

        if (stored.IsExpired || stored.User is null || !stored.User.IsActive)
            return ServiceResult<AuthTokenBundle>.Unauthorized("Session expired. Please log in again.");

        var user = stored.User;
        var roles = await _store.GetRolesAsync(user, ct);
        var primaryRole = roles.FirstOrDefault() ?? "Buyer";

        var (accessToken, accessExpiresAt) = _tokens.CreateAccessToken(user, roles.Count > 0 ? roles : new[] { primaryRole });
        var newRawRefresh = _tokens.CreateRefreshToken();
        var newHash = _tokens.HashRefreshToken(newRawRefresh);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);

        // Rotation: revoke previous token and link replacement
        stored.RevokedAt = DateTime.UtcNow;
        stored.RevokedByIp = ipAddress;
        stored.ReplacedByTokenHash = newHash;
        stored.RevocationReason = "Rotated";

        await _store.AddRefreshTokenAsync(new UserRefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = ipAddress
        }, ct);
        await _store.SaveChangesAsync(ct);

        var dto = new UserDto(user.Id, user.FullName, user.Email ?? string.Empty, user.PhoneNumber, primaryRole);
        return ServiceResult<AuthTokenBundle>.Ok(
            new AuthTokenBundle(accessToken, newRawRefresh, accessExpiresAt, refreshExpiresAt, dto),
            "Token refreshed.");
    }

    public async Task<ServiceResult<object?>> LogoutAsync(
        int userId,
        string? refreshToken = null,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var tokenHash = _tokens.HashRefreshToken(refreshToken);
            var stored = await _store.FindRefreshTokenByHashAsync(tokenHash, ct);
            if (stored is not null && stored.UserId == userId && !stored.IsRevoked)
            {
                stored.RevokedAt = DateTime.UtcNow;
                stored.RevokedByIp = ipAddress;
                stored.RevocationReason = "Logout";
                await _store.SaveChangesAsync(ct);
            }
        }
        else if (userId > 0)
        {
            await _store.RevokeAllUserRefreshTokensAsync(userId, ipAddress, "Logout", ct);
            await _store.SaveChangesAsync(ct);
        }

        return ServiceResult<object?>.Ok(null, "Logged out successfully.");
    }

    public async Task<ServiceResult<object?>> RevokeAllSessionsAsync(
        int userId,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is not null)
        {
            await _store.RevokeAllUserRefreshTokensAsync(userId, ipAddress, "RevokeAllSessions", ct);
            await _store.UpdateSecurityStampAsync(user, ct);
            await _store.SaveChangesAsync(ct);
        }
        return ServiceResult<object?>.Ok(null, "All sessions revoked successfully.");
    }

    public async Task<ServiceResult<string?>> ForgotPasswordAsync(ForgotPasswordRequest request, bool exposeToken, CancellationToken ct = default)
    {
        const string message = "If an account exists for this email, a reset token has been issued.";
        var user = await _store.FindUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
        if (user is null || !user.IsActive)
            return ServiceResult<string?>.Ok(null, message);

        var token = await _store.GeneratePasswordResetTokenAsync(user, ct);
        return ServiceResult<string?>.Ok(exposeToken ? token : null, message);
    }

    public async Task<ServiceResult<object?>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
        if (user is null || !user.IsActive)
            return ServiceResult<object?>.Fail("Invalid or expired reset token.", 400);

        var (succeeded, errors) = await _store.ResetPasswordAsync(user, request.Token, request.NewPassword, ct);
        if (!succeeded)
            return ServiceResult<object?>.Fail(
                errors.FirstOrDefault() ?? "Invalid or expired reset token.", 400);

        await _store.RevokeAllUserRefreshTokensAsync(user.Id, null, "PasswordReset", ct);
        await _store.SaveChangesAsync(ct);
        return ServiceResult<object?>.Ok(null, "Password has been reset. You can now log in.");
    }

    private async Task<AuthTokenBundle> IssueTokensAsync(User user, string? ipAddress, CancellationToken ct)
    {
        var roles = await _store.GetRolesAsync(user, ct);
        var primaryRole = roles.FirstOrDefault() ?? "Buyer";
        var effectiveRoles = roles.Count > 0 ? roles : new[] { primaryRole };

        var (accessToken, accessExpiresAt) = _tokens.CreateAccessToken(user, effectiveRoles);
        var rawRefreshToken = _tokens.CreateRefreshToken();
        var refreshHash = _tokens.HashRefreshToken(rawRefreshToken);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);

        await _store.AddRefreshTokenAsync(new UserRefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = ipAddress
        }, ct);
        await _store.SaveChangesAsync(ct);

        var dto = new UserDto(user.Id, user.FullName, user.Email ?? string.Empty, user.PhoneNumber, primaryRole);
        return new AuthTokenBundle(accessToken, rawRefreshToken, accessExpiresAt, refreshExpiresAt, dto);
    }

    private static string DeriveNameFromEmail(string email)
    {
        var localPart = email.Split('@').FirstOrDefault() ?? "Darcom User";
        var cleaned = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "Darcom User" : cleaned;
    }

    private static byte[]? ConvertBase64ToBytes(string base64)
    {
        try
        {
            var commaIdx = base64.IndexOf(',');
            var clean = commaIdx >= 0 ? base64[(commaIdx + 1)..] : base64;
            return Convert.FromBase64String(clean.Trim());
        }
        catch
        {
            return null;
        }
    }
}
