using Domain.Enums;

namespace Domain.Rules;

/// <summary>State machine for purchase / booking requests (website.md #19).</summary>
public static class RequestRules
{
    private static readonly Dictionary<RequestStatus, RequestStatus[]> Transitions = new()
    {
        [RequestStatus.Pending] = new[] { RequestStatus.UnderReview, RequestStatus.Contacted, RequestStatus.Cancelled },
        [RequestStatus.UnderReview] = new[] { RequestStatus.Contacted, RequestStatus.Negotiation, RequestStatus.Approved, RequestStatus.Rejected, RequestStatus.Cancelled },
        [RequestStatus.Contacted] = new[] { RequestStatus.Negotiation, RequestStatus.Approved, RequestStatus.Rejected, RequestStatus.Cancelled },
        [RequestStatus.Negotiation] = new[] { RequestStatus.Approved, RequestStatus.Rejected, RequestStatus.Cancelled },
        [RequestStatus.Approved] = new[] { RequestStatus.Completed, RequestStatus.Cancelled },
        [RequestStatus.Rejected] = Array.Empty<RequestStatus>(),
        [RequestStatus.Completed] = Array.Empty<RequestStatus>(),
        [RequestStatus.Cancelled] = Array.Empty<RequestStatus>()
    };

    public static bool CanTransition(RequestStatus from, RequestStatus to)
        => Transitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    /// <summary>An "active" request blocks duplicate submissions for the same buyer + property.</summary>
    public static bool IsActive(RequestStatus status)
        => status is RequestStatus.Pending
            or RequestStatus.UnderReview
            or RequestStatus.Contacted
            or RequestStatus.Negotiation;

    /// <summary>
    /// Requirement 9 date-overlap logic: Existing.StartDate < Requested.EndDate && Existing.EndDate > Requested.StartDate
    /// </summary>
    public static bool HasDateOverlap(DateTime startA, DateTime endA, DateTime startB, DateTime endB)
        => startA < endB && endA > startB;
}
