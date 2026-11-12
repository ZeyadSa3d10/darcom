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
    Task<ServiceResult<List<PropertyListDto>>> GetFeaturedAsync(int count, string? purpose = null, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> QuickSearchAsync(string term, string? purpose = null, int page = 1, int pageSize = 12, CancellationToken ct = default);
    Task<ServiceResult<List<PropertyListDto>>> GetRelatedAsync(int id, int count, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> MyPropertiesAsync(int ownerId, int page, int pageSize, CancellationToken ct = default);
    Task<ServiceResult<List<RentalPeriodDto>>> GetRentalPeriodsAsync(int userId, bool isAdmin, int? propertyId = null, CancellationToken ct = default);
    Task<ServiceResult<List<PublicRentalPeriodDto>>> GetPublicRentalPeriodsAsync(int propertyId, CancellationToken ct = default);
    Task<ServiceResult<RentalPeriodDto>> AddAdminRentalPeriodAsync(int adminId, int propertyId, CreateRentalPeriodRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteAdminRentalPeriodAsync(int adminId, int propertyId, int periodId, CancellationToken ct = default);
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

    public async Task<ServiceResult<List<PropertyListDto>>> GetFeaturedAsync(int count, string? purpose = null, CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 24);
        return ServiceResult<List<PropertyListDto>>.Ok(await _store.GetFeaturedAsync(count, purpose, ct));
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> QuickSearchAsync(string term, string? purpose = null, int page = 1, int pageSize = 12, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 50);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(
            await _store.QuickSearchAsync(term.Trim(), purpose, page, pageSize, ct));
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

    public async Task<ServiceResult<List<RentalPeriodDto>>> GetRentalPeriodsAsync(int userId, bool isAdmin, int? propertyId = null, CancellationToken ct = default)
    {
        if (isAdmin)
        {
            var periods = propertyId.HasValue
                ? await _store.GetPropertyRentalPeriodsAsync(propertyId.Value, ct)
                : await _store.GetOwnerRentalPeriodsAsync(userId, null, ct);
            return ServiceResult<List<RentalPeriodDto>>.Ok(periods);
        }

        // Owners view their own properties' confirmed rental periods
        var ownerPeriods = await _store.GetOwnerRentalPeriodsAsync(userId, propertyId, ct);
        return ServiceResult<List<RentalPeriodDto>>.Ok(ownerPeriods);
    }

    public async Task<ServiceResult<List<PublicRentalPeriodDto>>> GetPublicRentalPeriodsAsync(int propertyId, CancellationToken ct = default)
    {
        var periods = await _store.GetPublicRentalPeriodsAsync(propertyId, ct);
        return ServiceResult<List<PublicRentalPeriodDto>>.Ok(periods);
    }

    public async Task<ServiceResult<RentalPeriodDto>> AddAdminRentalPeriodAsync(int adminId, int propertyId, CreateRentalPeriodRequest request, CancellationToken ct = default)
    {
        var property = await _store.GetEntityAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<RentalPeriodDto>.NotFound("Property not found.");

        if (request.StartDate >= request.EndDate)
            return ServiceResult<RentalPeriodDto>.Fail("End date must be after start date.", 422,
                new() { new("End date must be after start date.", "endDate") });

        if (await _store.HasOverlappingRentalPeriodAsync(propertyId, request.StartDate, request.EndDate, null, ct))
        {
            return ServiceResult<RentalPeriodDto>.Fail("This property already has an overlapping confirmed rental reservation for these dates.", 409,
                new() { new("Property has an overlapping confirmed reservation.", "dates") });
        }

        var period = new RentalPeriod
        {
            PropertyId = propertyId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            RenterName = string.IsNullOrWhiteSpace(request.RenterName) ? "Direct Booking" : request.RenterName.Trim(),
            RenterPhone = request.RenterPhone?.Trim(),
            Notes = request.Notes?.Trim()
        };

        await _store.AddRentalPeriodAsync(period, ct);
        await _audit.LogAsync(adminId, "rental-period.create", "RentalPeriod", period.Id.ToString(), null, $"{request.StartDate:yyyy-MM-dd} to {request.EndDate:yyyy-MM-dd}", null, ct);

        var dto = new RentalPeriodDto(period.Id, period.PropertyId, period.BookingRequestId, period.StartDate, period.EndDate, period.RenterName, period.RenterPhone, period.Notes, period.CreatedAt);
        return ServiceResult<RentalPeriodDto>.Created(dto, "Rental period added successfully.");
    }

    public async Task<ServiceResult<object?>> DeleteAdminRentalPeriodAsync(int adminId, int propertyId, int periodId, CancellationToken ct = default)
    {
        var success = await _store.DeleteRentalPeriodAsync(propertyId, periodId, ct);
        if (!success)
            return ServiceResult<object?>.NotFound("Rental period not found.");

        await _audit.LogAsync(adminId, "rental-period.delete", "RentalPeriod", periodId.ToString(), null, "Deleted", null, ct);
        return ServiceResult<object?>.Ok(null, "Rental period deleted.");
    }

    public async Task<ServiceResult<PropertyDetailsDto>> CreateAsync(int userId, string role, CreatePropertyRequest request, CancellationToken ct = default)
    {
        // Requirement 1: Customers cannot directly create property listings.
        if (role is not ("Admin" or "Agent" or "Seller"))
            return ServiceResult<PropertyDetailsDto>.Fail("Only company staff/admins and registered sellers can list properties.", 403);

        if (!await _store.PropertyTypeExistsAsync(request.PropertyTypeId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Property type not found.", 422,
                new() { new("Property type not found.", "propertyTypeId") });

        // Village validation (Requirement 3 & 4)
        if (!await _store.VillageExistsAsync(request.VillageId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Village not found.", 422,
                new() { new("Village not found.", "villageId") });

        // Zone validation: must belong to the selected village
        if (request.ZoneId.HasValue)
        {
            if (!await _store.ZoneExistsAsync(request.ZoneId.Value, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Zone not found.", 422,
                    new() { new("Zone not found.", "zoneId") });

            if (!await _store.ZoneBelongsToVillageAsync(request.ZoneId.Value, request.VillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Selected zone does not belong to the selected village.", 422,
                    new() { new("Selected zone does not belong to the selected village.", "zoneId") });
        }

        if (request.LocationId.HasValue && !await _store.LocationExistsAsync(request.LocationId.Value, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Location not found.", 422,
                new() { new("Location not found.", "locationId") });

        PropertyListingRequest? listingRequest = null;
        if (request.PropertyListingRequestId.HasValue)
        {
            listingRequest = await _store.GetListingRequestAsync(request.PropertyListingRequestId.Value, ct);
            if (listingRequest == null)
                return ServiceResult<PropertyDetailsDto>.Fail("Associated property listing request not found.", 404);
        }

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
            Status = role == "Admin" && (!request.PublishAt.HasValue || request.PublishAt.Value <= DateTime.UtcNow)
                ? PropertyStatus.Published
                : PropertyStatus.Draft,
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
            VillageId = request.VillageId,
            ZoneId = request.ZoneId,
            BuildingNumber = request.BuildingNumber?.Trim(),
            LocationId = request.LocationId,
            Address = request.Address,
            Developer = request.Developer,
            OwnerId = listingRequest != null ? listingRequest.UserId : (request.OwnerId ?? (role == "Seller" ? userId : null)),
            CreatedByUserId = userId,
            PropertyListingRequestId = listingRequest?.Id,
            OwnerName = request.OwnerName?.Trim(),
            OwnerPhone = request.OwnerPhone?.Trim(),
            PublishAt = role == "Admin" ? request.PublishAt : null,
            ExpiresAt = role == "Admin" ? request.ExpiresAt : null
        };

        await _store.AddAsync(property, ct);
        await _store.SaveChangesAsync(ct);

        if (listingRequest != null)
        {
            listingRequest.PropertyId = property.Id;
            listingRequest.Status = ListingRequestStatus.Completed;
            listingRequest.UpdatedAt = DateTime.UtcNow;
            await _store.SaveChangesAsync(ct);
        }

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

        // Village & Zone validation on update
        var targetVillageId = request.VillageId ?? property.VillageId;
        var targetZoneId = request.ZoneId ?? property.ZoneId;

        if (request.VillageId.HasValue)
        {
            if (!await _store.VillageExistsAsync(request.VillageId.Value, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Village not found.", 422,
                    new() { new("Village not found.", "villageId") });
            property.VillageId = request.VillageId.Value;
        }

        if (request.ZoneId.HasValue)
        {
            if (!await _store.ZoneExistsAsync(request.ZoneId.Value, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Zone not found.", 422,
                    new() { new("Zone not found.", "zoneId") });

            if (!await _store.ZoneBelongsToVillageAsync(request.ZoneId.Value, targetVillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Selected zone does not belong to the selected village.", 422,
                    new() { new("Selected zone does not belong to the selected village.", "zoneId") });

            property.ZoneId = request.ZoneId.Value;
        }

        if (request.BuildingNumber is not null) property.BuildingNumber = request.BuildingNumber.Trim();
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
        if (isAdmin && request.OwnerId.HasValue) property.OwnerId = request.OwnerId.Value;
        if (isAdmin && request.OwnerName is not null) property.OwnerName = request.OwnerName.Trim();
        if (isAdmin && request.OwnerPhone is not null) property.OwnerPhone = request.OwnerPhone.Trim();
        if (isAdmin && request.PublishAt.HasValue) property.PublishAt = request.PublishAt;
        if (isAdmin && request.ExpiresAt.HasValue) property.ExpiresAt = request.ExpiresAt;

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
