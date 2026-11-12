using Application.Common;
using Application.Stores;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class AuthStore : IAuthStore
{
    private readonly DarcomDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;

    public AuthStore(
        DarcomDbContext db,
        UserManager<User> userManager,
        RoleManager<Role> roleManager)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public Task<User?> FindUserByIdAsync(int id, CancellationToken ct = default)
        => _userManager.FindByIdAsync(id.ToString());

    public Task<User?> FindUserByEmailAsync(string email, CancellationToken ct = default)
        => _userManager.FindByEmailAsync(email.Trim());

    public async Task<User?> FindUserByEmailOrPhoneAsync(string emailOrPhone, CancellationToken ct = default)
    {
        var term = emailOrPhone.Trim();
        var byEmail = await _userManager.FindByEmailAsync(term);
        if (byEmail is not null) return byEmail;

        var lowered = term.ToLowerInvariant();
        var normalizedPhone = PhoneNormalizer.Normalize(term);
        return await _db.Users.FirstOrDefaultAsync(
            u => u.PhoneNumber != null && (u.PhoneNumber == lowered || u.PhoneNumber == normalizedPhone),
            ct);
    }

    public Task<User?> FindUserByExternalLoginAsync(string loginProvider, string providerKey, CancellationToken ct = default)
        => _userManager.FindByLoginAsync(loginProvider, providerKey);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await _userManager.FindByEmailAsync(email.Trim()) is not null;

    public Task<bool> PhoneExistsAsync(string phone, CancellationToken ct = default)
    {
        var raw = phone.Trim();
        var normalized = PhoneNormalizer.Normalize(phone);
        return _db.Users.AnyAsync(u => u.PhoneNumber == raw || u.PhoneNumber == normalized, ct);
    }

    public Task<IList<string>> GetRolesAsync(User user, CancellationToken ct = default)
        => _userManager.GetRolesAsync(user);

    public async Task<(bool Succeeded, IEnumerable<string> Errors)> CreateUserAsync(
        User user,
        string? password,
        string roleName,
        CancellationToken ct = default)
    {
        if (!await _roleManager.RoleExistsAsync(roleName))
            throw new InvalidOperationException($"Role '{roleName}' is not seeded.");

        user.UserName ??= user.Email;

        var createResult = string.IsNullOrWhiteSpace(password)
            ? await _userManager.CreateAsync(user)
            : await _userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
            return (false, createResult.Errors.Select(e => e.Description));

        var roleResult = await _userManager.AddToRoleAsync(user, roleName);
        if (!roleResult.Succeeded)
            return (false, roleResult.Errors.Select(e => e.Description));

        return (true, Array.Empty<string>());
    }

    public async Task UpdateUserAsync(User user, CancellationToken ct = default)
    {
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<bool> AddExternalLoginAsync(
        User user,
        string loginProvider,
        string providerKey,
        string displayName,
        CancellationToken ct = default)
    {
        var existing = await _userManager.GetLoginsAsync(user);
        if (existing.Any(l => l.LoginProvider == loginProvider && l.ProviderKey == providerKey))
            return true;

        var result = await _userManager.AddLoginAsync(user, new UserLoginInfo(loginProvider, providerKey, displayName));
        return result.Succeeded;
    }

    public async Task<(bool Succeeded, bool IsLockedOut)> CheckPasswordSignInAsync(
        User user,
        string password,
        bool lockoutOnFailure = true,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(user.PasswordHash))
            return (false, false);

        if (await _userManager.IsLockedOutAsync(user))
            return (false, true);

        if (await _userManager.CheckPasswordAsync(user, password))
        {
            await _userManager.ResetAccessFailedCountAsync(user);
            return (true, false);
        }

        if (lockoutOnFailure && await _userManager.GetLockoutEnabledAsync(user))
        {
            await _userManager.AccessFailedAsync(user);
            if (await _userManager.IsLockedOutAsync(user))
                return (false, true);
        }

        return (false, false);
    }

    public async Task<(bool Succeeded, IEnumerable<string> Errors)> ChangePasswordAsync(
        User user,
        string currentPassword,
        string newPassword,
        CancellationToken ct = default)
    {
        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        return (result.Succeeded, result.Errors.Select(e => e.Description));
    }

    public Task<string> GeneratePasswordResetTokenAsync(User user, CancellationToken ct = default)
        => _userManager.GeneratePasswordResetTokenAsync(user);

    public async Task<(bool Succeeded, IEnumerable<string> Errors)> ResetPasswordAsync(
        User user,
        string token,
        string newPassword,
        CancellationToken ct = default)
    {
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        return (result.Succeeded, result.Errors.Select(e => e.Description));
    }

    public Task UpdateSecurityStampAsync(User user, CancellationToken ct = default)
        => _userManager.UpdateSecurityStampAsync(user);

    public async Task AddRefreshTokenAsync(UserRefreshToken token, CancellationToken ct = default)
        => await _db.UserRefreshTokens.AddAsync(token, ct);

    public Task<UserRefreshToken?> FindRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default)
        => _db.UserRefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task RevokeAllUserRefreshTokensAsync(int userId, string? ipAddress, string reason, CancellationToken ct = default)
    {
        var activeTokens = await _db.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var t in activeTokens)
        {
            t.RevokedAt = now;
            t.RevokedByIp = ipAddress;
            t.RevocationReason = reason;
        }
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
