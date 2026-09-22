using Domain.Enums;

namespace Domain.Rules;

/// <summary>
/// Central business rules for property visibility and request availability
/// (website.md #46, #55). Server re-checks these on every write — never trusts UI state.
/// PHASE-04 reuses these guards inside transactional request flows.
/// </summary>
public static class PropertyRules
{
    private static readonly PropertyStatus[] PublicListStatuses =
    {
        PropertyStatus.Published,
        PropertyStatus.Featured,
        PropertyStatus.Reserved
    };

    /// <summary>Statuses an anonymous caller may see in listing endpoints.</summary>
    public static bool IsVisibleInPublicList(PropertyStatus status)
        => PublicListStatuses.Contains(status);

    /// <summary>
    /// Details pages may additionally show Sold/Rented read-only (market reference / SEO);
    /// drafts, pending, rejected and archived are never public.
    /// </summary>
    public static bool IsVisibleInPublicDetails(PropertyStatus status)
        => status is PropertyStatus.Published
            or PropertyStatus.Featured
            or PropertyStatus.Reserved
            or PropertyStatus.Sold
            or PropertyStatus.Rented;

    public static bool CanAcceptPurchaseRequest(PropertyStatus status)
        => status is PropertyStatus.Published
            or PropertyStatus.Featured
            or PropertyStatus.Reserved;

    public static bool CanAcceptRentalRequest(PropertyStatus status)
        => status is PropertyStatus.Published
            or PropertyStatus.Featured
            or PropertyStatus.Reserved;

    /// <summary>Statuses a non-admin writer may assign on create/update.</summary>
    public static bool CanWriterSetStatus(PropertyStatus status)
        => status is PropertyStatus.Draft or PropertyStatus.PendingReview;
}
