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
        // Active = Pending, UnderReview, Contacted, Negotiation (see RequestRules.IsActive).
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
