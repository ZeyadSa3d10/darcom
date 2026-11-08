using Application.Common;
using Application.DTOs;
using Domain.Entities;

namespace Application.Stores;

/// <summary>Admin data access: metrics, user management, agents, reviews, villages, zones, property types.</summary>
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

    // Village & Zone Management
    Task<List<VillageDto>> GetVillagesAsync(bool includeInactive, CancellationToken ct = default);
    Task<VillageDto?> GetVillageByIdAsync(int id, CancellationToken ct = default);
    Task<bool> VillageSlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default);
    Task<VillageDto> AddVillageAsync(Village village, CancellationToken ct = default);
    Task<bool> UpdateVillageAsync(int id, string? name, string? nameAr, string? slug, string? imageUrl, bool? isActive, CancellationToken ct = default);
    Task<(bool Success, string? Error)> DeleteVillageAsync(int id, CancellationToken ct = default);

    Task<List<ZoneDto>> GetZonesByVillageIdAsync(int villageId, bool includeInactive, CancellationToken ct = default);
    Task<ZoneDto?> GetZoneByIdAsync(int villageId, int zoneId, CancellationToken ct = default);
    Task<bool> ZoneSlugExistsAsync(int villageId, string slug, int? excludeId = null, CancellationToken ct = default);
    Task<ZoneDto> AddZoneAsync(Zone zone, CancellationToken ct = default);
    Task<bool> UpdateZoneAsync(int villageId, int zoneId, string? name, string? nameAr, string? slug, bool? isActive, CancellationToken ct = default);
    Task<(bool Success, string? Error)> DeleteZoneAsync(int villageId, int zoneId, CancellationToken ct = default);

    // Property Types Management
    Task<List<PropertyTypeDto>> GetPropertyTypesAsync(CancellationToken ct = default);
    Task<PropertyTypeDto?> GetPropertyTypeByIdAsync(int id, CancellationToken ct = default);
    Task<bool> PropertyTypeSlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default);
    Task<PropertyTypeDto> AddPropertyTypeAsync(PropertyType type, CancellationToken ct = default);
    Task<bool> UpdatePropertyTypeAsync(int id, string? name, string? slug, string? description, string? icon, CancellationToken ct = default);
    Task<(bool Success, string? Error)> DeletePropertyTypeAsync(int id, CancellationToken ct = default);
}
