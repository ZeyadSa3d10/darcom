using Domain.Entities;

namespace Application.Stores;

/// <summary>
/// Persistence & ASP.NET Core Identity abstraction so Application services never touch EF Core directly.
/// </summary>
public interface IAuthStore
{
    Task<User?> FindUserByIdAsync(int id, CancellationToken ct = default);
    Task<User?> FindUserByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> FindUserByEmailOrPhoneAsync(string emailOrPhone, CancellationToken ct = default);
    Task<User?> FindUserByExternalLoginAsync(string loginProvider, string providerKey, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<bool> PhoneExistsAsync(string phone, CancellationToken ct = default);
    Task<IList<string>> GetRolesAsync(User user, CancellationToken ct = default);

    Task<(bool Succeeded, IEnumerable<string> Errors)> CreateUserAsync(
        User user,
        string? password,
        string roleName,
        CancellationToken ct = default);

    Task UpdateUserAsync(User user, CancellationToken ct = default);

    Task<bool> AddExternalLoginAsync(
        User user,
        string loginProvider,
        string providerKey,
        string displayName,
        CancellationToken ct = default);

    Task<(bool Succeeded, bool IsLockedOut)> CheckPasswordSignInAsync(
        User user,
        string password,
        bool lockoutOnFailure = true,
        CancellationToken ct = default);

    Task<(bool Succeeded, IEnumerable<string> Errors)> ChangePasswordAsync(
        User user,
        string currentPassword,
        string newPassword,
        CancellationToken ct = default);

    Task<string> GeneratePasswordResetTokenAsync(User user, CancellationToken ct = default);

    Task<(bool Succeeded, IEnumerable<string> Errors)> ResetPasswordAsync(
        User user,
        string token,
        string newPassword,
        CancellationToken ct = default);

    Task UpdateSecurityStampAsync(User user, CancellationToken ct = default);

    // Refresh Token persistence (hashed, rotatable, revocable)
    Task AddRefreshTokenAsync(UserRefreshToken token, CancellationToken ct = default);
    Task<UserRefreshToken?> FindRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeAllUserRefreshTokensAsync(int userId, string? ipAddress, string reason, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
