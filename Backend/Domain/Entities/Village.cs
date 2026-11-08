using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Village in North Coast (e.g. Marassi, Hacienda Bay, Telal).
/// Managed by admins.
/// </summary>
public sealed class Village : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Zone> Zones { get; set; } = new List<Zone>();
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}

/// <summary>
/// Zone within a North Coast Village (e.g. Bay, Walk, Aqua, Lagoon).
/// Scoped to a single Village.
/// </summary>
public sealed class Zone : EntityBase
{
    public int VillageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Village Village { get; set; } = null!;
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}
