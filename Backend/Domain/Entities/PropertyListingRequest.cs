using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// Workflow: Normal authenticated user requests Darcom to list their property in the North Coast.
/// Collects ONLY 5 fields: Village, Zone, Building Number, Unit Number, Phone Number.
/// Physical inspection and photo taking are carried out by company staff before creating the actual Property listing.
/// </summary>
public sealed class PropertyListingRequest : EntityBase
{
    public string RequestNumber { get; set; } = string.Empty;
    public int UserId { get; set; }
    public int VillageId { get; set; }
    public int ZoneId { get; set; }
    public string BuildingNumber { get; set; } = string.Empty;
    public string UnitNumber { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;

    public ListingRequestStatus Status { get; set; } = ListingRequestStatus.Pending;
    public string? AdminNotes { get; set; }
    public DateTime? InspectionDate { get; set; }
    public int? AssignedAdminId { get; set; }
    public int? PropertyId { get; set; }

    public User User { get; set; } = null!;
    public Village Village { get; set; } = null!;
    public Zone Zone { get; set; } = null!;
    public User? AssignedAdmin { get; set; }
    public Property? CreatedProperty { get; set; }
}

