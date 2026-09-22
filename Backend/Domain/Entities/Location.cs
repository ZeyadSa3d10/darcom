using Domain.Common;

namespace Domain.Entities;

public sealed class City : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Country { get; set; } = "Egypt";

    public ICollection<Area> Areas { get; set; } = new List<Area>();
    public ICollection<Location> Locations { get; set; } = new List<Location>();
}

public sealed class Area : EntityBase
{
    public int CityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public City City { get; set; } = null!;
    public ICollection<Location> Locations { get; set; } = new List<Location>();
}

public sealed class Location : EntityBase
{
    public int CityId { get; set; }
    public int? AreaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public City City { get; set; } = null!;
    public Area? Area { get; set; }
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}
