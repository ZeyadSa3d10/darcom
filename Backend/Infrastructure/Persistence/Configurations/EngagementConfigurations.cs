using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class FavoriteConfiguration : IEntityTypeConfiguration<Favorite>
{
    public void Configure(EntityTypeBuilder<Favorite> b)
    {
        // Duplicate prevention at the database level (website.md #26).
        b.HasIndex(f => new { f.UserId, f.PropertyId }).IsUnique();
        b.HasOne(f => f.User).WithMany(u => u.Favorites)
            .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(f => f.Property).WithMany(p => p.Favorites)
            .HasForeignKey(f => f.PropertyId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> b)
    {
        b.Property(r => r.Comment).HasColumnType("nvarchar(max)");
        b.HasOne(r => r.Property).WithMany(p => p.Reviews)
            .HasForeignKey(r => r.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(r => r.User).WithMany()
            .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(r => r.PropertyId);
    }
}

public sealed class PropertyInquiryConfiguration : IEntityTypeConfiguration<PropertyInquiry>
{
    public void Configure(EntityTypeBuilder<PropertyInquiry> b)
    {
        b.Property(i => i.Name).HasMaxLength(160).IsRequired();
        b.Property(i => i.Email).HasMaxLength(200).IsRequired();
        b.Property(i => i.Phone).HasMaxLength(32);
        b.Property(i => i.Message).HasColumnType("nvarchar(max)").IsRequired();
        b.HasOne(i => i.Property).WithMany()
            .HasForeignKey(i => i.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(i => i.User).WithMany()
            .HasForeignKey(i => i.UserId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(i => i.PropertyId);
    }
}

public sealed class PropertyViewConfiguration : IEntityTypeConfiguration<PropertyView>
{
    public void Configure(EntityTypeBuilder<PropertyView> b)
    {
        b.Property(v => v.IpAddress).HasMaxLength(64);
        b.HasOne(v => v.Property).WithMany()
            .HasForeignKey(v => v.PropertyId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(v => v.PropertyId);
    }
}

public sealed class SearchHistoryConfiguration : IEntityTypeConfiguration<SearchHistory>
{
    public void Configure(EntityTypeBuilder<SearchHistory> b)
    {
        b.Property(s => s.Query).HasMaxLength(300).IsRequired();
        b.Property(s => s.Filters).HasMaxLength(1000);
        b.HasOne(s => s.User).WithMany()
            .HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class ContactMessageConfiguration : IEntityTypeConfiguration<ContactMessage>
{
    public void Configure(EntityTypeBuilder<ContactMessage> b)
    {
        b.Property(c => c.Name).HasMaxLength(160).IsRequired();
        b.Property(c => c.Email).HasMaxLength(200).IsRequired();
        b.Property(c => c.Phone).HasMaxLength(32);
        b.Property(c => c.Subject).HasMaxLength(200);
        b.Property(c => c.Message).HasColumnType("nvarchar(max)").IsRequired();
    }
}

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.Property(n => n.Title).HasMaxLength(200).IsRequired();
        b.Property(n => n.Body).HasColumnType("nvarchar(max)").IsRequired();
        b.Property(n => n.Type).HasMaxLength(64);
        b.Property(n => n.RelatedEntityType).HasMaxLength(64);
        b.Property(n => n.EventKey).HasMaxLength(160);
        b.HasOne(n => n.User).WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(n => new { n.UserId, n.IsRead });
        b.HasIndex(n => new { n.UserId, n.EventKey })
            .IsUnique()
            .HasFilter("[EventKey] IS NOT NULL");
    }
}
