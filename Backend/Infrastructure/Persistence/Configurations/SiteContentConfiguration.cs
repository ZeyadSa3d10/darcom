using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class SiteContentConfiguration : IEntityTypeConfiguration<SiteContent>
{
    public void Configure(EntityTypeBuilder<SiteContent> builder)
    {
        builder.ToTable("SiteContents");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ContentKey)
            .IsRequired()
            .HasMaxLength(128);

        builder.HasIndex(e => e.ContentKey)
            .IsUnique();

        builder.Property(e => e.ContentValue)
            .IsRequired()
            .HasColumnType("nvarchar(max)");

        builder.Property(e => e.Description)
            .HasMaxLength(256);
    }
}
