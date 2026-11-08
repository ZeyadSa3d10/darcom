using Domain.Entities;

namespace Application.Stores;

/// <summary>
/// Persistence abstraction so Application services never touch EF Core directly.
/// Implemented in Infrastructure (website.md #2 — Clean Architecture).
/// </summary>
public interface IAuthStore
{
    Task<User?> FindUserByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> FindUserByEmailOrPhoneAsync(string emailOrPhone, CancellationToken ct = default);
    Task<User?> FindUserByIdAsync(int id, CancellationToken ct = default);
    Task<User?> FindUserByRefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<bool> PhoneExistsAsync(string phone, CancellationToken ct = default);
    Task<string?> GetRoleNameAsync(int roleId, CancellationToken ct = default);
    Task<int?> GetRoleIdByNameAsync(string roleName, CancellationToken ct = default);
    Task AddUserAsync(User user, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
