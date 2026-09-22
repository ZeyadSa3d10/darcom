using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class CityConfiguration : IEntityTypeConfiguration<City>
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<City> b)
    {
        b.Property(c => c.Name).HasMaxLength(120).IsRequired();
        b.Property(c => c.Slug).HasMaxLength(120).IsRequired();
        b.Property(c => c.Country).HasMaxLength(80);
        b.HasIndex(c => c.Slug).IsUnique();

        b.HasData(
            new City { Id = 1, Name = "Ain Sokhna", Slug = "ain-sokhna", Country = "Egypt", CreatedAt = SeedDate },
            new City { Id = 2, Name = "New Cairo", Slug = "new-cairo", Country = "Egypt", CreatedAt = SeedDate },
            new City { Id = 3, Name = "North Coast", Slug = "north-coast", Country = "Egypt", CreatedAt = SeedDate },
            new City { Id = 4, Name = "Hurghada", Slug = "hurghada", Country = "Egypt", CreatedAt = SeedDate },
            new City { Id = 5, Name = "El Gouna", Slug = "el-gouna", Country = "Egypt", CreatedAt = SeedDate }
        );
    }
}

public sealed class AreaConfiguration : IEntityTypeConfiguration<Area>
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Area> b)
    {
        b.Property(a => a.Name).HasMaxLength(140).IsRequired();
        b.Property(a => a.Slug).HasMaxLength(140).IsRequired();
        b.HasIndex(a => new { a.CityId, a.Slug }).IsUnique();
        b.HasOne(a => a.City).WithMany(c => c.Areas)
            .HasForeignKey(a => a.CityId).OnDelete(DeleteBehavior.Restrict);

        b.HasData(
            new Area { Id = 1, CityId = 1, Name = "Porto Sokhna", Slug = "porto-sokhna", CreatedAt = SeedDate },
            new Area { Id = 2, CityId = 1, Name = "La Vista", Slug = "la-vista-sokhna", CreatedAt = SeedDate },
            new Area { Id = 3, CityId = 2, Name = "Fifth Settlement", Slug = "fifth-settlement", CreatedAt = SeedDate },
            new Area { Id = 4, CityId = 2, Name = "Rehab City", Slug = "rehab-city", CreatedAt = SeedDate },
            new Area { Id = 5, CityId = 3, Name = "Marina", Slug = "marina-sahel", CreatedAt = SeedDate },
            new Area { Id = 6, CityId = 3, Name = "Hacienda Bay", Slug = "hacienda-bay", CreatedAt = SeedDate },
            new Area { Id = 7, CityId = 4, Name = "Sahl Hasheesh", Slug = "sahl-hasheesh", CreatedAt = SeedDate },
            new Area { Id = 8, CityId = 4, Name = "Makadi Bay", Slug = "makadi-bay", CreatedAt = SeedDate },
            new Area { Id = 9, CityId = 5, Name = "Downtown El Gouna", Slug = "downtown-gouna", CreatedAt = SeedDate },
            new Area { Id = 10, CityId = 5, Name = "Abu Tig Marina", Slug = "abu-tig-marina", CreatedAt = SeedDate }
        );
    }
}

public sealed class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Location> b)
    {
        b.Property(l => l.Name).HasMaxLength(160).IsRequired();
        b.Property(l => l.Address).HasMaxLength(300);
        b.HasIndex(l => l.CityId);
        b.HasIndex(l => l.AreaId);
        b.HasOne(l => l.City).WithMany(c => c.Locations)
            .HasForeignKey(l => l.CityId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(l => l.Area).WithMany(a => a!.Locations)
            .HasForeignKey(l => l.AreaId).OnDelete(DeleteBehavior.SetNull);

        b.HasData(
            new Location { Id = 1, CityId = 1, AreaId = 1, Name = "Porto Sokhna Pyramids", Latitude = 29.447, Longitude = 32.551, CreatedAt = SeedDate },
            new Location { Id = 2, CityId = 1, AreaId = 2, Name = "La Vista Bay", Latitude = 29.42, Longitude = 32.57, CreatedAt = SeedDate },
            new Location { Id = 3, CityId = 2, AreaId = 3, Name = "South 90 Road", CreatedAt = SeedDate },
            new Location { Id = 4, CityId = 2, AreaId = 4, Name = "Rehab City Gate 6", CreatedAt = SeedDate },
            new Location { Id = 5, CityId = 3, AreaId = 5, Name = "Marina Gate 4", Latitude = 30.98, Longitude = 29.59, CreatedAt = SeedDate },
            new Location { Id = 6, CityId = 3, AreaId = 6, Name = "Hacienda Bay Phase 2", Latitude = 30.95, Longitude = 29.42, CreatedAt = SeedDate },
            new Location { Id = 7, CityId = 4, AreaId = 7, Name = "Sahl Hasheesh Promenade", Latitude = 27.05, Longitude = 33.86, CreatedAt = SeedDate },
            new Location { Id = 8, CityId = 4, AreaId = 8, Name = "Makadi Bay Heights", Latitude = 26.99, Longitude = 33.9, CreatedAt = SeedDate },
            new Location { Id = 9, CityId = 5, AreaId = 9, Name = "Downtown Kafr El Gouna", Latitude = 27.39, Longitude = 33.68, CreatedAt = SeedDate },
            new Location { Id = 10, CityId = 5, AreaId = 10, Name = "Abu Tig Marina Walk", Latitude = 27.4, Longitude = 33.67, CreatedAt = SeedDate }
        );
    }
}
