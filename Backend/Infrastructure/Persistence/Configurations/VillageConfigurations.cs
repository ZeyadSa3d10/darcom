using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class VillageConfiguration : IEntityTypeConfiguration<Village>
{
    public void Configure(EntityTypeBuilder<Village> b)
    {
        b.Property(v => v.Name).HasMaxLength(150).IsRequired();
        b.Property(v => v.Slug).HasMaxLength(150).IsRequired();
        b.Property(v => v.IsActive).HasDefaultValue(true);

        b.HasIndex(v => v.Slug).IsUnique();
        b.HasIndex(v => v.IsActive);
    }
}

public sealed class ZoneConfiguration : IEntityTypeConfiguration<Zone>
{
    public void Configure(EntityTypeBuilder<Zone> b)
    {
        b.Property(z => z.Name).HasMaxLength(150).IsRequired();
        b.Property(z => z.Slug).HasMaxLength(150).IsRequired();
        b.Property(z => z.IsActive).HasDefaultValue(true);

        b.HasIndex(z => z.VillageId);
        b.HasIndex(z => new { z.VillageId, z.Slug }).IsUnique();

        b.HasOne(z => z.Village).WithMany(v => v.Zones)
            .HasForeignKey(z => z.VillageId).OnDelete(DeleteBehavior.Restrict);
    }
}

