using Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.ToTable("Roles");
        b.Property(r => r.Name).HasMaxLength(64).IsRequired();
        b.Property(r => r.NormalizedName).HasMaxLength(64);
        b.Property(r => r.Description).HasMaxLength(300);
        b.HasIndex(r => r.Name).IsUnique();

        b.HasData(
            new Role { Id = 1, Name = "Admin", NormalizedName = "ADMIN", ConcurrencyStamp = "ROLE-STAMP-0001", Description = "Full platform management.", CreatedAt = SeedDate },
            new Role { Id = 2, Name = "Agent", NormalizedName = "AGENT", ConcurrencyStamp = "ROLE-STAMP-0002", Description = "Manages assigned listings.", CreatedAt = SeedDate },
            new Role { Id = 3, Name = "Seller", NormalizedName = "SELLER", ConcurrencyStamp = "ROLE-STAMP-0003", Description = "Submits and manages own properties.", CreatedAt = SeedDate },
            new Role { Id = 4, Name = "Buyer", NormalizedName = "BUYER", ConcurrencyStamp = "ROLE-STAMP-0004", Description = "Browses, favorites and requests properties.", CreatedAt = SeedDate },
            new Role { Id = 5, Name = "Broker", NormalizedName = "BROKER", ConcurrencyStamp = "ROLE-STAMP-0005", Description = "External real estate broker submitting client requests.", CreatedAt = SeedDate }
        );
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.Property(u => u.FullName).HasMaxLength(160).IsRequired();
        b.Property(u => u.Email).HasMaxLength(200).IsRequired();
        b.Property(u => u.NormalizedEmail).HasMaxLength(200);
        b.Property(u => u.UserName).HasMaxLength(200);
        b.Property(u => u.NormalizedUserName).HasMaxLength(200);
        b.Property(u => u.PhoneNumber).HasMaxLength(32);
        b.Property(u => u.PasswordHash).HasMaxLength(500);
        b.HasIndex(u => u.Email).IsUnique();
        b.HasIndex(u => u.PhoneNumber);
    }
}

public sealed class IdentityUserRoleConfiguration : IEntityTypeConfiguration<IdentityUserRole<int>>
{
    public void Configure(EntityTypeBuilder<IdentityUserRole<int>> b) => b.ToTable("UserRoles");
}

public sealed class IdentityUserClaimConfiguration : IEntityTypeConfiguration<IdentityUserClaim<int>>
{
    public void Configure(EntityTypeBuilder<IdentityUserClaim<int>> b) => b.ToTable("UserClaims");
}

public sealed class IdentityUserLoginConfiguration : IEntityTypeConfiguration<IdentityUserLogin<int>>
{
    public void Configure(EntityTypeBuilder<IdentityUserLogin<int>> b) => b.ToTable("UserLogins");
}

public sealed class IdentityUserTokenConfiguration : IEntityTypeConfiguration<IdentityUserToken<int>>
{
    public void Configure(EntityTypeBuilder<IdentityUserToken<int>> b) => b.ToTable("UserTokens");
}

public sealed class IdentityRoleClaimConfiguration : IEntityTypeConfiguration<IdentityRoleClaim<int>>
{
    public void Configure(EntityTypeBuilder<IdentityRoleClaim<int>> b) => b.ToTable("RoleClaims");
}

public sealed class UserRefreshTokenConfiguration : IEntityTypeConfiguration<UserRefreshToken>
{
    public void Configure(EntityTypeBuilder<UserRefreshToken> b)
    {
        b.ToTable("UserRefreshTokens");
        b.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
        b.Property(t => t.ReplacedByTokenHash).HasMaxLength(128);
        b.Property(t => t.CreatedByIp).HasMaxLength(64);
        b.Property(t => t.RevokedByIp).HasMaxLength(64);
        b.Property(t => t.RevocationReason).HasMaxLength(200);

        b.HasIndex(t => t.TokenHash).IsUnique();
        b.HasIndex(t => t.UserId);

        b.Ignore(t => t.IsRevoked);
        b.Ignore(t => t.IsExpired);
        b.Ignore(t => t.IsActive);

        b.HasOne(t => t.User).WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class EmailOtpCodeConfiguration : IEntityTypeConfiguration<EmailOtpCode>
{
    public void Configure(EntityTypeBuilder<EmailOtpCode> b)
    {
        b.ToTable("EmailOtpCodes");
        b.Property(o => o.NormalizedEmail).HasMaxLength(200).IsRequired();
        b.Property(o => o.CodeHash).HasMaxLength(128).IsRequired();
        b.Property(o => o.Salt).HasMaxLength(64).IsRequired();
        b.Property(o => o.RequestIp).HasMaxLength(64);

        b.HasIndex(o => o.NormalizedEmail);
        b.HasIndex(o => new { o.NormalizedEmail, o.IsUsed, o.ExpiresAt });
    }
}

public sealed class BrokerProfileConfiguration : IEntityTypeConfiguration<BrokerProfile>
{
    public void Configure(EntityTypeBuilder<BrokerProfile> b)
    {
        b.Property(bp => bp.AgencyName).HasMaxLength(160);
        b.Property(bp => bp.LicenseNumber).HasMaxLength(100);
        b.Property(bp => bp.NationalId).HasMaxLength(64);
        b.Property(bp => bp.DocumentUrl).HasMaxLength(1000);
        b.Property(bp => bp.IdCardFrontPath).HasMaxLength(500);
        b.Property(bp => bp.IdCardBackPath).HasMaxLength(500);
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
