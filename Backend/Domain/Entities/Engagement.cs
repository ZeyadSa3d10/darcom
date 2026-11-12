using Domain.Common;

namespace Domain.Entities;

public sealed class Favorite
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PropertyId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Property Property { get; set; } = null!;
}

public sealed class Review : EntityBase
{
    public int PropertyId { get; set; }
    public int UserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public bool IsApproved { get; set; }

    public Property Property { get; set; } = null!;
    public User User { get; set; } = null!;
}

public sealed class PropertyInquiry : EntityBase
{
    public int PropertyId { get; set; }
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }

    public Property Property { get; set; } = null!;
    public User? User { get; set; }
}

public sealed class PropertyView
{
    public int Id { get; set; }
    public int PropertyId { get; set; }
    public int? UserId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    public Property Property { get; set; } = null!;
}

public sealed class SearchHistory
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Query { get; set; } = string.Empty;
    public string? Filters { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}

public sealed class ContactMessage : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}

public sealed class Notification : EntityBase
{
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    /// <summary>e.g. booking.created, booking.confirmed, inquiry.created, property.created.</summary>
    public string? Type { get; set; }
    public int? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? EventKey { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    public User User { get; set; } = null!;
}
