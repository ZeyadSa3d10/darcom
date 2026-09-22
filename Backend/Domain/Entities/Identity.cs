using Domain.Common;

namespace Domain.Entities;

public sealed class Role : EntityBase
{
    public string Name { get; set; } = string.Empty; // Admin, Agent, Seller, Buyer
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
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
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
