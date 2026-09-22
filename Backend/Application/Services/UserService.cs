using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Stores;

namespace Application.Services;

public interface IUserService
{
    Task<ServiceResult<UserDto>> GetMeAsync(int userId, CancellationToken ct = default);
    Task<ServiceResult<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default);
}

public sealed class UserService : IUserService
{
    private readonly IAuthStore _store;
    private readonly IPasswordHasher _hasher;

    public UserService(IAuthStore store, IPasswordHasher hasher)
    {
        _store = store;
        _hasher = hasher;
    }

    public async Task<ServiceResult<UserDto>> GetMeAsync(int userId, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<UserDto>.NotFound("User not found.");

        var roleName = user.Role?.Name ?? await _store.GetRoleNameAsync(user.RoleId, ct) ?? "Buyer";
        return ServiceResult<UserDto>.Ok(ToDto(user, roleName));
    }

    public async Task<ServiceResult<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<UserDto>.NotFound("User not found.");

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);

        var roleName = user.Role?.Name ?? await _store.GetRoleNameAsync(user.RoleId, ct) ?? "Buyer";
        return ServiceResult<UserDto>.Ok(ToDto(user, roleName), "Profile updated.");
    }

    public async Task<ServiceResult<object?>> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<object?>.NotFound("User not found.");

        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
            return ServiceResult<object?>.Fail("Current password is incorrect.", 422,
                new() { new("Current password is incorrect.", "currentPassword") });

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.RefreshToken = null; // force re-login on all devices
        user.RefreshTokenExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);

        return ServiceResult<object?>.Ok(null, "Password changed. Please log in again.");
    }

    private static UserDto ToDto(Domain.Entities.User user, string roleName)
        => new(user.Id, user.FullName, user.Email, user.PhoneNumber, roleName);
}
