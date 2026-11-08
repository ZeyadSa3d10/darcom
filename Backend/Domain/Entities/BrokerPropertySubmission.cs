using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// Workflow 1: Broker submits a property unit they have for company inspection and listing.
/// Collects ONLY 4 core fields: Area (m²), Village, Zone (optional), Unit/Chalet number.
/// Physical inspection and photo taking are carried out by company admins before creating the actual Property listing.
/// </summary>
public sealed class BrokerPropertySubmission : EntityBase
{
    public int BrokerId { get; set; }
    public int VillageId { get; set; }
    public int? ZoneId { get; set; }
    public decimal Area { get; set; }
    public string UnitNumber { get; set; } = string.Empty;

    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public string? AdminNotes { get; set; }

    public User Broker { get; set; } = null!;
    public Village Village { get; set; } = null!;
    public Zone? Zone { get; set; }
    public Property? CreatedProperty { get; set; }
}
