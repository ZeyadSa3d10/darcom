using Application.Common;

namespace Application.DTOs;

// ---------- Favorites ----------

public sealed record AddFavoriteRequest(int PropertyId);

// ---------- Purchase requests ----------

public sealed record CreatePurchaseRequest(
    int PropertyId,
    string FullName,
    string Email,
    string Phone,
    string? Country,
    string? City,
    string? NationalId,
    string? PreferredContact,
    string? Address,
    string? Notes,
    string? PaymentMethod,
    bool FinancingRequired,
    DateTime? PreferredAppointment,
    string? Timeline);

public sealed record RequestPropertyDto(
    int Id, string Title, string Slug, string ReferenceNumber,
    decimal Price, string Currency, string Location);

public sealed record PurchaseRequestDto(
    int Id,
    string RequestNumber,
    string Status,
    DateTime CreatedAt,
    RequestPropertyDto Property,
    string FullName,
    string Email,
    string Phone,
    string? PaymentMethod,
    bool FinancingRequired,
    string? Timeline);

// ---------- Booking (rental) requests ----------

public sealed record CreateBookingRequest(
    int PropertyId,
    string FullName,
    string Email,
    string Phone,
    DateTime? StartDate,
    string? Duration,
    string? Notes,
    DateTime? EndDate = null);

public sealed record BookingRequestDto(
    int Id,
    string RequestNumber,
    string Status,
    DateTime CreatedAt,
    RequestPropertyDto Property,
    string FullName,
    string Email,
    string Phone,
    DateTime? StartDate = null,
    DateTime? EndDate = null);

// ---------- Admin status changes ----------

public sealed record UpdateRequestStatusRequest(string Status, string? AdminNotes);

public sealed record RejectPropertyRequest(string Reason);

// ---------- Seller submission ----------

public sealed record SellerFeatureDto(string Title, string? Value);

public sealed record SellerImageDto(string Url, string? AltText);

public sealed record SellerVideoDto(string Url, string? Type);

public sealed record SellerSubmissionRequest(
    string Title,
    string? Description,
    int PropertyTypeId,
    string Purpose,
    decimal Price,
    decimal? Area,
    int? Bedrooms,
    int? Bathrooms,
    int? Floor,
    int? TotalFloors,
    int? BuiltYear,
    string? FurnishedStatus,
    string? FinishingStatus,
    bool Parking,
    bool Garden,
    bool Pool,
    bool SeaView,
    bool BeachAccess,
    int LocationId,
    string? Address,
    string? Developer,
    string? ContactPhone,
    List<int> AmenityIds,
    List<SellerFeatureDto> Features,
    List<SellerImageDto> Images,
    List<SellerVideoDto> Videos,
    int VillageId = 0,
    int? ZoneId = null,
    string? BuildingNumber = null);

// ---------- Inquiries ----------

public sealed record CreateInquiryRequest(
    string? Name,
    string? Email,
    string? Phone,
    string Message);

public sealed record InquiryDto(
    int Id,
    int PropertyId,
    string? PropertyTitle,
    string Name,
    string Email,
    string? Phone,
    string Message,
    bool IsRead,
    DateTime CreatedAt);

// ---------- General contact ----------

public sealed record ContactRequest(
    string Name,
    string Email,
    string? Phone,
    string? Subject,
    string Message);

// ---------- Notifications ----------

public sealed record NotificationDto(
    int Id,
    string Title,
    string Body,
    string? Type,
    bool IsRead,
    DateTime CreatedAt,
    int? RelatedEntityId = null,
    string? RelatedEntityType = null,
    DateTime? ReadAt = null);

// ---------- Media ----------

public sealed record MediaItemDto(
    string Kind, int Id, string Url, string? Type, int Order, bool IsPrimary, string? AltText);

// ---------- Audit ----------

public sealed record AuditLogDto(
    int Id, int? UserId, string Action, string Entity, string EntityId,
    DateTime Timestamp, string? IpAddress, string? OldValue, string? NewValue);
