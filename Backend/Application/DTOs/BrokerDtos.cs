namespace Application.DTOs;

public sealed record RegisterBrokerRequest(
    string AgencyName,
    string LicenseNumber,
    string? NationalId,
    string? DocumentUrl);

public sealed record BrokerProfileDto(
    int Id,
    int UserId,
    string FullName,
    string Email,
    string? PhoneNumber,
    string AgencyName,
    string LicenseNumber,
    string? NationalId,
    string? DocumentUrl,
    string Status,
    string? AdminNotes,
    DateTime? ApprovedAt,
    DateTime CreatedAt);

public sealed record SetBrokerStatusRequest(
    string Status,
    string? AdminNotes);

public sealed record CreateBrokerPropertyRequest(
    int PropertyId,
    string ClientName,
    string ClientPhone,
    string Purpose,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Notes);

public sealed record BrokerPropertyRequestDto(
    int Id,
    int BrokerId,
    string BrokerName,
    int PropertyId,
    string PropertyTitle,
    string ClientName,
    string ClientPhone,
    string Purpose,
    DateTime? StartDate,
    DateTime? EndDate,
    string Status,
    string? Notes,
    DateTime CreatedAt);

public sealed record BrokerDashboardDto(
    BrokerProfileDto? Profile,
    int TotalProperties,
    int PendingProperties,
    int ApprovedProperties,
    int RejectedProperties,
    int ClientRequestsCount);

public sealed record BrokerPropertySubmissionRequest(
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
    int VillageId,
    int? ZoneId = null,
    string? BuildingNumber = null,
    int? LocationId = null,
    string? Address = null,
    string? Developer = null,
    string? ContactPhone = null,
    List<int>? AmenityIds = null,
    List<SellerFeatureDto>? Features = null,
    List<SellerImageDto>? Images = null,
    List<SellerVideoDto>? Videos = null,
    int? OwnerId = null);

