using Domain.Common;

namespace Domain.Entities;

/// <summary>Key-value facts about a property (finishing, orientation, ...).</summary>
public sealed class PropertyFeature : EntityBase
{
    public int PropertyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Value { get; set; }

    public Property Property { get; set; } = null!;
}

/// <summary>Media is stored as URL references only — never blobs in SQL Server (website.md #22).</summary>
public sealed class PropertyImage : EntityBase
{
    public int PropertyId { get; set; }
    public string Url { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsPrimary { get; set; }
    public string? AltText { get; set; }

    public Property Property { get; set; } = null!;
}

public sealed class PropertyVideo : EntityBase
{
    public int PropertyId { get; set; }
    public string Url { get; set; } = string.Empty;
    /// <summary>e.g. tour, walkthrough, drone, floorplan-video.</summary>
    public string? Type { get; set; }
    public int Order { get; set; }
    public bool IsPrimary { get; set; }
    public string? AltText { get; set; }

    public Property Property { get; set; } = null!;
}

public sealed class PropertyDocument : EntityBase
{
    public int PropertyId { get; set; }
    public string Url { get; set; } = string.Empty;
    /// <summary>e.g. floorplan, brochure, contract-draft.</summary>
    public string? Type { get; set; }
    public int Order { get; set; }
    public string? AltText { get; set; }

    public Property Property { get; set; } = null!;
}

public sealed class PropertyAmenity
{
    public int PropertyId { get; set; }
    public int AmenityId { get; set; }

    public Property Property { get; set; } = null!;
    public Amenity Amenity { get; set; } = null!;
}
