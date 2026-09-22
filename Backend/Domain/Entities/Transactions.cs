using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class PurchaseRequest : EntityBase
{
    public string RequestNumber { get; set; } = string.Empty;
    public int PropertyId { get; set; }
    public int BuyerId { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    // Step 2 — customer information.
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? NationalId { get; set; }
    public string? PreferredContact { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }

    // Step 3 — purchase information.
    public string? PaymentMethod { get; set; }
    public bool FinancingRequired { get; set; }
    public DateTime? PreferredAppointment { get; set; }
    public string? Timeline { get; set; }
    public string? AdminNotes { get; set; }

    public Property Property { get; set; } = null!;
    public User Buyer { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public sealed class BookingRequest : EntityBase
{
    public string RequestNumber { get; set; } = string.Empty;
    public int PropertyId { get; set; }
    public int RenterId { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public string? Duration { get; set; }
    public string? Notes { get; set; }

    public Property Property { get; set; } = null!;
    public User Renter { get; set; } = null!;
}

public sealed class Payment : EntityBase
{
    public int? PurchaseRequestId { get; set; }
    public int? BookingRequestId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EGP";
    public string? Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? TransactionRef { get; set; }

    public PurchaseRequest? PurchaseRequest { get; set; }
    public BookingRequest? BookingRequest { get; set; }
}

/// <summary>User-owned files (IDs, contracts). Property media lives in Property* tables.</summary>
public sealed class Document : EntityBase
{
    public int? UserId { get; set; }
    public int? PurchaseRequestId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Type { get; set; }

    public User? User { get; set; }
    public PurchaseRequest? PurchaseRequest { get; set; }
}

public sealed class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    public User? User { get; set; }
}
