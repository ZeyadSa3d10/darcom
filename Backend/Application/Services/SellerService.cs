using Application.Common;
using Application.DTOs;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public interface ISellerService
{
    Task<ServiceResult<PropertyDetailsDto>> SubmitAsync(int userId, string role, SellerSubmissionRequest request, CancellationToken ct = default);
    Task<ServiceResult<object?>> SubmitForReviewAsync(int userId, int propertyId, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> ApproveAsync(int adminId, int propertyId, string? ipAddress, CancellationToken ct = default);
    Task<ServiceResult<PropertyDetailsDto>> RejectAsync(int adminId, int propertyId, string reason, string? ipAddress, CancellationToken ct = default);
}

public sealed class SellerService : ISellerService
{
    private readonly IPropertyStore _properties;
    private readonly IEngagementStore _engagement;
    private readonly IRequestStore _requests;
    private readonly IAuditWriter _audit;
    private static readonly Random ReferenceRandom = new();

    public SellerService(IPropertyStore properties, IEngagementStore engagement, IRequestStore requests, IAuditWriter audit)
    {
        _properties = properties;
        _engagement = engagement;
        _requests = requests;
        _audit = audit;
    }

    public async Task<ServiceResult<PropertyDetailsDto>> SubmitAsync(int userId, string role, SellerSubmissionRequest request, CancellationToken ct = default)
    {
        if (role is not ("Seller" or "Agent" or "Admin"))
            return ServiceResult<PropertyDetailsDto>.Fail("Only sellers, agents and admins can submit properties.", 403);

        if (!await _properties.PropertyTypeExistsAsync(request.PropertyTypeId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Property type not found.", 422,
                new() { new("Property type not found.", "propertyTypeId") });
        if (!await _properties.LocationExistsAsync(request.LocationId, ct))
            return ServiceResult<PropertyDetailsDto>.Fail("Location not found.", 422,
                new() { new("Location not found.", "locationId") });

        foreach (var amenityId in request.AmenityIds.Distinct())
            if (!await _properties.AmenityExistsAsync(amenityId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail($"Amenity {amenityId} not found.", 422,
                    new() { new($"Amenity {amenityId} not found.", "amenityIds") });

        if (request.VillageId > 0)
        {
            if (!await _properties.VillageExistsAsync(request.VillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("Village not found.", 422,
                    new() { new("Village not found.", "villageId") });

            if (request.ZoneId.HasValue && !await _properties.ZoneBelongsToVillageAsync(request.ZoneId.Value, request.VillageId, ct))
                return ServiceResult<PropertyDetailsDto>.Fail("The selected zone does not belong to the selected village.", 422,
                    new() { new("The selected zone does not belong to the selected village.", "zoneId") });
        }

        var slug = SlugHelper.UniqueSlug(SlugHelper.GenerateSlug(request.Title),
            s => _properties.SlugExistsAsync(s).GetAwaiter().GetResult());

        string reference;
        do { reference = $"DAR-{ReferenceRandom.Next(100000, 999999)}"; }
        while (await _properties.ReferenceExistsAsync(reference, ct));

        var property = new Property
        {
            Title = request.Title.Trim(),
            Slug = slug,
            ReferenceNumber = reference,
            Description = request.Description?.Trim(),
            PropertyTypeId = request.PropertyTypeId,
            Status = PropertyStatus.Draft,
            Purpose = Enum.Parse<PropertyPurpose>(request.Purpose, true),
            Price = request.Price,
            Currency = "EGP",
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
            VillageId = request.VillageId > 0 ? request.VillageId : 1,
            ZoneId = request.ZoneId,
            BuildingNumber = request.BuildingNumber,
            LocationId = request.LocationId,
            Address = request.Address,
            Developer = request.Developer,
            OwnerId = userId
        };

        await _properties.AddAsync(property, ct);
        await _properties.SaveChangesAsync(ct);

        foreach (var img in request.Images)
            await _properties.AttachImageAsync(property.Id, img.Url.Trim(), img.AltText, ct);
        foreach (var vid in request.Videos)
            await _properties.AttachVideoAsync(property.Id, vid.Url.Trim(), vid.Type, ct);
        await _properties.SetFeaturesAsync(property.Id,
            request.Features.Select(f => (f.Title.Trim(), f.Value)).ToList(), ct);
        await _properties.SetAmenitiesAsync(property.Id, request.AmenityIds.Distinct().ToList(), ct);
        await _properties.SaveChangesAsync(ct);

        await _audit.LogAsync(userId, "property.submitted", "Property",
            property.Id.ToString(), null, "Draft", null, ct);

        var details = await _properties.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Created(details!, "Property saved as draft.");
    }

    public async Task<ServiceResult<object?>> SubmitForReviewAsync(int userId, int propertyId, CancellationToken ct = default)
    {
        var property = await _properties.GetEntityAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<object?>.NotFound("Property not found.");
        if (property.OwnerId != userId)
            return ServiceResult<object?>.Fail("You can only submit your own properties.", 403);
        if (property.Status != PropertyStatus.Draft)
            return ServiceResult<object?>.Fail($"Only draft properties can be submitted (current: {property.Status}).", 409);

        property.Status = PropertyStatus.PendingReview;
        property.UpdatedAt = DateTime.UtcNow;
        await _properties.SaveChangesAsync(ct);

        foreach (var adminId in await _requests.GetAdminUserIdsAsync(ct))
            await _engagement.AddNotificationAsync(adminId, "Property pending review",
                $"{property.Title} ({property.ReferenceNumber}) was submitted for review.", "property-approved", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(userId, "property.submitted", "Property",
            property.Id.ToString(), "Draft", "PendingReview", null, ct);

        return ServiceResult<object?>.Ok(null, "Submitted for review. An admin will approve it before publication.");
    }

    public async Task<ServiceResult<PropertyDetailsDto>> ApproveAsync(int adminId, int propertyId, string? ipAddress, CancellationToken ct = default)
    {
        var property = await _properties.GetEntityAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<PropertyDetailsDto>.NotFound("Property not found.");
        if (property.Status != PropertyStatus.PendingReview)
            return ServiceResult<PropertyDetailsDto>.Fail($"Only pending-review properties can be approved (current: {property.Status}).", 409);

        property.Status = PropertyStatus.Published;
        property.RejectionReason = null;
        property.UpdatedAt = DateTime.UtcNow;
        await _properties.SaveChangesAsync(ct);

        if (property.OwnerId.HasValue)
            await _engagement.AddNotificationAsync(property.OwnerId.Value, "Property approved",
                $"{property.Title} is now published.", "property-approved", ct);
        if (property.CreatedByUserId.HasValue && property.CreatedByUserId != property.OwnerId)
            await _engagement.AddNotificationAsync(property.CreatedByUserId.Value, "Property approved",
                $"{property.Title} is now published.", "property-approved", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(adminId, "property.approved", "Property",
            property.Id.ToString(), "PendingReview", "Published", ipAddress, ct);

        var details = await _properties.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Ok(details!, "Property published.");
    }

    public async Task<ServiceResult<PropertyDetailsDto>> RejectAsync(int adminId, int propertyId, string reason, string? ipAddress, CancellationToken ct = default)
    {
        var property = await _properties.GetEntityAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<PropertyDetailsDto>.NotFound("Property not found.");
        if (property.Status != PropertyStatus.PendingReview)
            return ServiceResult<PropertyDetailsDto>.Fail($"Only pending-review properties can be rejected (current: {property.Status}).", 409);

        property.Status = PropertyStatus.Rejected;
        property.RejectionReason = reason;
        property.UpdatedAt = DateTime.UtcNow;
        await _properties.SaveChangesAsync(ct);

        if (property.OwnerId.HasValue)
            await _engagement.AddNotificationAsync(property.OwnerId.Value, "Property rejected",
                $"{property.Title} was rejected: {reason}", "property-rejected", ct);
        if (property.CreatedByUserId.HasValue && property.CreatedByUserId != property.OwnerId)
            await _engagement.AddNotificationAsync(property.CreatedByUserId.Value, "Property rejected",
                $"{property.Title} was rejected: {reason}", "property-rejected", ct);
        await _engagement.SaveChangesAsync(ct);
        await _audit.LogAsync(adminId, "property.rejected", "Property",
            property.Id.ToString(), "PendingReview", $"Rejected: {reason}", ipAddress, ct);

        var details = await _properties.GetDetailsAsync(property.Id, true, ct);
        return ServiceResult<PropertyDetailsDto>.Ok(details!, "Property rejected.");
    }
}
