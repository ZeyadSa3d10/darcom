using Domain.Common;

namespace Domain.Entities;

public sealed class Role : EntityBase
{
    public string Name { get; set; } = string.Empty; // Admin, Broker, Seller (Owner), Buyer (Customer), Agent
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}

public sealed class User : EntityBase
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;

    // Refresh-token rotation storage (auth logic lands in PHASE-02).
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    // Password-reset token storage (single-use, short-lived).
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }

    public Role Role { get; set; } = null!;
    public BrokerProfile? BrokerProfile { get; set; }
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Property> OwnedProperties { get; set; } = new List<Property>();
    public ICollection<Property> ManagedProperties { get; set; } = new List<Property>();
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
    public string AgencyName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public string? DocumentUrl { get; set; }
    public BrokerStatus Status { get; set; } = BrokerStatus.Pending;
    public string? AdminNotes { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<BrokerPropertyRequest> Requests { get; set; } = new List<BrokerPropertyRequest>();
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
