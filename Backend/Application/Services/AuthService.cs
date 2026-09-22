using System.Security.Cryptography;
using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Services;
using Application.Stores;
using Domain.Entities;
using Microsoft.Extensions.Options;

namespace Application.Services;

public interface IAuthService
{
    Task<ServiceResult<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
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
    private readonly JwtOptions _jwt;

    public AuthService(IAuthStore store, ITokenService tokens, IPasswordHasher hasher, IOptions<JwtOptions> jwt)
    {
        _store = store;
        _tokens = tokens;
        _hasher = hasher;
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

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
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

    public async Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
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
