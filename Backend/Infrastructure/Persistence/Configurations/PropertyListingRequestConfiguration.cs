using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class PropertyListingRequestConfiguration : IEntityTypeConfiguration<PropertyListingRequest>
{
    public void Configure(EntityTypeBuilder<PropertyListingRequest> b)
    {
        b.ToTable("PropertyListingRequests");

        b.Property(r => r.RequestNumber).HasMaxLength(32).IsRequired();
        b.Property(r => r.BuildingNumber).HasMaxLength(64).IsRequired();
        b.Property(r => r.UnitNumber).HasMaxLength(64).IsRequired();
        b.Property(r => r.PhoneNumber).HasMaxLength(32).IsRequired();
        b.Property(r => r.AdminNotes).HasColumnType("nvarchar(max)");

        b.HasIndex(r => r.RequestNumber).IsUnique();
        b.HasIndex(r => r.Status);
        b.HasIndex(r => r.UserId);
        b.HasIndex(r => r.VillageId);
        b.HasIndex(r => r.ZoneId);
        b.HasIndex(r => r.PropertyId);

        // Index to quickly look up requests by village, building, and unit
        b.HasIndex(r => new { r.VillageId, r.BuildingNumber, r.UnitNumber });

        b.HasOne(r => r.User)
            .WithMany(u => u.PropertyListingRequests)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(r => r.Village)
            .WithMany()
            .HasForeignKey(r => r.VillageId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(r => r.Zone)
            .WithMany()
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(r => r.AssignedAdmin)
            .WithMany()
            .HasForeignKey(r => r.AssignedAdminId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne(r => r.CreatedProperty)
            .WithMany()
            .HasForeignKey(r => r.PropertyId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
