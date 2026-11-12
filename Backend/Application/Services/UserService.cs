using Application.Common;
using Application.DTOs;
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

    public UserService(IAuthStore store)
    {
        _store = store;
    }

    public async Task<ServiceResult<UserDto>> GetMeAsync(int userId, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<UserDto>.NotFound("User not found.");

        var roles = await _store.GetRolesAsync(user, ct);
        var roleName = roles.FirstOrDefault() ?? "Buyer";
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
        await _store.UpdateUserAsync(user, ct);

        var roles = await _store.GetRolesAsync(user, ct);
        var roleName = roles.FirstOrDefault() ?? "Buyer";
        return ServiceResult<UserDto>.Ok(ToDto(user, roleName), "Profile updated.");
    }

    public async Task<ServiceResult<object?>> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _store.FindUserByIdAsync(userId, ct);
        if (user is null || !user.IsActive)
            return ServiceResult<object?>.NotFound("User not found.");

        var (succeeded, errors) = await _store.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword, ct);
        if (!succeeded)
        {
            var errMsg = errors.FirstOrDefault() ?? "Current password is incorrect.";
            return ServiceResult<object?>.Fail(errMsg, 422, new() { new(errMsg, "currentPassword") });
        }

        await _store.RevokeAllUserRefreshTokensAsync(user.Id, null, "PasswordChanged", ct);
        await _store.SaveChangesAsync(ct);

        return ServiceResult<object?>.Ok(null, "Password changed. Please log in again.");
    }

    private static UserDto ToDto(Domain.Entities.User user, string roleName)
        => new(user.Id, user.FullName, user.Email ?? string.Empty, user.PhoneNumber, roleName);
}
