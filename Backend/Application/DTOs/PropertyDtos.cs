using Domain.Enums;

namespace Application.DTOs;

public sealed record PropertyListDto(
    int Id,
    string Title,
    string Slug,
    string ReferenceNumber,
    decimal Price,
    string Currency,
    decimal? Area,
    int? Bedrooms,
    int? Bathrooms,
    string Purpose,
    string Status,
    string PropertyType,
    string PropertyTypeSlug,
    string City,
    string Location,
    string? PrimaryImageUrl,
    bool IsFeatured,
    bool SeaView,
    bool Pool,
    bool BeachAccess,
    bool Parking,
    DateTime CreatedAt,
    int VillageId = 0,
    string VillageName = "",
    string VillageSlug = "",
    int? ZoneId = null,
    string? ZoneName = null,
    string? ZoneSlug = null,
    string? BuildingNumber = null,
    string? RejectionReason = null);

public sealed record PropertyImageDto(string Url, int Order, bool IsPrimary, string? AltText);

public sealed record PropertyAmenityDto(int Id, string Name, string? Icon);

public sealed record PropertyFeatureDto(string Title, string? Value);

public sealed record PropertyAgentDto(int Id, string Name, string? Title, string? Agency, string? Phone, string? Email, string? PhotoUrl, bool IsVerified);

public sealed record PropertyDetailsDto(
    int Id,
    string Title,
    string Slug,
    string ReferenceNumber,
    string? Description,
    decimal Price,
    string Currency,
    decimal? Area,
    int? Bedrooms,
    int? Bathrooms,
    int? Floor,
    int? TotalFloors,
    int? BuiltYear,
    DateTime? DeliveryDate,
    string? FurnishedStatus,
    string? FinishingStatus,
    bool Parking,
    bool Garden,
    bool Pool,
    bool SeaView,
    bool BeachAccess,
    string Purpose,
    string Status,
    string PropertyType,
    string PropertyTypeSlug,
    string City,
    string? AreaName,
    string Location,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? Developer,
    bool IsVerified,
    bool IsFeatured,
    long ViewCount,
    PropertyAgentDto? Agent,
    List<PropertyImageDto> Images,
    List<PropertyAmenityDto> Amenities,
    List<PropertyFeatureDto> Features,
    DateTime CreatedAt,
    int VillageId = 0,
    string VillageName = "",
    string VillageSlug = "",
    int? ZoneId = null,
    string? ZoneName = null,
    string? ZoneSlug = null,
    string? BuildingNumber = null,
    int? CreatedByUserId = null,
    string? RejectionReason = null,
    int? PropertyListingRequestId = null,
    int? OwnerId = null,
    string? OwnerName = null,
    string? OwnerPhone = null,
    string? OwnerType = null,
    DateTime? PublishAt = null,
    DateTime? ExpiresAt = null);

/// <summary>All listing filters from website.md #10 + North Coast Village/Zone/BuildingNumber.</summary>
public sealed class PropertyQuery
{
    public string? Purpose { get; set; }
    public string? Type { get; set; }
    public int? PropertyTypeId { get; set; }
    public string? Location { get; set; }
    public string? Village { get; set; }
    public int? VillageId { get; set; }
    public string? Zone { get; set; }
    public int? ZoneId { get; set; }
    public string? BuildingNumber { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }
    public decimal? MinArea { get; set; }
    public decimal? MaxArea { get; set; }
    public bool? Furnished { get; set; }
    public string? FurnishedStatus { get; set; }
    public string? FinishingStatus { get; set; }
    public bool? Pool { get; set; }
    public bool? Garden { get; set; }
    public bool? SeaView { get; set; }
    public bool? BeachAccess { get; set; }
    public bool? Parking { get; set; }
    public bool? Featured { get; set; }
    public List<int>? AmenityIds { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? RentalDuration { get; set; }
    /// <summary>Admin-only. Ignored for other callers.</summary>
    public string? Status { get; set; }
    public string? Q { get; set; }
    public string? Sort { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public sealed class CreatePropertyRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PropertyTypeId { get; set; }
    public string Purpose { get; set; } = "Sale";
    public decimal Price { get; set; }
    public string? Currency { get; set; }
    public decimal? Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuiltYear { get; set; }
    public string? FurnishedStatus { get; set; }
    public string? FinishingStatus { get; set; }
    public bool Parking { get; set; }
    public bool Garden { get; set; }
    public bool Pool { get; set; }
    public bool SeaView { get; set; }
    public bool BeachAccess { get; set; }

    // North Coast Village and Zone fields (Requirements 3 & 4)
    public int VillageId { get; set; }
    public int? ZoneId { get; set; }
    public string? BuildingNumber { get; set; }

    public int? LocationId { get; set; }
    public string? Address { get; set; }
    public string? Developer { get; set; }
    public int? OwnerId { get; set; }
    public int? PropertyListingRequestId { get; set; }
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }
    public DateTime? PublishAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public sealed class UpdatePropertyRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? PropertyTypeId { get; set; }
    public string? Purpose { get; set; }
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public decimal? Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuiltYear { get; set; }
    public string? FurnishedStatus { get; set; }
    public string? FinishingStatus { get; set; }
    public bool? Parking { get; set; }
    public bool? Garden { get; set; }
    public bool? Pool { get; set; }
    public bool? SeaView { get; set; }
    public bool? BeachAccess { get; set; }

    // North Coast Village and Zone fields
    public int? VillageId { get; set; }
    public int? ZoneId { get; set; }
    public string? BuildingNumber { get; set; }

    public int? LocationId { get; set; }
    public string? Address { get; set; }
    public string? Developer { get; set; }
    public int? OwnerId { get; set; }

    /// <summary>Admin-only. Writers may only use Draft / PendingReview.</summary>
    public string? Status { get; set; }
    /// <summary>Admin-only spotlight flag.</summary>
    public bool? IsFeatured { get; set; }
    /// <summary>Admin-only verification flag.</summary>
    public bool? IsVerified { get; set; }
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }
    public DateTime? PublishAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
