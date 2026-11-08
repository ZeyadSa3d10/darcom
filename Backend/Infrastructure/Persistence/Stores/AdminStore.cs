using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class AdminStore : IAdminStore
{
    private readonly DarcomDbContext _db;

    public AdminStore(DarcomDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var props = _db.Properties.AsNoTracking();
        var active = new[] { PropertyStatus.Published, PropertyStatus.Featured, PropertyStatus.Reserved };
        return new DashboardDto(
            TotalProperties: await props.CountAsync(ct),
            PublishedProperties: await props.CountAsync(p => active.Contains(p.Status), ct),
            PendingProperties: await props.CountAsync(p => p.Status == PropertyStatus.PendingReview, ct),
            SoldProperties: await props.CountAsync(p => p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented, ct),
            TotalUsers: await _db.Users.CountAsync(ct),
            PurchaseRequests: await _db.PurchaseRequests.CountAsync(ct),
            PendingPurchaseRequests: await _db.PurchaseRequests.CountAsync(r =>
                r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation, ct),
            BookingRequests: await _db.BookingRequests.CountAsync(ct),
            PendingBookingRequests: await _db.BookingRequests.CountAsync(r =>
                r.Status == RequestStatus.Pending || r.Status == RequestStatus.UnderReview
                || r.Status == RequestStatus.Contacted || r.Status == RequestStatus.Negotiation, ct),
            PropertyViews: await _db.PropertyViews.LongCountAsync(ct),
            Inquiries: await _db.PropertyInquiries.CountAsync(ct),
            UnreadInquiries: await _db.PropertyInquiries.CountAsync(i => !i.IsRead, ct));
    }

    public async Task<PagedResult<AdminUserDto>> GetUsersAsync(string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking().Include(u => u.Role).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }
        query = query.OrderByDescending(u => u.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new AdminUserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.IsActive, u.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminUserDto>(items, page, pageSize, total, totalPages);
    }

    public async Task<AdminUserDto?> GetUserAsync(int userId, CancellationToken ct = default)
        => await _db.Users.AsNoTracking().Include(u => u.Role)
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.IsActive, u.CreatedAt))
            .FirstOrDefaultAsync(ct);

    public async Task<(int Id, string OldRole)?> SetUserRoleAsync(int userId, string roleName, CancellationToken ct = default)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role is null) return null;
        var old = user.Role?.Name ?? string.Empty;
        user.RoleId = role.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return (user.Id, old);
    }

    public Task<List<AdminAgentDto>> GetAgentsAsync(CancellationToken ct = default)
        => _db.Agents.AsNoTracking().OrderBy(a => a.Id)
            .Select(a => new AdminAgentDto(a.Id, a.Name, a.Title, a.Agency, a.Phone, a.Email, a.IsVerified))
            .ToListAsync(ct);

    public async Task<PagedResult<AdminReviewDto>> GetReviewsAsync(bool? approved, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Reviews.AsNoTracking()
            .Include(r => r.Property).Include(r => r.User).AsQueryable();
        if (approved.HasValue)
            query = query.Where(r => r.IsApproved == approved.Value);
        query = query.OrderByDescending(r => r.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new AdminReviewDto(r.Id, r.PropertyId, r.Property.Title, r.UserId, r.User.FullName,
                r.Rating, r.Comment, r.IsApproved, r.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminReviewDto>(items, page, pageSize, total, totalPages);
    }

    public async Task<bool> SetReviewApprovalAsync(int reviewId, bool approved, CancellationToken ct = default)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct);
        if (review is null) return false;
        review.IsApproved = approved;
        review.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteReviewAsync(int reviewId, CancellationToken ct = default)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, ct);
        if (review is null) return false;
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> MarkInquiryReadAsync(int inquiryId, CancellationToken ct = default)
    {
        var inquiry = await _db.PropertyInquiries.FirstOrDefaultAsync(i => i.Id == inquiryId, ct);
        if (inquiry is null) return false;
        inquiry.IsRead = true;
        inquiry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // Village & Zone Management
    public async Task<List<VillageDto>> GetVillagesAsync(bool includeInactive, CancellationToken ct = default)
    {
        var query = _db.Villages.AsNoTracking().Include(v => v.Zones).Include(v => v.Properties).AsQueryable();
        if (!includeInactive)
            query = query.Where(v => v.IsActive);

        return await query
            .OrderBy(v => v.Name)
            .Select(v => new VillageDto(
                v.Id,
                v.Name,
                v.NameAr,
                v.Slug,
                v.ImageUrl,
                v.IsActive,
                v.Properties.Count(p => p.Status == PropertyStatus.Published || p.Status == PropertyStatus.Featured || p.Status == PropertyStatus.Reserved),
                v.Zones
                    .Where(z => includeInactive || z.IsActive)
                    .OrderBy(z => z.Name)
                    .Select(z => new ZoneDto(z.Id, z.VillageId, z.Name, z.NameAr, z.Slug, z.IsActive))
                    .ToList()))
            .ToListAsync(ct);
    }

    public async Task<VillageDto?> GetVillageByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.Villages.AsNoTracking()
            .Include(v => v.Zones)
            .Include(v => v.Properties)
            .Where(v => v.Id == id)
            .Select(v => new VillageDto(
                v.Id,
                v.Name,
                v.NameAr,
                v.Slug,
                v.ImageUrl,
                v.IsActive,
                v.Properties.Count(p => p.Status == PropertyStatus.Published || p.Status == PropertyStatus.Featured || p.Status == PropertyStatus.Reserved),
                v.Zones.OrderBy(z => z.Name)
                    .Select(z => new ZoneDto(z.Id, z.VillageId, z.Name, z.NameAr, z.Slug, z.IsActive))
                    .ToList()))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> VillageSlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        return await _db.Villages.AnyAsync(v => v.Slug == normalized && (!excludeId.HasValue || v.Id != excludeId.Value), ct);
    }

    public async Task<VillageDto> AddVillageAsync(Village village, CancellationToken ct = default)
    {
        _db.Villages.Add(village);
        await _db.SaveChangesAsync(ct);
        return new VillageDto(village.Id, village.Name, village.NameAr, village.Slug, village.ImageUrl, village.IsActive, 0, new());
    }

    public async Task<bool> UpdateVillageAsync(int id, string? name, string? nameAr, string? slug, string? imageUrl, bool? isActive, CancellationToken ct = default)
    {
        var village = await _db.Villages.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (village is null) return false;
        if (!string.IsNullOrWhiteSpace(name)) village.Name = name.Trim();
        if (nameAr is not null) village.NameAr = string.IsNullOrWhiteSpace(nameAr) ? null : nameAr.Trim();
        if (!string.IsNullOrWhiteSpace(slug)) village.Slug = slug.Trim().ToLowerInvariant();
        if (imageUrl is not null) village.ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        if (isActive.HasValue) village.IsActive = isActive.Value;
        village.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool Success, string? Error)> DeleteVillageAsync(int id, CancellationToken ct = default)
    {
        var village = await _db.Villages.Include(v => v.Zones).FirstOrDefaultAsync(v => v.Id == id, ct);
        if (village is null) return (false, "Village not found.");

        var hasProps = await _db.Properties.AnyAsync(p => p.VillageId == id, ct);
        if (hasProps)
            return (false, "Cannot delete village because properties are assigned to it. You may deactivate it instead.");

        _db.Villages.Remove(village);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    public async Task<List<ZoneDto>> GetZonesByVillageIdAsync(int villageId, bool includeInactive, CancellationToken ct = default)
    {
        var query = _db.Zones.AsNoTracking().Where(z => z.VillageId == villageId);
        if (!includeInactive)
            query = query.Where(z => z.IsActive);

        return await query
            .OrderBy(z => z.Name)
            .Select(z => new ZoneDto(z.Id, z.VillageId, z.Name, z.NameAr, z.Slug, z.IsActive))
            .ToListAsync(ct);
    }

    public async Task<ZoneDto?> GetZoneByIdAsync(int villageId, int zoneId, CancellationToken ct = default)
    {
        return await _db.Zones.AsNoTracking()
            .Where(z => z.VillageId == villageId && z.Id == zoneId)
            .Select(z => new ZoneDto(z.Id, z.VillageId, z.Name, z.NameAr, z.Slug, z.IsActive))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> ZoneSlugExistsAsync(int villageId, string slug, int? excludeId = null, CancellationToken ct = default)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        return await _db.Zones.AnyAsync(z => z.VillageId == villageId && z.Slug == normalized && (!excludeId.HasValue || z.Id != excludeId.Value), ct);
    }

    public async Task<ZoneDto> AddZoneAsync(Zone zone, CancellationToken ct = default)
    {
        _db.Zones.Add(zone);
        await _db.SaveChangesAsync(ct);
        return new ZoneDto(zone.Id, zone.VillageId, zone.Name, zone.NameAr, zone.Slug, zone.IsActive);
    }

    public async Task<bool> UpdateZoneAsync(int villageId, int zoneId, string? name, string? nameAr, string? slug, bool? isActive, CancellationToken ct = default)
    {
        var zone = await _db.Zones.FirstOrDefaultAsync(z => z.VillageId == villageId && z.Id == zoneId, ct);
        if (zone is null) return false;
        if (!string.IsNullOrWhiteSpace(name)) zone.Name = name.Trim();
        if (nameAr is not null) zone.NameAr = string.IsNullOrWhiteSpace(nameAr) ? null : nameAr.Trim();
        if (!string.IsNullOrWhiteSpace(slug)) zone.Slug = slug.Trim().ToLowerInvariant();
        if (isActive.HasValue) zone.IsActive = isActive.Value;
        zone.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool Success, string? Error)> DeleteZoneAsync(int villageId, int zoneId, CancellationToken ct = default)
    {
        var zone = await _db.Zones.FirstOrDefaultAsync(z => z.VillageId == villageId && z.Id == zoneId, ct);
        if (zone is null) return (false, "Zone not found.");

        var hasProps = await _db.Properties.AnyAsync(p => p.ZoneId == zoneId, ct);
        if (hasProps)
            return (false, "Cannot delete zone because properties are assigned to it. You may deactivate it instead.");

        _db.Zones.Remove(zone);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    // Property Types Management
    public async Task<List<PropertyTypeDto>> GetPropertyTypesAsync(CancellationToken ct = default)
    {
        return await _db.PropertyTypes.AsNoTracking()
            .OrderBy(pt => pt.Id)
            .Select(pt => new PropertyTypeDto(pt.Id, pt.Name, pt.Slug, pt.Description, pt.Icon))
            .ToListAsync(ct);
    }

    public async Task<PropertyTypeDto?> GetPropertyTypeByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.PropertyTypes.AsNoTracking()
            .Where(pt => pt.Id == id)
            .Select(pt => new PropertyTypeDto(pt.Id, pt.Name, pt.Slug, pt.Description, pt.Icon))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> PropertyTypeSlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        return await _db.PropertyTypes.AnyAsync(pt => pt.Slug == normalized && (!excludeId.HasValue || pt.Id != excludeId.Value), ct);
    }

    public async Task<PropertyTypeDto> AddPropertyTypeAsync(PropertyType type, CancellationToken ct = default)
    {
        _db.PropertyTypes.Add(type);
        await _db.SaveChangesAsync(ct);
        return new PropertyTypeDto(type.Id, type.Name, type.Slug, type.Description, type.Icon);
    }

    public async Task<bool> UpdatePropertyTypeAsync(int id, string? name, string? slug, string? description, string? icon, CancellationToken ct = default)
    {
        var pt = await _db.PropertyTypes.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (pt is null) return false;
        if (!string.IsNullOrWhiteSpace(name)) pt.Name = name.Trim();
        if (!string.IsNullOrWhiteSpace(slug)) pt.Slug = slug.Trim().ToLowerInvariant();
        if (description is not null) pt.Description = description;
        if (icon is not null) pt.Icon = icon;
        pt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool Success, string? Error)> DeletePropertyTypeAsync(int id, CancellationToken ct = default)
    {
        var pt = await _db.PropertyTypes.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (pt is null) return (false, "Property type not found.");

        var hasProps = await _db.Properties.AnyAsync(p => p.PropertyTypeId == id, ct);
        if (hasProps)
            return (false, "Cannot delete property type because properties are assigned to it.");

        _db.PropertyTypes.Remove(pt);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}
