using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Lookup table — new property types are added as rows, never code changes (website.md #4).
/// </summary>
public sealed class PropertyType : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }

    public ICollection<Property> Properties { get; set; } = new List<Property>();
}

public sealed class Amenity : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }

    public ICollection<PropertyAmenity> PropertyAmenities { get; set; } = new List<PropertyAmenity>();
}
