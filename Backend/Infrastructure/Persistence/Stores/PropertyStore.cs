using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Domain.Rules;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Stores;

public sealed class PropertyStore : IPropertyStore
{
    private static readonly PropertyStatus[] PublicListStatuses =
    {
        PropertyStatus.Published,
        PropertyStatus.Featured,
        PropertyStatus.Reserved
    };

    private readonly DarcomDbContext _db;

    public PropertyStore(DarcomDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<PropertyListDto>> SearchAsync(PropertyQuery q, bool includeAllStatuses, CancellationToken ct = default)
    {
        var query = _db.Properties.AsNoTracking().AsQueryable();

        if (includeAllStatuses && !string.IsNullOrWhiteSpace(q.Status)
            && Enum.TryParse<PropertyStatus>(q.Status.Replace(" ", ""), true, out var adminStatus))
        {
            query = query.Where(p => p.Status == adminStatus);
        }
        else
        {
            query = query.Where(p => PublicListStatuses.Contains(p.Status));
        }

        query = ApplyFilters(query, q);
        query = ApplySort(query, q.Sort);

        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)q.PageSize));

        var entities = await query
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .ToListAsync(ct);

        var data = entities.Select(ToListDto).ToList();
        return new PagedResult<PropertyListDto>(data, q.Page, q.PageSize, total, totalPages);
    }

    public async Task<PropertyDetailsDto?> GetDetailsAsync(int id, bool isAdmin, CancellationToken ct = default)
    {
        var entity = await DetailsQuery(isAdmin)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        return entity is null ? null : ToDetailsDto(entity);
    }

    public async Task<PropertyDetailsDto?> GetDetailsBySlugAsync(string slug, bool isAdmin, CancellationToken ct = default)
    {
        var lowered = slug.ToLowerInvariant();
        var entity = await DetailsQuery(isAdmin)
            .FirstOrDefaultAsync(p => p.Slug == lowered, ct);
        return entity is null ? null : ToDetailsDto(entity);
    }

    private IQueryable<Property> DetailsQuery(bool isAdmin)
    {
        var query = _db.Properties.AsNoTracking().AsQueryable();
        if (!isAdmin)
            query = query.Where(p => p.Status == PropertyStatus.Published
                || p.Status == PropertyStatus.Featured
                || p.Status == PropertyStatus.Reserved
                || p.Status == PropertyStatus.Sold
                || p.Status == PropertyStatus.Rented);
        return query
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Location).ThenInclude(l => l!.Area)
            .Include(p => p.Agent)
            .Include(p => p.Images)
            .Include(p => p.PropertyAmenities).ThenInclude(pa => pa.Amenity)
            .Include(p => p.Features);
    }

    public async Task<List<PropertyListDto>> GetFeaturedAsync(int count, CancellationToken ct = default)
    {
        var entities = await _db.Properties.AsNoTracking()
            .Where(p => p.IsFeatured && PublicListStatuses.Contains(p.Status))
            .OrderByDescending(p => p.CreatedAt)
            .Take(count)
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .ToListAsync(ct);
        return entities.Select(ToListDto).ToList();
    }

    public async Task<PagedResult<PropertyListDto>> QuickSearchAsync(string term, int page, int pageSize, CancellationToken ct = default)
    {
        var lowered = term.ToLowerInvariant();
        var query = _db.Properties.AsNoTracking()
            .Where(p => PublicListStatuses.Contains(p.Status))
            .Where(p => p.Title.ToLower().Contains(lowered)
                || (p.Description != null && p.Description.ToLower().Contains(lowered))
                || p.Village.Name.ToLower().Contains(lowered)
                || (p.Zone != null && p.Zone.Name.ToLower().Contains(lowered))
                || (p.BuildingNumber != null && p.BuildingNumber.ToLower().Contains(lowered))
                || (p.Location != null && p.Location.Name.ToLower().Contains(lowered))
                || (p.Location != null && p.Location.City.Name.ToLower().Contains(lowered))
                || p.PropertyType.Name.ToLower().Contains(lowered))
            .OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));

        var entities = await query
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var data = entities.Select(ToListDto).ToList();
        return new PagedResult<PropertyListDto>(data, page, pageSize, total, totalPages);
    }

    public Task<Property?> GetEntityAsync(int id, CancellationToken ct = default)
        => _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<bool> SlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default)
        => _db.Properties.AnyAsync(p => p.Slug == slug && (!excludeId.HasValue || p.Id != excludeId), ct);

    public Task<bool> ReferenceExistsAsync(string reference, CancellationToken ct = default)
        => _db.Properties.AnyAsync(p => p.ReferenceNumber == reference, ct);

    public Task<bool> PropertyTypeExistsAsync(int id, CancellationToken ct = default)
        => _db.PropertyTypes.AnyAsync(t => t.Id == id, ct);

    public Task<bool> LocationExistsAsync(int id, CancellationToken ct = default)
        => _db.Locations.AnyAsync(l => l.Id == id, ct);

    public Task<bool> VillageExistsAsync(int id, CancellationToken ct = default)
        => _db.Villages.AnyAsync(v => v.Id == id, ct);

    public Task<bool> ZoneExistsAsync(int id, CancellationToken ct = default)
        => _db.Zones.AnyAsync(z => z.Id == id, ct);

    public Task<bool> ZoneBelongsToVillageAsync(int zoneId, int villageId, CancellationToken ct = default)
        => _db.Zones.AnyAsync(z => z.Id == zoneId && z.VillageId == villageId, ct);

    public async Task AddAsync(Property property, CancellationToken ct = default)
        => await _db.Properties.AddAsync(property, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    public async Task<PropertyImage> AttachImageAsync(int propertyId, string url, string? altText, CancellationToken ct = default)
    {
        var order = await _db.PropertyImages.CountAsync(i => i.PropertyId == propertyId, ct);
        var image = new PropertyImage
        {
            PropertyId = propertyId,
            Url = url,
            Order = order,
            IsPrimary = order == 0,
            AltText = altText
        };
        await _db.PropertyImages.AddAsync(image, ct);
        return image;
    }

    public async Task<PropertyVideo> AttachVideoAsync(int propertyId, string url, string? type, CancellationToken ct = default)
    {
        var order = await _db.PropertyVideos.CountAsync(v => v.PropertyId == propertyId, ct);
        var video = new PropertyVideo
        {
            PropertyId = propertyId,
            Url = url,
            Type = type,
            Order = order,
            IsPrimary = order == 0
        };
        await _db.PropertyVideos.AddAsync(video, ct);
        return video;
    }

    public async Task<PropertyDocument> AttachDocumentAsync(int propertyId, string url, string? type, CancellationToken ct = default)
    {
        var order = await _db.PropertyDocuments.CountAsync(d => d.PropertyId == propertyId, ct);
        var document = new PropertyDocument
        {
            PropertyId = propertyId,
            Url = url,
            Type = type,
            Order = order
        };
        await _db.PropertyDocuments.AddAsync(document, ct);
        return document;
    }

    public async Task SetFeaturesAsync(int propertyId, List<(string Title, string? Value)> features, CancellationToken ct = default)
    {
        var existing = await _db.PropertyFeatures.Where(f => f.PropertyId == propertyId).ToListAsync(ct);
        _db.PropertyFeatures.RemoveRange(existing);
        foreach (var (title, value) in features)
            await _db.PropertyFeatures.AddAsync(new PropertyFeature { PropertyId = propertyId, Title = title, Value = value }, ct);
    }

    public async Task SetAmenitiesAsync(int propertyId, List<int> amenityIds, CancellationToken ct = default)
    {
        var existing = await _db.PropertyAmenities.Where(pa => pa.PropertyId == propertyId).ToListAsync(ct);
        _db.PropertyAmenities.RemoveRange(existing);
        foreach (var amenityId in amenityIds.Distinct())
            await _db.PropertyAmenities.AddAsync(new PropertyAmenity { PropertyId = propertyId, AmenityId = amenityId }, ct);
    }

    public async Task<List<MediaItemDto>> GetMediaAsync(int propertyId, CancellationToken ct = default)
    {
        var images = await _db.PropertyImages.AsNoTracking()
            .Where(i => i.PropertyId == propertyId).OrderBy(i => i.Order)
            .Select(i => new MediaItemDto("image", i.Id, i.Url, null, i.Order, i.IsPrimary, i.AltText))
            .ToListAsync(ct);
        var videos = await _db.PropertyVideos.AsNoTracking()
            .Where(v => v.PropertyId == propertyId).OrderBy(v => v.Order)
            .Select(v => new MediaItemDto("video", v.Id, v.Url, v.Type, v.Order, v.IsPrimary, v.AltText))
            .ToListAsync(ct);
        var documents = await _db.PropertyDocuments.AsNoTracking()
            .Where(d => d.PropertyId == propertyId).OrderBy(d => d.Order)
            .Select(d => new MediaItemDto("document", d.Id, d.Url, d.Type, d.Order, false, d.AltText))
            .ToListAsync(ct);
        return images.Concat(videos).Concat(documents).ToList();
    }

    public async Task<(int PropertyId, int? OwnerId, string Url)?> PeekMediaAsync(string kind, int mediaId, CancellationToken ct = default)
    {
        return kind switch
        {
            "image" => await _db.PropertyImages.AsNoTracking()
                .Where(i => i.Id == mediaId).Select(i => new { i.PropertyId, i.Property.OwnerId, i.Url })
                .FirstOrDefaultAsync(ct) is { } i ? (i.PropertyId, i.OwnerId, i.Url) : null,
            "video" => await _db.PropertyVideos.AsNoTracking()
                .Where(v => v.Id == mediaId).Select(v => new { v.PropertyId, v.Property.OwnerId, v.Url })
                .FirstOrDefaultAsync(ct) is { } v ? (v.PropertyId, v.OwnerId, v.Url) : null,
            "document" => await _db.PropertyDocuments.AsNoTracking()
                .Where(d => d.Id == mediaId).Select(d => new { d.PropertyId, d.Property.OwnerId, d.Url })
                .FirstOrDefaultAsync(ct) is { } d ? (d.PropertyId, d.OwnerId, d.Url) : null,
            _ => null
        };
    }

    public async Task<(string Kind, int PropertyId, string Url)?> RemoveMediaAsync(string kind, int mediaId, CancellationToken ct = default)
    {
        switch (kind)
        {
            case "image":
            {
                var image = await _db.PropertyImages.FirstOrDefaultAsync(i => i.Id == mediaId, ct);
                if (image is null) return null;
                _db.PropertyImages.Remove(image);
                return ("image", image.PropertyId, image.Url);
            }
            case "video":
            {
                var video = await _db.PropertyVideos.FirstOrDefaultAsync(v => v.Id == mediaId, ct);
                if (video is null) return null;
                _db.PropertyVideos.Remove(video);
                return ("video", video.PropertyId, video.Url);
            }
            case "document":
            {
                var document = await _db.PropertyDocuments.FirstOrDefaultAsync(d => d.Id == mediaId, ct);
                if (document is null) return null;
                _db.PropertyDocuments.Remove(document);
                return ("document", document.PropertyId, document.Url);
            }
            default:
                return null;
        }
    }

    public Task<int?> GetOwnerIdAsync(int propertyId, CancellationToken ct = default)
        => _db.Properties.Where(p => p.Id == propertyId).Select(p => p.OwnerId).FirstOrDefaultAsync(ct);

    public Task<bool> CanUserManagePropertyAsync(int propertyId, int userId, CancellationToken ct = default)
        => _db.Properties.AnyAsync(p => p.Id == propertyId && (p.OwnerId == userId || p.CreatedByUserId == userId), ct);

    /// <summary>Owner's own submissions in any status (seller status tracker).</summary>
    public async Task<PagedResult<PropertyListDto>> GetMineAsync(int ownerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Properties.AsNoTracking()
            .Where(p => p.OwnerId == ownerId || p.CreatedByUserId == ownerId)
            .OrderByDescending(p => p.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var entities = await query
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return new PagedResult<PropertyListDto>(
            entities.Select(ToListDto).ToList(), page, pageSize, total, totalPages);
    }

    public async Task<PagedResult<PropertyListDto>> GetBrokerPropertiesAsync(int brokerUserId, string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Properties.AsNoTracking()
            .Where(p => p.CreatedByUserId == brokerUserId || p.OwnerId == brokerUserId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PropertyStatus>(status.Replace(" ", ""), true, out var parsedStatus))
        {
            query = query.Where(p => p.Status == parsedStatus);
        }

        query = query.OrderByDescending(p => p.CreatedAt);
        var total = await query.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var entities = await query
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PropertyListDto>(
            entities.Select(ToListDto).ToList(), page, pageSize, total, totalPages);
    }

    public async Task<(int Total, int Pending, int Approved, int Rejected)> GetBrokerPropertyCountsAsync(int brokerUserId, CancellationToken ct = default)
    {
        var query = _db.Properties.AsNoTracking()
            .Where(p => p.CreatedByUserId == brokerUserId || p.OwnerId == brokerUserId);

        var total = await query.CountAsync(ct);
        var pending = await query.CountAsync(p => p.Status == PropertyStatus.PendingReview, ct);
        var approved = await query.CountAsync(p => p.Status == PropertyStatus.Published || p.Status == PropertyStatus.Featured, ct);
        var rejected = await query.CountAsync(p => p.Status == PropertyStatus.Rejected, ct);

        return (total, pending, approved, rejected);
    }

    /// <summary>
    /// Similar-properties heuristic: same type, then same village/city, then closest price.
    /// </summary>
    public async Task<List<PropertyListDto>> GetRelatedAsync(int propertyId, int count, CancellationToken ct = default)
    {
        var current = await _db.Properties.AsNoTracking()
            .Where(p => p.Id == propertyId)
            .Select(p => new { p.PropertyTypeId, p.VillageId, p.Price })
            .FirstOrDefaultAsync(ct);
        if (current is null) return new();

        var candidates = await _db.Properties.AsNoTracking()
            .Where(p => p.Id != propertyId
                && p.PropertyTypeId == current.PropertyTypeId
                && (p.Status == PropertyStatus.Published
                    || p.Status == PropertyStatus.Featured
                    || p.Status == PropertyStatus.Reserved))
            .Include(p => p.PropertyType)
            .Include(p => p.Village)
            .Include(p => p.Zone)
            .Include(p => p.Location).ThenInclude(l => l!.City)
            .Include(p => p.Images)
            .Take(50)
            .ToListAsync(ct);

        return candidates
            .OrderBy(p => p.VillageId == current.VillageId ? 0 : 1)
            .ThenBy(p => Math.Abs(p.Price - current.Price))
            .Take(Math.Clamp(count, 1, 12))
            .Select(ToListDto)
            .ToList();
    }

    public async Task<List<RentalPeriodDto>> GetOwnerRentalPeriodsAsync(int ownerId, int? propertyId = null, CancellationToken ct = default)
    {
        var query = _db.RentalPeriods.AsNoTracking()
            .Where(rp => rp.Property.OwnerId == ownerId);
        if (propertyId.HasValue)
            query = query.Where(rp => rp.PropertyId == propertyId.Value);

        return await query.OrderByDescending(rp => rp.StartDate)
            .Select(rp => new RentalPeriodDto(
                rp.Id, rp.PropertyId, rp.BookingRequestId,
                rp.StartDate, rp.EndDate, rp.RenterName, rp.RenterPhone, rp.Notes, rp.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<List<RentalPeriodDto>> GetPropertyRentalPeriodsAsync(int propertyId, CancellationToken ct = default)
    {
        return await _db.RentalPeriods.AsNoTracking()
            .Where(rp => rp.PropertyId == propertyId)
            .OrderByDescending(rp => rp.StartDate)
            .Select(rp => new RentalPeriodDto(
                rp.Id, rp.PropertyId, rp.BookingRequestId,
                rp.StartDate, rp.EndDate, rp.RenterName, rp.RenterPhone, rp.Notes, rp.CreatedAt))
            .ToListAsync(ct);
    }

    public Task<bool> AmenityExistsAsync(int amenityId, CancellationToken ct = default)
        => _db.Amenities.AnyAsync(a => a.Id == amenityId, ct);

    private static IQueryable<Property> ApplyFilters(IQueryable<Property> query, PropertyQuery q)
    {
        if (!string.IsNullOrWhiteSpace(q.Purpose) && Enum.TryParse<PropertyPurpose>(q.Purpose, true, out var purpose))
            query = query.Where(p => p.Purpose == purpose);

        if (!string.IsNullOrWhiteSpace(q.Type))
        {
            var type = q.Type.Trim().ToLowerInvariant();
            query = query.Where(p => p.PropertyType.Slug == type);
        }

        // North Coast Village filter (by id or slug)
        if (!string.IsNullOrWhiteSpace(q.Village))
        {
            var v = q.Village.Trim().ToLowerInvariant();
            if (int.TryParse(v, out var vId))
                query = query.Where(p => p.VillageId == vId);
            else
                query = query.Where(p => p.Village.Slug == v || p.Village.Name.ToLower() == v);
        }

        // North Coast Zone filter (by id or slug)
        if (!string.IsNullOrWhiteSpace(q.Zone))
        {
            var z = q.Zone.Trim().ToLowerInvariant();
            if (int.TryParse(z, out var zId))
                query = query.Where(p => p.ZoneId == zId);
            else
                query = query.Where(p => p.Zone != null && (p.Zone.Slug == z || p.Zone.Name.ToLower() == z));
        }

        // BuildingNumber filter
        if (!string.IsNullOrWhiteSpace(q.BuildingNumber))
        {
            var b = q.BuildingNumber.Trim().ToLowerInvariant();
            query = query.Where(p => p.BuildingNumber != null && p.BuildingNumber.ToLower().Contains(b));
        }

        // Legacy location filter
        if (!string.IsNullOrWhiteSpace(q.Location))
        {
            var loc = q.Location.Trim().ToLowerInvariant();
            query = query.Where(p => (p.Location != null && p.Location.City.Slug == loc)
                || (p.Location != null && p.Location.Area != null && p.Location.Area.Slug == loc)
                || p.Village.Slug == loc);
        }

        if (q.MinPrice.HasValue) query = query.Where(p => p.Price >= q.MinPrice.Value);
        if (q.MaxPrice.HasValue) query = query.Where(p => p.Price <= q.MaxPrice.Value);
        if (q.Bedrooms.HasValue) query = query.Where(p => p.Bedrooms >= q.Bedrooms.Value);
        if (q.Bathrooms.HasValue) query = query.Where(p => p.Bathrooms >= q.Bathrooms.Value);
        if (q.MinArea.HasValue) query = query.Where(p => p.Area >= q.MinArea.Value);

        if (q.Furnished == true)
            query = query.Where(p => p.FurnishedStatus != null && p.FurnishedStatus != "Unfurnished");
        if (q.Pool == true) query = query.Where(p => p.Pool);
        if (q.Garden == true) query = query.Where(p => p.Garden);
        if (q.SeaView == true) query = query.Where(p => p.SeaView);
        if (q.BeachAccess == true) query = query.Where(p => p.BeachAccess);
        if (q.Parking == true) query = query.Where(p => p.Parking);
        if (q.Featured == true) query = query.Where(p => p.IsFeatured);

        if (!string.IsNullOrWhiteSpace(q.Q))
        {
            var term = q.Q.Trim().ToLowerInvariant();
            query = query.Where(p => p.Title.ToLower().Contains(term)
                || (p.Description != null && p.Description.ToLower().Contains(term))
                || p.Village.Name.ToLower().Contains(term)
                || (p.Zone != null && p.Zone.Name.ToLower().Contains(term))
                || (p.BuildingNumber != null && p.BuildingNumber.ToLower().Contains(term)));
        }

        return query;
    }

    private static IQueryable<Property> ApplySort(IQueryable<Property> query, string? sort)
        => sort?.Trim().ToLowerInvariant() switch
        {
            "price_asc" => query.OrderBy(p => p.Price).ThenByDescending(p => p.Id),
            "price_desc" => query.OrderByDescending(p => p.Price).ThenByDescending(p => p.Id),
            "area_desc" => query.OrderByDescending(p => p.Area).ThenByDescending(p => p.Id),
            _ => query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id)
        };

    internal static PropertyListDto ToListDto(Property p)
        => new(
            p.Id, p.Title, p.Slug, p.ReferenceNumber, p.Price, p.Currency,
            p.Area, p.Bedrooms, p.Bathrooms,
            p.Purpose.ToString(), p.Status.ToString(),
            p.PropertyType?.Name ?? "", p.PropertyType?.Slug ?? "",
            p.Location?.City?.Name ?? "North Coast",
            p.Village?.Name ?? p.Location?.Name ?? "",
            p.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.Order)
                .Select(i => i.Url).FirstOrDefault(),
            p.IsFeatured, p.SeaView, p.Pool, p.BeachAccess, p.Parking, p.CreatedAt,
            p.VillageId,
            p.Village?.Name ?? "",
            p.Village?.Slug ?? "",
            p.ZoneId,
            p.Zone?.Name,
            p.Zone?.Slug,
            p.BuildingNumber,
            p.RejectionReason);

    private static PropertyDetailsDto ToDetailsDto(Property p)
        => new(
            p.Id, p.Title, p.Slug, p.ReferenceNumber, p.Description,
            p.Price, p.Currency, p.Area, p.Bedrooms, p.Bathrooms,
            p.Floor, p.TotalFloors, p.BuiltYear, p.DeliveryDate,
            p.FurnishedStatus, p.FinishingStatus,
            p.Parking, p.Garden, p.Pool, p.SeaView, p.BeachAccess,
            p.Purpose.ToString(), p.Status.ToString(),
            p.PropertyType?.Name ?? "", p.PropertyType?.Slug ?? "",
            p.Location?.City?.Name ?? "North Coast",
            p.Location?.Area != null ? p.Location.Area.Name : null,
            p.Village?.Name ?? p.Location?.Name ?? "",
            p.Address, p.Latitude, p.Longitude,
            p.Developer, p.IsVerified, p.IsFeatured, p.ViewCount,
            p.Agent == null ? null : new PropertyAgentDto(p.Agent.Id, p.Agent.Name, p.Agent.Title, p.Agent.Agency, p.Agent.Phone, p.Agent.Email, p.Agent.PhotoUrl, p.Agent.IsVerified),
            p.Images.OrderBy(i => i.Order).Select(i => new PropertyImageDto(i.Url, i.Order, i.IsPrimary, i.AltText)).ToList(),
            p.PropertyAmenities.Select(pa => new PropertyAmenityDto(pa.Amenity.Id, pa.Amenity.Name, pa.Amenity.Icon)).ToList(),
            p.Features.Select(f => new PropertyFeatureDto(f.Title, f.Value)).ToList(),
            p.CreatedAt,
            p.VillageId,
            p.Village?.Name ?? "",
            p.Village?.Slug ?? "",
            p.ZoneId,
            p.Zone?.Name,
            p.Zone?.Slug,
            p.BuildingNumber,
            p.CreatedByUserId,
            p.RejectionReason);
}
