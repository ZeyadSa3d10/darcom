namespace Application.DTOs;

public sealed record RegisterBrokerRequest(
    string? AgencyName,
    string? LicenseNumber,
    string? NationalId,
    string? DocumentUrl);

public sealed class RegisterBrokerDto
{
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public string? AgencyName { get; set; }
    public string? LicenseNumber { get; set; }
    public string? NationalId { get; set; }
    public string? IdCardFrontBase64 { get; set; }
    public string? IdCardBackBase64 { get; set; }
}

public sealed record SendOtpRequest(string PhoneNumber);

public sealed record VerifyOtpRequest(string PhoneNumber, string Code);

public sealed record BrokerProfileDto(
    int Id,
    int UserId,
    string FullName,
    string Email,
    string? PhoneNumber,
    string? AgencyName,
    string? LicenseNumber,
    string? NationalId,
    string? DocumentUrl,
    string? IdCardFrontPath,
    string? IdCardBackPath,
    bool IsPhoneVerified,
    string Status,
    string? AdminNotes,
    DateTime? ApprovedAt,
    DateTime CreatedAt);

public sealed record SetBrokerStatusRequest(
    string Status,
    string? AdminNotes);

public sealed record CreateBrokerPropertyRequest(
    int PropertyId,
    string? ClientName,
    string? ClientPhone,
    string Purpose,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Notes);

public sealed record BrokerPropertyRequestCreateDto(
    int PropertyId,
    string Purpose,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? Notes = null);

public sealed record BrokerPropertyRequestDto(
    int Id,
    int BrokerId,
    string BrokerName,
    int PropertyId,
    string PropertyTitle,
    string? ClientName,
    string? ClientPhone,
    string Purpose,
    DateTime? StartDate,
    DateTime? EndDate,
    string Status,
    string? Notes,
    DateTime CreatedAt);

public sealed record BrokerPropertySubmissionCreateDto(
    decimal Area,
    int VillageId,
    int? ZoneId,
    string UnitNumber);

public sealed record BrokerPropertySubmissionDto(
    int Id,
    int BrokerId,
    string BrokerName,
    string? BrokerPhone,
    int VillageId,
    string VillageName,
    int? ZoneId,
    string? ZoneName,
    decimal Area,
    string UnitNumber,
    string Status,
    string? AdminNotes,
    int? CreatedPropertyId,
    DateTime CreatedAt);

public sealed record UpdateBrokerSubmissionStatusRequest(
    string Status,
    string? AdminNotes);

public sealed record BrokerRequirementCreateDto(
    string Purpose,
    int? PropertyTypeId = null,
    int? VillageId = null,
    int? ZoneId = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    decimal? Area = null,
    int? Bedrooms = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? Notes = null);

public sealed record BrokerDashboardDto(
    BrokerProfileDto? Profile,
    int TotalProperties,
    int PendingProperties,
    int ApprovedProperties,
    int RejectedProperties,
    int ClientRequestsCount,
    int PendingSubmissions = 0,
    int PropertyRequirementsCount = 0);

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
