using Application.Common;
using Application.DTOs;
using Application.Stores;

namespace Application.Services;

public interface IAdminService
{
    Task<ServiceResult<DashboardDto>> GetDashboardAsync(CancellationToken ct = default);
    Task<ServiceResult<PagedResult<AdminUserDto>>> GetUsersAsync(string? search, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<AdminUserDto>> SetUserRoleAsync(int adminId, int userId, string roleName, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<List<AdminAgentDto>>> GetAgentsAsync(CancellationToken ct = default);
    Task<ServiceResult<PagedResult<AdminReviewDto>>> GetReviewsAsync(bool? approved, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<object?>> SetReviewApprovalAsync(int adminId, int reviewId, bool approved, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteReviewAsync(int adminId, int reviewId, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<object?>> MarkInquiryReadAsync(int inquiryId, CancellationToken ct = default);
}

public sealed class AdminService : IAdminService
{
    private static readonly string[] Roles = { "Admin", "Agent", "Seller", "Buyer" };

    private readonly IAdminStore _store;
    private readonly IEngagementStore _engagement;
    private readonly IAuditWriter _audit;

    public AdminService(IAdminStore store, IEngagementStore engagement, IAuditWriter audit)
    {
        _store = store;
        _engagement = engagement;
        _audit = audit;
    }

    public async Task<ServiceResult<DashboardDto>> GetDashboardAsync(CancellationToken ct = default)
        => ServiceResult<DashboardDto>.Ok(await _store.GetDashboardAsync(ct));

    public async Task<ServiceResult<PagedResult<AdminUserDto>>> GetUsersAsync(string? search, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<AdminUserDto>>.Ok(
            await _store.GetUsersAsync(search?.Trim(), Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct));

    public async Task<ServiceResult<AdminUserDto>> SetUserRoleAsync(int adminId, int userId, string roleName, string? ipAddress, CancellationToken ct = default)
    {
        if (!Roles.Contains(roleName, StringComparer.OrdinalIgnoreCase))
            return ServiceResult<AdminUserDto>.Fail(
                $"Role must be one of: {string.Join(", ", Roles)}.", 422,
                new() { new("Invalid role.", "role") });

        if (adminId == userId)
            return ServiceResult<AdminUserDto>.Fail("You cannot change your own role.", 422,
                new() { new("Cannot change your own role.", "role") });

        var changed = await _store.SetUserRoleAsync(userId, Roles.First(r => r.Equals(roleName, StringComparison.OrdinalIgnoreCase)), ct);
        if (changed is null)
            return ServiceResult<AdminUserDto>.NotFound("User not found.");

        await _audit.LogAsync(adminId, "user.role-changed", "User",
            userId.ToString(), changed.Value.OldRole, roleName, ipAddress, ct);
        await _engagement.AddNotificationAsync(userId, "Account role updated",
            $"Your account role is now {roleName}.", "request-status", ct);
        await _engagement.SaveChangesAsync(ct);

        var updated = await _store.GetUserAsync(userId, ct);
        return ServiceResult<AdminUserDto>.Ok(updated!, $"Role changed to {roleName}.");
    } 

    public async Task<ServiceResult<List<AdminAgentDto>>> GetAgentsAsync(CancellationToken ct = default)
        => ServiceResult<List<AdminAgentDto>>.Ok(await _store.GetAgentsAsync(ct));

    public async Task<ServiceResult<PagedResult<AdminReviewDto>>> GetReviewsAsync(bool? approved, int page, int pageSize, CancellationToken ct = default)
        => ServiceResult<PagedResult<AdminReviewDto>>.Ok(
            await _store.GetReviewsAsync(approved, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct));

    public async Task<ServiceResult<object?>> SetReviewApprovalAsync(int adminId, int reviewId, bool approved, string? ipAddress, CancellationToken ct = default)
    {
        if (!await _store.SetReviewApprovalAsync(reviewId, approved, ct))
            return ServiceResult<object?>.NotFound("Review not found.");
        await _audit.LogAsync(adminId, approved ? "review.approved" : "review.rejected",
            "Review", reviewId.ToString(), null, approved.ToString(), ipAddress, ct);
        return ServiceResult<object?>.Ok(null, approved ? "Review approved." : "Review hidden.");
    }
         

    public async Task<ServiceResult<object?>> DeleteReviewAsync(int adminId, int reviewId, string? ipAddress, CancellationToken ct = default)
    {
        if (!await _store.DeleteReviewAsync(reviewId, ct))
            return ServiceResult<object?>.NotFound("Review not found.");
        await _audit.LogAsync(adminId, "review.deleted", "Review", reviewId.ToString(), null, "Deleted", ipAddress, ct);
        return ServiceResult<object?>.Ok(null, "Review deleted.");
    }

    public async Task<ServiceResult<object?>> MarkInquiryReadAsync(int inquiryId, CancellationToken ct = default)
    {
        if (!await _store.MarkInquiryReadAsync(inquiryId, ct))
            return ServiceResult<object?>.NotFound("Inquiry not found.");
        return ServiceResult<object?>.Ok(null, "Marked as read.");
    }
}
