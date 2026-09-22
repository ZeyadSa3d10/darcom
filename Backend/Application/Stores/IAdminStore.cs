using Application.Common;
using Application.DTOs;

namespace Application.Stores;

/// <summary>Admin data access: metrics, user management, agents, reviews.</summary>
public interface IAdminStore
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default);
    Task<PagedResult<AdminUserDto>> GetUsersAsync(string? search, int page, int pageSize, CancellationToken ct = default);
    Task<AdminUserDto?> GetUserAsync(int userId, CancellationToken ct = default);
    Task<(int Id, string OldRole)?> SetUserRoleAsync(int userId, string roleName, CancellationToken ct = default);
    Task<List<AdminAgentDto>> GetAgentsAsync(CancellationToken ct = default);
    Task<PagedResult<AdminReviewDto>> GetReviewsAsync(bool? approved, int page, int pageSize, CancellationToken ct = default);
    Task<bool> SetReviewApprovalAsync(int reviewId, bool approved, CancellationToken ct = default);
    Task<bool> DeleteReviewAsync(int reviewId, CancellationToken ct = default);
    Task<bool> MarkInquiryReadAsync(int inquiryId, CancellationToken ct = default);
}
