using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class Property : EntityBase
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int PropertyTypeId { get; set; }
    public PropertyStatus Status { get; set; } = PropertyStatus.Draft;
    public PropertyPurpose Purpose { get; set; } = PropertyPurpose.Sale;

    public decimal Price { get; set; }
    public string Currency { get; set; } = "EGP";
    public decimal? Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuiltYear { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? FurnishedStatus { get; set; }
    public string? FinishingStatus { get; set; }

    public bool Parking { get; set; }
    public bool Garden { get; set; }
    public bool Pool { get; set; }
    public bool SeaView { get; set; }
    public bool BeachAccess { get; set; }

    // North Coast Village and Zone structure (Requirements 3 & 4)
    public int VillageId { get; set; }
    public int? ZoneId { get; set; }
    public string? BuildingNumber { get; set; }

    // Optional legacy location link for backwards compatibility
    public int? LocationId { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? Developer { get; set; }
    public int? OwnerId { get; set; }
    public int? AgentId { get; set; }
    public int? CreatedByUserId { get; set; }
    public int? BrokerId { get; set; }
    public int? BrokerSubmissionId { get; set; }
    public int? PropertyListingRequestId { get; set; }

    // Owner contact info (optional — for unregistered property owners)
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }
    public bool IsVerified { get; set; }
    public bool IsFeatured { get; set; }
    public long ViewCount { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? PublishAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public PropertyType PropertyType { get; set; } = null!;
    public Village Village { get; set; } = null!;
    public Zone? Zone { get; set; }
    public Location? Location { get; set; }
    public User? Owner { get; set; }
    public Agent? Agent { get; set; }
    public User? CreatedByUser { get; set; }
    public User? Broker { get; set; }
    public BrokerPropertySubmission? BrokerSubmission { get; set; }
    public PropertyListingRequest? PropertyListingRequest { get; set; }

    public ICollection<PropertyImage> Images { get; set; } = new List<PropertyImage>();
    public ICollection<PropertyVideo> Videos { get; set; } = new List<PropertyVideo>();
    public ICollection<PropertyDocument> Documents { get; set; } = new List<PropertyDocument>();
    public ICollection<PropertyFeature> Features { get; set; } = new List<PropertyFeature>();
    public ICollection<PropertyAmenity> PropertyAmenities { get; set; } = new List<PropertyAmenity>();
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<RentalPeriod> RentalPeriods { get; set; } = new List<RentalPeriod>();
    public ICollection<BrokerPropertyRequest> BrokerRequests { get; set; } = new List<BrokerPropertyRequest>();
}
