using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Domain.Rules;

namespace Application.Services;

public interface IPropertyService
{
    Task<ServiceResult<PagedResult<PropertyListDto>>> SearchAsync(PropertyQuery query, bool isAdmin, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> GetByIdAsync(int id, bool isAdmin, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> GetBySlugAsync(string slug, bool isAdmin, CancellationToken ct = default);
    Task<ServiceResult<List<PropertyListDto>>> GetFeaturedAsync(int count, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> QuickSearchAsync(string term, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<List<PropertyListDto>>> GetRelatedAsync(int id, int count, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> MyPropertiesAsync(int ownerId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> CreateAsync(int userId, string role, CreatePropertyRequest request, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> UpdateAsync(int userId, bool isAdmin, int id, UpdatePropertyRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteAsync(int userId, bool isAdmin, int id, CancellationToken ct = default);
}

public sealed class PropertyService : IPropertyService
{
    private readonly IPropertyStore _store;
    private readonly IAuditWriter _audit;
    private static readonly Random ReferenceRandom = new();

    public PropertyService(IPropertyStore store, IAuditWriter audit)
    {
        _store = store;
        _audit = audit;
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> SearchAsync(PropertyQuery query, bool isAdmin, CancellationToken ct = default)
    {
        query.Page = query.Page < 1 ? 1 : query.Page;
        query.PageSize = Math.Clamp(query.PageSize, 1, 50);
        var result = await _store.SearchAsync(query, isAdmin, ct);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(result);
    }

    public async Task<ServiceResult<PropertyDetailsDto>> GetByIdAsync(int id, bool isAdmin, CancellationToken ct = default)
    {
        var dto = await _store.GetDetailsAsync(id, isAdmin, ct);
        return dto is null
            ? ServiceResult<PropertyDetailsDto>.NotFound("Property not found.")
            : ServiceResult<PropertyDetailsDto>.Ok(dto);
    }

    public async Task<ServiceResult<PropertyDetailsDto>> GetBySlugAsync(string slug, bool isAdmin, CancellationToken ct = default)
    {
        var dto = await _store.GetDetailsBySlugAsync(slug, isAdmin, ct);
        return dto is null
            ? ServiceResult<PropertyDetailsDto>.NotFound("Property not found.")
            : ServiceResult<PropertyDetailsDto>.Ok(dto);
    }

    public async Task<ServiceResult<List<PropertyListDto>>> GetFeaturedAsync(int count, CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 24);
        return ServiceResult<List<PropertyListDto>>.Ok(await _store.GetFeaturedAsync(count, ct));
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> QuickSearchAsync(string term, int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 50);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(
            await _store.QuickSearchAsync(term.Trim(), page, pageSize, ct));
    }

    public async Task<ServiceResult<List<PropertyListDto>>> GetRelatedAsync(int id, int count, CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 12);
        return ServiceResult<List<PropertyListDto>>.Ok(await _store.GetRelatedAsync(id, count, ct));
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> MyPropertiesAsync(int ownerId, int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 50);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(
            await _store.GetMineAsync(ownerId, page, pageSize, ct));
    }

    public async Task<ServiceResult<PropertyDetailsDto>> CreateAsync(int userId, string role, CreatePropertyRequest request, CancellationToken ct = default)
    {
        if (role is not ("Seller" or "Agent" or "Admin"))
            return ServiceResult<PropertyDetailsDto>.Fail("Only sellers, agents and admins can list properties.", 403);

        if (!await _store.PropertyTypeExistsAsync(request.PropertyTypeId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Property type not found.", 422,
                new() { new("Property type not found.", "propertyTypeId") });

        if (!await _store.LocationExistsAsync(request.LocationId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Location not found.", 422,
                new() { new("Location not found.", "locationId") });

        var baseSlug = SlugHelper.GenerateSlug(request.Title);
        var slug = SlugHelper.UniqueSlug(baseSlug,
            s => _store.SlugExistsAsync(s).GetAwaiter().GetResult());

        string reference;
        do { reference = $"DAR-{ReferenceRandom.Next(100000, 999999)}"; }
        while (await _store.ReferenceExistsAsync(reference, ct));

        var property = new Property
        {
            Title = request.Title.Trim(),
            Slug = slug,
            ReferenceNumber = reference,
            Description = request.Description?.Trim(),
            PropertyTypeId = request.PropertyTypeId,
            Status = role == "Admin" ? PropertyStatus.Published : PropertyStatus.Draft,
            Purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "EGP" : request.Currency.Trim().ToUpperInvariant(),
            Area = request.Area,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Floor = request.Floor,
            TotalFloors = request.TotalFloors,
            BuiltYear = request.BuiltYear,
            FurnishedStatus = request.FurnishedStatus,
            FinishingStatus = request.FinishingStatus,
            Parking = request.Parking,
            Garden = request.Garden,
            Pool = request.Pool,
            SeaView = request.SeaView,
            BeachAccess = request.BeachAccess,
            LocationId = request.LocationId,
            Address = request.Address,
            Developer = request.Developer,
            OwnerId = userId
        };

        await _store.AddAsync(property, ct);
        await _store.SaveChangesAsync(ct);

        var details = await _store.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Created(details!,
            role == "Admin" ? "Property published." : "Property saved as draft.");
    }

    public async Task<ServiceResult<PropertyDetailsDto>> UpdateAsync(int userId, bool isAdmin, int id, UpdatePropertyRequest request, CancellationToken ct = default)
    {
        var property = await _store.GetEntityAsync(id, ct);
        if (property is null)
            return ServiceResult<PropertyDetailsDto>.NotFound("Property not found.");

        if (!isAdmin && property.OwnerId != userId)
            return ServiceResult<PropertyDetailsDto>.Fail("You can only edit your own properties.", 403);

        // Locked states: writers cannot touch sold/rented/archived inventory.
        if (!isAdmin && property.Status is PropertyStatus.Sold or PropertyStatus.Rented or PropertyStatus.Archived)
            return ServiceResult<PropertyDetailsDto>.Fail($"Property is {property.Status} and can no longer be edited.", 409);

        if (request.Status is not null)
        {
            var status = Enum.Parse<PropertyStatus>(request.Status.Replace(" ", ""), true);
            if (!isAdmin && !PropertyRules.CanWriterSetStatus(status))
                return ServiceResult<PropertyDetailsDto>.Fail("Only admins can publish or change lifecycle status.", 403);
            property.Status = status;
        }

        if (request.Title is not null && request.Title.Trim() != property.Title)
        {
            property.Title = request.Title.Trim();
            var baseSlug = SlugHelper.GenerateSlug(property.Title);
            property.Slug = SlugHelper.UniqueSlug(baseSlug,
                s => _store.SlugExistsAsync(s, id).GetAwaiter().GetResult());
        }
        if (request.Description is not null) property.Description = request.Description.Trim();
        if (request.PropertyTypeId.HasValue)
        {
            if (!await _store.PropertyTypeExistsAsync(request.PropertyTypeId.Value, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Property type not found.", 422,
                    new() { new("Property type not found.", "propertyTypeId") });
            property.PropertyTypeId = request.PropertyTypeId.Value;
        }
        if (request.Purpose is not null) property.Purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true);
        if (request.Price.HasValue) property.Price = request.Price.Value;
        if (request.Currency is not null) property.Currency = request.Currency.Trim().ToUpperInvariant();
        if (request.Area.HasValue) property.Area = request.Area;
        if (request.Bedrooms.HasValue) property.Bedrooms = request.Bedrooms;
        if (request.Bathrooms.HasValue) property.Bathrooms = request.Bathrooms;
        if (request.Floor.HasValue) property.Floor = request.Floor;
        if (request.TotalFloors.HasValue) property.TotalFloors = request.TotalFloors;
        if (request.BuiltYear.HasValue) property.BuiltYear = request.BuiltYear;
        if (request.FurnishedStatus is not null) property.FurnishedStatus = request.FurnishedStatus;
        if (request.FinishingStatus is not null) property.FinishingStatus = request.FinishingStatus;
        if (request.Parking.HasValue) property.Parking = request.Parking.Value;
        if (request.Garden.HasValue) property.Garden = request.Garden.Value;
        if (request.Pool.HasValue) property.Pool = request.Pool.Value;
        if (request.SeaView.HasValue) property.SeaView = request.SeaView.Value;
        if (request.BeachAccess.HasValue) property.BeachAccess = request.BeachAccess.Value;
        if (request.LocationId.HasValue)
        {
            if (!await _store.LocationExistsAsync(request.LocationId.Value, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Location not found.", 422,
                    new() { new("Location not found.", "locationId") });
            property.LocationId = request.LocationId.Value;
        }
        if (request.Address is not null) property.Address = request.Address;
        if (request.Developer is not null) property.Developer = request.Developer;
        if (request.IsFeatured.HasValue || request.IsVerified.HasValue)
        {
            if (!isAdmin)
                return ServiceResult<PropertyDetailsDto>.Fail("Only admins can change spotlight or verification flags.", 403);
            if (request.IsFeatured.HasValue) property.IsFeatured = request.IsFeatured.Value;
            if (request.IsVerified.HasValue) property.IsVerified = request.IsVerified.Value;
        }
        property.UpdatedAt = DateTime.UtcNow;

        await _store.SaveChangesAsync(ct);
        await _audit.LogAsync(userId, "property.edited", "Property",
            property.Id.ToString(), null, null, null, ct);
        var details = await _store.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Ok(details!, "Property updated.");
    }

    public async Task<ServiceResult<object?>> DeleteAsync(int userId, bool isAdmin, int id, CancellationToken ct = default)
    {
        var property = await _store.GetEntityAsync(id, ct);
        if (property is null)
            return ServiceResult<object?>.NotFound("Property not found.");

        if (!isAdmin && property.OwnerId != userId)
            return ServiceResult<object?>.Fail("You can only delete your own properties.", 403);

        // Soft delete: archive keeps request history and FK integrity intact.
        property.Status = PropertyStatus.Archived;
        property.UpdatedAt = DateTime.UtcNow;
        await _store.SaveChangesAsync(ct);
        await _audit.LogAsync(userId, "property.archived", "Property",
            property.Id.ToString(), null, "Archived", null, ct);
        return ServiceResult<object?>.Ok(null, "Property archived.");
    }
}
