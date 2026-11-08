using Application.Stores;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class AuthStore : IAuthStore
{
    private readonly DarcomDbContext _db;

    public AuthStore(DarcomDbContext db)
    {
        _db = db;
    }

    public Task<User?> FindUserByEmailAsync(string email, CancellationToken ct = default)
        => _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> FindUserByEmailOrPhoneAsync(string emailOrPhone, CancellationToken ct = default)
    {
        var term = emailOrPhone.Trim().ToLowerInvariant();
        return _db.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == term || (u.PhoneNumber != null && u.PhoneNumber == term), ct);
    }

    public Task<User?> FindUserByIdAsync(int id, CancellationToken ct = default)
        => _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> FindUserByRefreshTokenAsync(string refreshToken, CancellationToken ct = default)
        => _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => _db.Users.AnyAsync(u => u.Email == email, ct);

    public Task<bool> PhoneExistsAsync(string phone, CancellationToken ct = default)
        => _db.Users.AnyAsync(u => u.PhoneNumber == phone, ct);

    public async Task<string?> GetRoleNameAsync(int roleId, CancellationToken ct = default)
        => (await _db.Roles.FindAsync(new object[] { roleId }, ct))?.Name;

    public async Task<int?> GetRoleIdByNameAsync(string roleName, CancellationToken ct = default)
        => (await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct))?.Id;

    public async Task AddUserAsync(User user, CancellationToken ct = default)
        => await _db.Users.AddAsync(user, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
