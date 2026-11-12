using Domain.Common;
using Microsoft.AspNetCore.Identity;

namespace Domain.Entities;

public sealed class Role : IdentityRole<int>
{
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public sealed class User : IdentityUser<int>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public BrokerProfile? BrokerProfile { get; set; }
    public ICollection<UserRefreshToken> RefreshTokens { get; set; } = new List<UserRefreshToken>();
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Property> OwnedProperties { get; set; } = new List<Property>();
    public ICollection<Property> ManagedProperties { get; set; } = new List<Property>();
    public ICollection<Property> BrokerProperties { get; set; } = new List<Property>();
    public ICollection<BrokerPropertySubmission> BrokerSubmissions { get; set; } = new List<BrokerPropertySubmission>();
    public ICollection<BrokerPropertyRequest> BrokerRequests { get; set; } = new List<BrokerPropertyRequest>();
    public ICollection<PropertyListingRequest> PropertyListingRequests { get; set; } = new List<PropertyListingRequest>();
}

public sealed class UserRefreshToken : EntityBase
{
    public int UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? RevocationReason { get; set; }

    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsRevoked && !IsExpired;

    public User User { get; set; } = null!;
}

public sealed class EmailOtpCode : EntityBase
{
    public string NormalizedEmail { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public string Salt { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 5;
    public bool IsUsed { get; set; }
    public DateTime? UsedAt { get; set; }
    public string? RequestIp { get; set; }
}

public enum BrokerStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Suspended = 3
}

/// <summary>
/// External broker profile. Registration remains Pending until approved by company/admin.
/// </summary>
public sealed class BrokerProfile : EntityBase
{
    public int UserId { get; set; }
    public string? AgencyName { get; set; }
    public string? LicenseNumber { get; set; }
    public string? NationalId { get; set; }
    public string? DocumentUrl { get; set; }
    public string? IdCardFrontPath { get; set; }
    public string? IdCardBackPath { get; set; }
    public bool IsPhoneVerified { get; set; }
    public BrokerStatus Status { get; set; } = BrokerStatus.Pending;
    public string? AdminNotes { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<BrokerPropertyRequest> Requests { get; set; } = new List<BrokerPropertyRequest>();
    public ICollection<BrokerPropertySubmission> Submissions { get; set; } = new List<BrokerPropertySubmission>();
}

public sealed class Agent : EntityBase
{
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Title { get; set; }
    public string? Agency { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsVerified { get; set; }

    public User? User { get; set; }
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}
