using System.Security.Cryptography;
using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Domain.Entities;
using Microsoft.Extensions.Options;

namespace Application.Services;

public interface IAuthService
{
    Task<ServiceResult<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<ServiceResult<AuthResponse>> RegisterBrokerAsync(RegisterBrokerDto request, CancellationToken ct = default);
    Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<ServiceResult<AuthResponse>> RefreshAsync(RefreshRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> LogoutAsync(int userId, CancellationToken ct = default);
    Task<ServiceResult<string?>> ForgotPasswordAsync(ForgotPasswordRequest request, bool exposeToken, CancellationToken ct = default);
    Task<ServiceResult<object?>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}

public sealed class AuthService : IAuthService
{
    private readonly IAuthStore _store;
    private readonly ITokenService _tokens;
    private readonly IPasswordHasher _hasher;
    private readonly IOtpService _otp;
    private readonly IPrivateDocumentStorage _privateStorage;
    private readonly JwtOptions _jwt;

    public AuthService(
        IAuthStore store,
        ITokenService tokens,
        IPasswordHasher hasher,
        IOtpService otp,
        IPrivateDocumentStorage privateStorage,
        IOptions<JwtOptions> jwt)
    {
        _store = store;
        _tokens = tokens;
        _hasher = hasher;
        _otp = otp;
        _privateStorage = privateStorage;
        _jwt = jwt.Value;
    }

    public async Task<ServiceResult<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _store.EmailExistsAsync(email, ct))
            return ServiceResult<AuthResponse>.Conflict("Email is already registered.",
                new() { new("Email is already registered.", "email") });

        // SECURITY: role is NEVER taken from the client — every self-registration is a Buyer.
        var buyerRoleId = await _store.GetRoleIdByNameAsync("Buyer", ct)
            ?? throw new InvalidOperationException("Buyer role is not seeded.");

