using Application.Common;

namespace Application.DTOs;

public sealed record DashboardDto(
    int TotalProperties,
    int PublishedProperties,
    int PendingProperties,
    int SoldProperties,
    int TotalUsers,
    int PurchaseRequests,
    int PendingPurchaseRequests,
    int BookingRequests,
    int PendingBookingRequests,
    long PropertyViews,
    int Inquiries,
    int UnreadInquiries);

public sealed record AdminUserDto(
    int Id, string FullName, string Email, string? PhoneNumber,
    string Role, bool IsActive, DateTime CreatedAt);

public sealed record SetUserRoleRequest(string Role);

public sealed record AdminAgentDto(
    int Id, string Name, string? Title, string? Agency,
    string? Phone, string? Email, bool IsVerified);

public sealed record AdminReviewDto(
    int Id, int PropertyId, string PropertyTitle, int UserId, string UserName,
    int Rating, string? Comment, bool IsApproved, DateTime CreatedAt);

public sealed record SetReviewApprovalRequest(bool Approved);
