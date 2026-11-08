using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;

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

    // Village & Zone Management (Admin CRUD - Req 3 & 13)
    Task<ServiceResult<List<VillageDto>>> GetVillagesAsync(bool includeInactive, CancellationToken ct = default);
    Task<ServiceResult<VillageDto>> GetVillageByIdAsync(int id, CancellationToken ct = default);
    Task<ServiceResult<VillageDto>> CreateVillageAsync(CreateVillageRequest request, CancellationToken ct = default);
    Task<ServiceResult<VillageDto>> UpdateVillageAsync(int id, UpdateVillageRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteVillageAsync(int id, CancellationToken ct = default);

    Task<ServiceResult<List<ZoneDto>>> GetZonesByVillageIdAsync(int villageId, bool includeInactive, CancellationToken ct = default);
    Task<ServiceResult<ZoneDto>> GetZoneByIdAsync(int villageId, int zoneId, CancellationToken ct = default);
    Task<ServiceResult<ZoneDto>> CreateZoneAsync(int villageId, CreateZoneRequest request, CancellationToken ct = default);
    Task<ServiceResult<ZoneDto>> UpdateZoneAsync(int villageId, int zoneId, UpdateZoneRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteZoneAsync(int villageId, int zoneId, CancellationToken ct = default);

    // Property Types Management (Admin CRUD - Req 5 & 13)
    Task<ServiceResult<List<PropertyTypeDto>>> GetPropertyTypesAsync(CancellationToken ct = default);
    Task<ServiceResult<PropertyTypeDto>> GetPropertyTypeByIdAsync(int id, CancellationToken ct = default);
    Task<ServiceResult<PropertyTypeDto>> CreatePropertyTypeAsync(CreatePropertyTypeRequest request, CancellationToken ct = default);
    Task<ServiceResult<PropertyTypeDto>> UpdatePropertyTypeAsync(int id, UpdatePropertyTypeRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeletePropertyTypeAsync(int id, CancellationToken ct = default);
}

public sealed class AdminService : IAdminService
{
    private static readonly string[] Roles = { "Admin", "Agent", "Seller", "Buyer", "Broker" };

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

    // Village & Zone Management
    public async Task<ServiceResult<List<VillageDto>>> GetVillagesAsync(bool includeInactive, CancellationToken ct = default)
        => ServiceResult<List<VillageDto>>.Ok(await _store.GetVillagesAsync(includeInactive, ct));

    public async Task<ServiceResult<VillageDto>> GetVillageByIdAsync(int id, CancellationToken ct = default)
    {
        var village = await _store.GetVillageByIdAsync(id, ct);
        return village is null
            ? ServiceResult<VillageDto>.NotFound("Village not found.")
            : ServiceResult<VillageDto>.Ok(village);
    }

    public async Task<ServiceResult<VillageDto>> CreateVillageAsync(CreateVillageRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        var baseSlug = string.IsNullOrWhiteSpace(request.Slug)
            ? SlugHelper.GenerateSlug(name)
            : SlugHelper.GenerateSlug(request.Slug);

        var slug = baseSlug;
        var counter = 2;
        while (await _store.VillageSlugExistsAsync(slug, null, ct))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        var village = new Village
        {
            Name = name,
            NameAr = request.NameAr?.Trim(),
            Slug = slug,
            ImageUrl = request.ImageUrl?.Trim(),
            IsActive = request.IsActive
        };

        var created = await _store.AddVillageAsync(village, ct);
        return ServiceResult<VillageDto>.Created(created, "Village created successfully.");
    }

    public async Task<ServiceResult<VillageDto>> UpdateVillageAsync(int id, UpdateVillageRequest request, CancellationToken ct = default)
    {
        var existing = await _store.GetVillageByIdAsync(id, ct);
        if (existing is null)
            return ServiceResult<VillageDto>.NotFound("Village not found.");

        string? slug = null;
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            slug = SlugHelper.GenerateSlug(request.Slug);
            if (await _store.VillageSlugExistsAsync(slug, id, ct))
                return ServiceResult<VillageDto>.Fail($"Slug '{slug}' is already taken by another village.", 409);
        }

        await _store.UpdateVillageAsync(id, request.Name, request.NameAr, slug, request.ImageUrl, request.IsActive, ct);
        var updated = await _store.GetVillageByIdAsync(id, ct);
        return ServiceResult<VillageDto>.Ok(updated!, "Village updated successfully.");
    }

    public async Task<ServiceResult<object?>> DeleteVillageAsync(int id, CancellationToken ct = default)
    {
        var (success, error) = await _store.DeleteVillageAsync(id, ct);
        if (!success)
            return ServiceResult<object?>.Fail(error ?? "Unable to delete village.", 409);

        return ServiceResult<object?>.Ok(null, "Village deleted successfully.");
    }

    public async Task<ServiceResult<List<ZoneDto>>> GetZonesByVillageIdAsync(int villageId, bool includeInactive, CancellationToken ct = default)
    {
        var village = await _store.GetVillageByIdAsync(villageId, ct);
        if (village is null)
            return ServiceResult<List<ZoneDto>>.NotFound("Village not found.");

        return ServiceResult<List<ZoneDto>>.Ok(await _store.GetZonesByVillageIdAsync(villageId, includeInactive, ct));
    }

    public async Task<ServiceResult<ZoneDto>> GetZoneByIdAsync(int villageId, int zoneId, CancellationToken ct = default)
    {
        var zone = await _store.GetZoneByIdAsync(villageId, zoneId, ct);
        return zone is null
            ? ServiceResult<ZoneDto>.NotFound("Zone not found in the specified village.")
            : ServiceResult<ZoneDto>.Ok(zone);
    }

    public async Task<ServiceResult<ZoneDto>> CreateZoneAsync(int villageId, CreateZoneRequest request, CancellationToken ct = default)
    {
        var village = await _store.GetVillageByIdAsync(villageId, ct);
        if (village is null)
            return ServiceResult<ZoneDto>.NotFound("Village not found.");

        var name = request.Name.Trim();
        var baseSlug = string.IsNullOrWhiteSpace(request.Slug)
            ? SlugHelper.GenerateSlug(name)
            : SlugHelper.GenerateSlug(request.Slug);

        var slug = baseSlug;
        var counter = 2;
        while (await _store.ZoneSlugExistsAsync(villageId, slug, null, ct))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        var zone = new Zone
        {
            VillageId = villageId,
            Name = name,
            NameAr = request.NameAr?.Trim(),
            Slug = slug,
            IsActive = request.IsActive
        };

        var created = await _store.AddZoneAsync(zone, ct);
        return ServiceResult<ZoneDto>.Created(created, "Zone created successfully.");
    }

    public async Task<ServiceResult<ZoneDto>> UpdateZoneAsync(int villageId, int zoneId, UpdateZoneRequest request, CancellationToken ct = default)
    {
        var existing = await _store.GetZoneByIdAsync(villageId, zoneId, ct);
        if (existing is null)
            return ServiceResult<ZoneDto>.NotFound("Zone not found.");

        string? slug = null;
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            slug = SlugHelper.GenerateSlug(request.Slug);
            if (await _store.ZoneSlugExistsAsync(villageId, slug, zoneId, ct))
                return ServiceResult<ZoneDto>.Fail($"Slug '{slug}' is already taken in this village.", 409);
        }

        await _store.UpdateZoneAsync(villageId, zoneId, request.Name, request.NameAr, slug, request.IsActive, ct);
        var updated = await _store.GetZoneByIdAsync(villageId, zoneId, ct);
        return ServiceResult<ZoneDto>.Ok(updated!, "Zone updated successfully.");
    }

    public async Task<ServiceResult<object?>> DeleteZoneAsync(int villageId, int zoneId, CancellationToken ct = default)
    {
        var (success, error) = await _store.DeleteZoneAsync(villageId, zoneId, ct);
        if (!success)
            return ServiceResult<object?>.Fail(error ?? "Unable to delete zone.", 409);

        return ServiceResult<object?>.Ok(null, "Zone deleted successfully.");
    }

    // Property Types Management
    public async Task<ServiceResult<List<PropertyTypeDto>>> GetPropertyTypesAsync(CancellationToken ct = default)
        => ServiceResult<List<PropertyTypeDto>>.Ok(await _store.GetPropertyTypesAsync(ct));

    public async Task<ServiceResult<PropertyTypeDto>> GetPropertyTypeByIdAsync(int id, CancellationToken ct = default)
    {
        var pt = await _store.GetPropertyTypeByIdAsync(id, ct);
        return pt is null
            ? ServiceResult<PropertyTypeDto>.NotFound("Property type not found.")
            : ServiceResult<PropertyTypeDto>.Ok(pt);
    }

    public async Task<ServiceResult<PropertyTypeDto>> CreatePropertyTypeAsync(CreatePropertyTypeRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        var baseSlug = string.IsNullOrWhiteSpace(request.Slug)
            ? SlugHelper.GenerateSlug(name)
            : SlugHelper.GenerateSlug(request.Slug);

        var slug = baseSlug;
        var counter = 2;
        while (await _store.PropertyTypeSlugExistsAsync(slug, null, ct))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        var pt = new PropertyType
        {
            Name = name,
            Slug = slug,
            Description = request.Description?.Trim(),
            Icon = request.Icon?.Trim()
        };

        var created = await _store.AddPropertyTypeAsync(pt, ct);
        return ServiceResult<PropertyTypeDto>.Created(created, "Property type created successfully.");
    }

    public async Task<ServiceResult<PropertyTypeDto>> UpdatePropertyTypeAsync(int id, UpdatePropertyTypeRequest request, CancellationToken ct = default)
    {
        var existing = await _store.GetPropertyTypeByIdAsync(id, ct);
        if (existing is null)
            return ServiceResult<PropertyTypeDto>.NotFound("Property type not found.");

        string? slug = null;
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            slug = SlugHelper.GenerateSlug(request.Slug);
            if (await _store.PropertyTypeSlugExistsAsync(slug, id, ct))
                return ServiceResult<PropertyTypeDto>.Fail($"Slug '{slug}' is already taken.", 409);
        }

        await _store.UpdatePropertyTypeAsync(id, request.Name, slug, request.Description, request.Icon, ct);
        var updated = await _store.GetPropertyTypeByIdAsync(id, ct);
        return ServiceResult<PropertyTypeDto>.Ok(updated!, "Property type updated successfully.");
    }

    public async Task<ServiceResult<object?>> DeletePropertyTypeAsync(int id, CancellationToken ct = default)
    {
        var (success, error) = await _store.DeletePropertyTypeAsync(id, ct);
        if (!success)
            return ServiceResult<object?>.Fail(error ?? "Unable to delete property type.", 409);

        return ServiceResult<object?>.Ok(null, "Property type deleted successfully.");
    }
}