        var normalizedPhone = string.IsNullOrWhiteSpace(request.PhoneNumber)
            ? null
            : Application.Common.PhoneNormalizer.Normalize(request.PhoneNumber);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = normalizedPhone,
            PasswordHash = _hasher.Hash(request.Password),
            RoleId = buyerRoleId,
            IsActive = true
        };
        await _store.AddUserAsync(user, ct);

        var refreshToken = _tokens.CreateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<AuthResponse>.Created(BuildAuthResponse(user, "Buyer", refreshToken),
            "Account created successfully.");
    }

    public async Task<ServiceResult<AuthResponse>> RegisterBrokerAsync(RegisterBrokerDto request, CancellationToken ct = default)
    {
        var phone = Application.Common.PhoneNormalizer.Normalize(request.PhoneNumber);
        if (string.IsNullOrWhiteSpace(phone))
            return ServiceResult<AuthResponse>.Fail("رقم الهاتف مطلوب.", 422,
                new() { new("Phone number is required.", "phoneNumber") });

        if (string.IsNullOrWhiteSpace(request.FullName))
            return ServiceResult<AuthResponse>.Fail("الاسم الكامل مطلوب.", 422,
                new() { new("Full name is required.", "fullName") });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return ServiceResult<AuthResponse>.Fail("كلمة المرور يجب ألا تقل عن 6 أحرف.", 422,
                new() { new("Password must be at least 6 characters.", "password") });

        // 1. Verify OTP
        var isOtpValid = await _otp.VerifyOtpAsync(phone, request.OtpCode);
        if (!isOtpValid)
            return ServiceResult<AuthResponse>.Fail("رمز التحقق (OTP) غير صحيح أو انتهت صلاحيته.", 422,
                new() { new("Invalid or expired OTP code.", "otpCode") });

        // 2. Check phone exists
        if (await _store.PhoneExistsAsync(phone, ct))
            return ServiceResult<AuthResponse>.Conflict("رقم الهاتف مسجل بالفعل مسبقاً.",
                new() { new("Phone number is already registered.", "phoneNumber") });

        // Generate normalized unique email for the broker
        var cleanPhone = phone;
        var email = $"broker_{cleanPhone}@broker.darcom.local";
        if (await _store.EmailExistsAsync(email, ct))
            return ServiceResult<AuthResponse>.Conflict("الحساب مسجل بالفعل مسبقاً.",
                new() { new("Account already registered.", "phoneNumber") });

        var brokerRoleId = await _store.GetRoleIdByNameAsync("Broker", ct)
            ?? throw new InvalidOperationException("Broker role is not seeded.");

        // 3. Save ID Card images to private storage (never in public /uploads)
        string? frontPath = null;
        if (!string.IsNullOrWhiteSpace(request.IdCardFrontBase64))
        {
            var bytes = ConvertBase64ToBytes(request.IdCardFrontBase64);
            if (bytes != null && bytes.Length > 0)
            {
                using var ms = new MemoryStream(bytes);
                frontPath = await _privateStorage.SavePrivateDocumentAsync(ms, $"id_front_{cleanPhone}.jpg", "image/jpeg", "broker-ids", ct);
            }
        }

        string? backPath = null;
        if (!string.IsNullOrWhiteSpace(request.IdCardBackBase64))
        {
            var bytes = ConvertBase64ToBytes(request.IdCardBackBase64);
            if (bytes != null && bytes.Length > 0)
            {
                using var ms = new MemoryStream(bytes);
                backPath = await _privateStorage.SavePrivateDocumentAsync(ms, $"id_back_{cleanPhone}.jpg", "image/jpeg", "broker-ids", ct);
            }
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = phone,
            PasswordHash = _hasher.Hash(request.Password),
            RoleId = brokerRoleId,
            IsActive = true,
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

        await _store.AddUserAsync(user, ct);

        var refreshToken = _tokens.CreateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<AuthResponse>.Created(BuildAuthResponse(user, "Broker", refreshToken),
            "تم تقديم طلب تسجيل البروكر بنجاح، والحساب قيد مراجعة الإدارة.");
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

    public async Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var term = request.Email.Trim();
        var user = await _store.FindUserByEmailOrPhoneAsync(term, ct);
        if (user is null || !user.IsActive || !_hasher.Verify(request.Password, user.PasswordHash))
            return ServiceResult<AuthResponse>.Unauthorized();

        var roleName = user.Role?.Name ?? await _store.GetRoleNameAsync(user.RoleId, ct) ?? "Buyer";
        var refreshToken = _tokens.CreateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<AuthResponse>.Ok(BuildAuthResponse(user, roleName, refreshToken),
            "Logged in successfully.");
    }

    public async Task<ServiceResult<AuthResponse>> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByRefreshTokenAsync(request.RefreshToken, ct);
        if (user is null || !user.IsActive
            || user.RefreshTokenExpiry is null || user.RefreshTokenExpiry <= DateTime.UtcNow)
            return ServiceResult<AuthResponse>.Unauthorized("Session expired. Please log in again.");

        var roleName = user.Role?.Name ?? await _store.GetRoleNameAsync(user.RoleId, ct) ?? "Buyer";

        // Rotation: every refresh mints a brand-new pair, invalidating the old refresh token.
        var refreshToken = _tokens.CreateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<AuthResponse>.Ok(BuildAuthResponse(user, roleName, refreshToken),
            "Token refreshed.");
    }

    public async Task<ServiceResult<object?>> LogoutAsync(int userId, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is not null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _store.SaveChangesAsync(ct);
        }
        return ServiceResult<object?>.Ok(null, "Logged out successfully.");
    }

    public async Task<ServiceResult<string?>> ForgotPasswordAsync(ForgotPasswordRequest request, bool exposeToken, CancellationToken ct = default)
    {
        // Generic message either way — no user enumeration.
        const string message = "If an account exists for this email, a reset token has been issued.";
        var user = await _store.FindUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
        if (user is null || !user.IsActive)
            return ServiceResult<string?>.Ok(null, message);

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        user.PasswordResetToken = token;
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _store.SaveChangesAsync(ct);

        // Token is returned ONLY in Development so the flow is testable without an SMTP server.
        return ServiceResult<string?>.Ok(exposeToken ? token : null, message);
    }

    public async Task<ServiceResult<object?>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
        if (user is null || !user.IsActive
            || user.PasswordResetToken is null || user.PasswordResetToken != request.Token
            || user.PasswordResetExpiry is null || user.PasswordResetExpiry <= DateTime.UtcNow)
            return ServiceResult<object?>.Fail("Reset token is invalid or expired.", 400);

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        user.RefreshToken = null; // force re-login on all devices
        user.RefreshTokenExpiry = null;
        await _store.SaveChangesAsync(ct);

        return ServiceResult<object?>.Ok(null, "Password has been reset. Please log in.");
    }

    private AuthResponse BuildAuthResponse(User user, string roleName, string refreshToken)
    {
        var (accessToken, expiresAt) = _tokens.CreateAccessToken(user, roleName);
        return new AuthResponse(accessToken, refreshToken, expiresAt,
            new UserDto(user.Id, user.FullName, user.Email, user.PhoneNumber, roleName));
    }
}
