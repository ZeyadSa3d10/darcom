using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> b)
    {
        b.Property(p => p.Title).HasMaxLength(200).IsRequired();
        b.Property(p => p.Slug).HasMaxLength(250).IsRequired();
        b.Property(p => p.ReferenceNumber).HasMaxLength(32).IsRequired();
        b.Property(p => p.Description).HasColumnType("nvarchar(max)");
        b.Property(p => p.Price).HasPrecision(18, 2);
        b.Property(p => p.Currency).HasMaxLength(8);
        b.Property(p => p.Area).HasPrecision(10, 2);
        b.Property(p => p.BuildingNumber).HasMaxLength(64);
        b.Property(p => p.Address).HasMaxLength(300);
        b.Property(p => p.FurnishedStatus).HasMaxLength(64);
        b.Property(p => p.FinishingStatus).HasMaxLength(64);
        b.Property(p => p.Developer).HasMaxLength(160);
        b.Property(p => p.RejectionReason).HasMaxLength(1000);

        b.HasIndex(p => p.Slug).IsUnique();
        b.HasIndex(p => p.ReferenceNumber).IsUnique();
        b.HasIndex(p => p.Status);
        b.HasIndex(p => p.Purpose);
        b.HasIndex(p => p.Price);
        b.HasIndex(p => p.PropertyTypeId);

        // North Coast Village and Zone indexes (Requirements 4 & 14)
        // BuildingNumber is NOT indexed per requirement 4.
        b.HasIndex(p => p.VillageId);
        b.HasIndex(p => p.ZoneId);
        b.HasIndex(p => new { p.Status, p.Purpose, p.VillageId });
        b.HasIndex(p => new { p.VillageId, p.ZoneId });
        b.HasIndex(p => new { p.Status, p.VillageId, p.Price });

        b.HasIndex(p => p.LocationId);
        b.HasIndex(p => p.BrokerId);
        b.HasIndex(p => p.BrokerSubmissionId);
        b.HasIndex(p => p.PropertyListingRequestId);

        b.HasOne(p => p.PropertyType).WithMany(t => t.Properties)
            .HasForeignKey(p => p.PropertyTypeId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(p => p.Village).WithMany(v => v.Properties)
            .HasForeignKey(p => p.VillageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(p => p.Zone).WithMany(z => z.Properties)
            .HasForeignKey(p => p.ZoneId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.Location).WithMany(l => l.Properties)
            .HasForeignKey(p => p.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.Owner).WithMany(u => u.OwnedProperties)
            .HasForeignKey(p => p.OwnerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(p => p.CreatedByUser).WithMany(u => u.ManagedProperties)
            .HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.Agent).WithMany(a => a!.Properties)
            .HasForeignKey(p => p.AgentId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.Broker).WithMany(u => u.BrokerProperties)
            .HasForeignKey(p => p.BrokerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(p => p.BrokerSubmission).WithOne(s => s.CreatedProperty)
            .HasForeignKey<Property>(p => p.BrokerSubmissionId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.PropertyListingRequest).WithMany()
            .HasForeignKey(p => p.PropertyListingRequestId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class PropertyFeatureConfiguration : IEntityTypeConfiguration<PropertyFeature>
{
    public void Configure(EntityTypeBuilder<PropertyFeature> b)
    {
        b.Property(f => f.Title).HasMaxLength(120).IsRequired();
        b.Property(f => f.Value).HasMaxLength(300);
        b.HasOne(f => f.Property).WithMany(p => p.Features)
            .HasForeignKey(f => f.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(f => f.PropertyId);
    }
}

public sealed class PropertyImageConfiguration : IEntityTypeConfiguration<PropertyImage>
{
    public void Configure(EntityTypeBuilder<PropertyImage> b)
    {
        b.Property(i => i.Url).HasMaxLength(1000).IsRequired();
        b.Property(i => i.AltText).HasMaxLength(250);
        b.HasOne(i => i.Property).WithMany(p => p.Images)
            .HasForeignKey(i => i.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(i => i.PropertyId);
    }
}

public sealed class PropertyVideoConfiguration : IEntityTypeConfiguration<PropertyVideo>
{
    public void Configure(EntityTypeBuilder<PropertyVideo> b)
    {
        b.Property(v => v.Url).HasMaxLength(1000).IsRequired();
        b.Property(v => v.Type).HasMaxLength(64);
        b.Property(v => v.AltText).HasMaxLength(250);
        b.HasOne(v => v.Property).WithMany(p => p.Videos)
            .HasForeignKey(v => v.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(v => v.PropertyId);
    }
}

public sealed class PropertyDocumentConfiguration : IEntityTypeConfiguration<PropertyDocument>
{
    public void Configure(EntityTypeBuilder<PropertyDocument> b)
    {
        b.Property(d => d.Url).HasMaxLength(1000).IsRequired();
        b.Property(d => d.Type).HasMaxLength(64);
        b.Property(d => d.AltText).HasMaxLength(250);
        b.HasOne(d => d.Property).WithMany(p => p.Documents)
            .HasForeignKey(d => d.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(d => d.PropertyId);
    }
}

public sealed class PropertyAmenityConfiguration : IEntityTypeConfiguration<PropertyAmenity>
{
    public void Configure(EntityTypeBuilder<PropertyAmenity> b)
    {
        b.HasKey(pa => new { pa.PropertyId, pa.AmenityId });
        b.HasOne(pa => pa.Property).WithMany(p => p.PropertyAmenities)
            .HasForeignKey(pa => pa.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(pa => pa.Amenity).WithMany(a => a.PropertyAmenities)
            .HasForeignKey(pa => pa.AmenityId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PropertyTypeConfiguration : IEntityTypeConfiguration<PropertyType>
{
    public void Configure(EntityTypeBuilder<PropertyType> b)
    {
        b.Property(t => t.Name).HasMaxLength(80).IsRequired();
        b.Property(t => t.Slug).HasMaxLength(80).IsRequired();
        b.Property(t => t.Description).HasMaxLength(500);
        b.Property(t => t.Icon).HasMaxLength(80);
        b.HasIndex(t => t.Slug).IsUnique();

        b.HasData(
            new PropertyType { Id = 1, Name = "Chalet", Slug = "chalet", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 2, Name = "Apartment", Slug = "apartment", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 3, Name = "Villa", Slug = "villa", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 4, Name = "Townhouse", Slug = "townhouse", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 5, Name = "Duplex", Slug = "duplex", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 6, Name = "Penthouse", Slug = "penthouse", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 7, Name = "Studio", Slug = "studio", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 8, Name = "Twin House", Slug = "twin-house", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 9, Name = "Standalone Villa", Slug = "standalone-villa", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 10, Name = "Commercial Property", Slug = "commercial", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new PropertyType { Id = 11, Name = "Land", Slug = "land", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}

public sealed class AmenityConfiguration : IEntityTypeConfiguration<Amenity>
{
    public void Configure(EntityTypeBuilder<Amenity> b)
    {
        b.Property(a => a.Name).HasMaxLength(80).IsRequired();
        b.Property(a => a.Icon).HasMaxLength(80);

        b.HasData(
            new Amenity { Id = 1, Name = "Swimming Pool", Icon = "bi-water", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 2, Name = "Private Garden", Icon = "bi-tree", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 3, Name = "Sea View", Icon = "bi-tsunami", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 4, Name = "Beach Access", Icon = "bi-umbrella", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 5, Name = "Parking", Icon = "bi-p-square", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 6, Name = "Security", Icon = "bi-shield-check", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 7, Name = "Elevator", Icon = "bi-building", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 8, Name = "Air Conditioning", Icon = "bi-snow", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 9, Name = "Fully Furnished", Icon = "bi-lamp", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 10, Name = "Equipped Kitchen", Icon = "bi-egg-fried", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 11, Name = "Balcony", Icon = "bi-door-open", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 12, Name = "Terrace", Icon = "bi-sun", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 13, Name = "Gym", Icon = "bi-heart-pulse", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 14, Name = "Clubhouse", Icon = "bi-people", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 15, Name = "Kids Area", Icon = "bi-balloon", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 16, Name = "Smart Home", Icon = "bi-cpu", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Amenity { Id = 17, Name = "BBQ Area", Icon = "bi-fire", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
