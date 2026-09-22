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

    public int LocationId { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? Developer { get; set; }
    public int? OwnerId { get; set; }
    public int? AgentId { get; set; }
    public bool IsVerified { get; set; }
    public bool IsFeatured { get; set; }
    public long ViewCount { get; set; }

    public PropertyType PropertyType { get; set; } = null!;
    public Location Location { get; set; } = null!;
    public User? Owner { get; set; }
    public Agent? Agent { get; set; }

    public ICollection<PropertyImage> Images { get; set; } = new List<PropertyImage>();
    public ICollection<PropertyVideo> Videos { get; set; } = new List<PropertyVideo>();
    public ICollection<PropertyDocument> Documents { get; set; } = new List<PropertyDocument>();
    public ICollection<PropertyFeature> Features { get; set; } = new List<PropertyFeature>();
    public ICollection<PropertyAmenity> PropertyAmenities { get; set; } = new List<PropertyAmenity>();
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
