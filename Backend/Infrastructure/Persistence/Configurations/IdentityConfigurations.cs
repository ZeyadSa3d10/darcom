using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.Property(r => r.Name).HasMaxLength(64).IsRequired();
        b.Property(r => r.Description).HasMaxLength(300);
        b.HasIndex(r => r.Name).IsUnique();

        b.HasData(
            new Role { Id = 1, Name = "Admin", Description = "Full platform management.", CreatedAt = SeedDate },
            new Role { Id = 2, Name = "Agent", Description = "Manages assigned listings.", CreatedAt = SeedDate },
            new Role { Id = 3, Name = "Seller", Description = "Submits and manages own properties.", CreatedAt = SeedDate },
            new Role { Id = 4, Name = "Buyer", Description = "Browses, favorites and requests properties.", CreatedAt = SeedDate },
            new Role { Id = 5, Name = "Broker", Description = "External real estate broker submitting client requests.", CreatedAt = SeedDate }
        );
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.Property(u => u.FullName).HasMaxLength(160).IsRequired();
        b.Property(u => u.Email).HasMaxLength(200).IsRequired();
        b.Property(u => u.PhoneNumber).HasMaxLength(32);
        b.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
        b.Property(u => u.RefreshToken).HasMaxLength(200);
        b.Property(u => u.PasswordResetToken).HasMaxLength(200);
        b.HasIndex(u => u.Email).IsUnique();
        b.HasIndex(u => u.RoleId);
        b.HasOne(u => u.Role).WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class BrokerProfileConfiguration : IEntityTypeConfiguration<BrokerProfile>
{
    public void Configure(EntityTypeBuilder<BrokerProfile> b)
    {
        b.Property(bp => bp.AgencyName).HasMaxLength(160).IsRequired();
        b.Property(bp => bp.LicenseNumber).HasMaxLength(100).IsRequired();
        b.Property(bp => bp.NationalId).HasMaxLength(64);
        b.Property(bp => bp.DocumentUrl).HasMaxLength(1000);
        b.Property(bp => bp.AdminNotes).HasMaxLength(2000);

        b.HasIndex(bp => bp.UserId).IsUnique();
        b.HasIndex(bp => bp.Status);

        b.HasOne(bp => bp.User).WithOne(u => u.BrokerProfile)
            .HasForeignKey<BrokerProfile>(bp => bp.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AgentConfiguration : IEntityTypeConfiguration<Agent>
{
    public void Configure(EntityTypeBuilder<Agent> b)
    {
        b.Property(a => a.Name).HasMaxLength(160).IsRequired();
        b.Property(a => a.PhotoUrl).HasMaxLength(1000);
        b.Property(a => a.Title).HasMaxLength(120);
        b.Property(a => a.Agency).HasMaxLength(160);
        b.Property(a => a.Phone).HasMaxLength(32);
        b.Property(a => a.Email).HasMaxLength(200);
        b.HasOne(a => a.User).WithMany()
            .HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}
