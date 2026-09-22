namespace Domain.Enums;

/// <summary>Locked lifecycle set for a property (website.md #25).</summary>
public enum PropertyStatus
{
    Draft = 0,
    PendingReview = 1,
    Published = 2,
    Featured = 3,
    Reserved = 4,
    Sold = 5,
    Rented = 6,
    Archived = 7,
    Rejected = 8
}

/// <summary>Commercial purpose. UI adapts CTA per purpose (website.md #5).</summary>
public enum PropertyPurpose
{
    Sale = 0,
    Rent = 1,
    Investment = 2
}
