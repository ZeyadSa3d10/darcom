namespace Domain.Enums;

/// <summary>Lifecycle of a purchase / booking request (website.md #19).</summary>
public enum RequestStatus
{
    Pending = 0,
    UnderReview = 1,
    Contacted = 2,
    Negotiation = 3,
    Approved = 4,
    Rejected = 5,
    Completed = 6,
    Cancelled = 7
}

public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3
}

/// <summary>Lifecycle of a user property listing request (request & inspection workflow).</summary>
public enum ListingRequestStatus
{
    Pending = 0,
    Contacted = 1,
    InspectionScheduled = 2,
    Inspected = 3,
    Completed = 4,
    Rejected = 5
}
