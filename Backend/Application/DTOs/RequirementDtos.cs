namespace Application.DTOs;

public sealed record CreatePropertyRequirementRequest(
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string Purpose,
    int? PropertyTypeId,
    int? VillageId,
    int? ZoneId,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? Bedrooms,
    DateTime? StartDate,
    DateTime? EndDate,
    string? DesiredAmenities,
    string? Notes);

public sealed record PropertyRequirementDto(
    int Id,
    int? UserId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string Purpose,
    int? PropertyTypeId,
    string? PropertyTypeName,
    int? VillageId,
    string? VillageName,
    int? ZoneId,
    string? ZoneName,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? Bedrooms,
    DateTime? StartDate,
    DateTime? EndDate,
    string? DesiredAmenities,
    string? Notes,
    string Status,
    int? AssignedStaffId,
    string? AssignedStaffName,
    DateTime CreatedAt);

public sealed record UpdateRequirementStatusRequest(
    string Status,
    int? AssignedStaffId);

public sealed record RentalPeriodDto(
    int Id,
    int PropertyId,
    int? BookingRequestId,
    DateTime StartDate,
    DateTime EndDate,
    string RenterName,
    string? RenterPhone,
    string? Notes,
    DateTime CreatedAt);

public sealed record PublicRentalPeriodDto(DateTime StartDate, DateTime EndDate);

public sealed class CreateRentalPeriodRequest
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string RenterName { get; set; } = string.Empty;
    public string? RenterPhone { get; set; }
    public string? Notes { get; set; }
}

