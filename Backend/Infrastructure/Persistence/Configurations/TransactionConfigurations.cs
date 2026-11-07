using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class PurchaseRequestConfiguration : IEntityTypeConfiguration<PurchaseRequest>
{
    public void Configure(EntityTypeBuilder<PurchaseRequest> b)
    {
        b.Property(r => r.RequestNumber).HasMaxLength(32).IsRequired();
        b.Property(r => r.FullName).HasMaxLength(160).IsRequired();
        b.Property(r => r.Email).HasMaxLength(200).IsRequired();
        b.Property(r => r.Phone).HasMaxLength(32).IsRequired();
        b.Property(r => r.Country).HasMaxLength(80);
        b.Property(r => r.City).HasMaxLength(120);
        b.Property(r => r.NationalId).HasMaxLength(64);
        b.Property(r => r.PreferredContact).HasMaxLength(32);
        b.Property(r => r.Address).HasMaxLength(300);
        b.Property(r => r.Notes).HasColumnType("nvarchar(max)");
        b.Property(r => r.PaymentMethod).HasMaxLength(64);
        b.Property(r => r.Timeline).HasMaxLength(120);
        b.Property(r => r.AdminNotes).HasColumnType("nvarchar(max)");

        b.HasIndex(r => r.RequestNumber).IsUnique();
        b.HasIndex(r => r.Status);
        b.HasIndex(r => r.PropertyId);

        // Race-safe duplicate prevention: one active request per buyer + property.
        b.HasIndex(r => new { r.PropertyId, r.BuyerId, r.Status })
            .IsUnique()
            .HasFilter("[Status] IN (0, 1, 2, 3)");

        b.HasOne(r => r.Property).WithMany()
            .HasForeignKey(r => r.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(r => r.Buyer).WithMany()
            .HasForeignKey(r => r.BuyerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class BookingRequestConfiguration : IEntityTypeConfiguration<BookingRequest>
{
    public void Configure(EntityTypeBuilder<BookingRequest> b)
    {
        b.Property(r => r.RequestNumber).HasMaxLength(32).IsRequired();
        b.Property(r => r.FullName).HasMaxLength(160).IsRequired();
        b.Property(r => r.Email).HasMaxLength(200).IsRequired();
        b.Property(r => r.Phone).HasMaxLength(32).IsRequired();
        b.Property(r => r.Duration).HasMaxLength(64);
        b.Property(r => r.Notes).HasColumnType("nvarchar(max)");

        b.HasIndex(r => r.RequestNumber).IsUnique();
        b.HasIndex(r => r.Status);
        b.HasIndex(r => r.PropertyId);

        // Race-safe duplicate prevention: one active rental request per renter + property.
        b.HasIndex(r => new { r.PropertyId, r.RenterId, r.Status })
            .IsUnique()
            .HasFilter("[Status] IN (0, 1, 2, 3)");

        b.HasOne(r => r.Property).WithMany()
            .HasForeignKey(r => r.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(r => r.Renter).WithMany()
            .HasForeignKey(r => r.RenterId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class RentalPeriodConfiguration : IEntityTypeConfiguration<RentalPeriod>
{
    public void Configure(EntityTypeBuilder<RentalPeriod> b)
    {
        b.Property(rp => rp.RenterName).HasMaxLength(160).IsRequired();
        b.Property(rp => rp.RenterPhone).HasMaxLength(32);
        b.Property(rp => rp.Notes).HasMaxLength(2000);

        b.HasIndex(rp => rp.PropertyId);
        b.HasIndex(rp => new { rp.PropertyId, rp.StartDate, rp.EndDate });

        b.HasOne(rp => rp.Property).WithMany(p => p.RentalPeriods)
            .HasForeignKey(rp => rp.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(rp => rp.BookingRequest).WithMany()
            .HasForeignKey(rp => rp.BookingRequestId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class BrokerPropertyRequestConfiguration : IEntityTypeConfiguration<BrokerPropertyRequest>
{
    public void Configure(EntityTypeBuilder<BrokerPropertyRequest> b)
    {
        b.Property(br => br.ClientName).HasMaxLength(160).IsRequired();
        b.Property(br => br.ClientPhone).HasMaxLength(32).IsRequired();
        b.Property(br => br.Notes).HasMaxLength(2000);

        b.HasIndex(br => br.BrokerId);
        b.HasIndex(br => br.PropertyId);
        b.HasIndex(br => br.Status);

        b.HasOne(br => br.Broker).WithMany()
            .HasForeignKey(br => br.BrokerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(br => br.Property).WithMany(p => p.BrokerRequests)
            .HasForeignKey(br => br.PropertyId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PropertyRequirementConfiguration : IEntityTypeConfiguration<PropertyRequirement>
{
    public void Configure(EntityTypeBuilder<PropertyRequirement> b)
    {
        b.Property(pr => pr.CustomerName).HasMaxLength(160).IsRequired();
        b.Property(pr => pr.CustomerEmail).HasMaxLength(200).IsRequired();
        b.Property(pr => pr.CustomerPhone).HasMaxLength(32).IsRequired();
        b.Property(pr => pr.MinPrice).HasPrecision(18, 2);
        b.Property(pr => pr.MaxPrice).HasPrecision(18, 2);
        b.Property(pr => pr.DesiredAmenities).HasMaxLength(1000);
        b.Property(pr => pr.Notes).HasMaxLength(3000);

        b.HasIndex(pr => pr.Status);
        b.HasIndex(pr => pr.CreatedAt);
        b.HasIndex(pr => pr.VillageId);

        b.HasOne(pr => pr.User).WithMany()
            .HasForeignKey(pr => pr.UserId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(pr => pr.PropertyType).WithMany()
            .HasForeignKey(pr => pr.PropertyTypeId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(pr => pr.Village).WithMany()
            .HasForeignKey(pr => pr.VillageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(pr => pr.Zone).WithMany()
            .HasForeignKey(pr => pr.ZoneId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(pr => pr.AssignedStaff).WithMany()
            .HasForeignKey(pr => pr.AssignedStaffId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.Property(p => p.Amount).HasPrecision(18, 2);
        b.Property(p => p.Currency).HasMaxLength(8);
        b.Property(p => p.Method).HasMaxLength(64);
        b.Property(p => p.TransactionRef).HasMaxLength(128);
        b.HasOne(p => p.PurchaseRequest).WithMany(r => r.Payments)
            .HasForeignKey(p => p.PurchaseRequestId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(p => p.BookingRequest).WithMany()
            .HasForeignKey(p => p.BookingRequestId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.Property(d => d.FileName).HasMaxLength(260).IsRequired();
        b.Property(d => d.Url).HasMaxLength(1000).IsRequired();
        b.Property(d => d.Type).HasMaxLength(64);
        b.HasOne(d => d.User).WithMany()
            .HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(d => d.PurchaseRequest).WithMany()
            .HasForeignKey(d => d.PurchaseRequestId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.Property(a => a.Action).HasMaxLength(120).IsRequired();
        b.Property(a => a.Entity).HasMaxLength(120).IsRequired();
        b.Property(a => a.EntityId).HasMaxLength(64).IsRequired();
        b.Property(a => a.IpAddress).HasMaxLength(64);
        b.Property(a => a.OldValue).HasColumnType("nvarchar(max)");
        b.Property(a => a.NewValue).HasColumnType("nvarchar(max)");
        b.HasOne(a => a.User).WithMany()
            .HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(a => new { a.Entity, a.EntityId });
    }
}
