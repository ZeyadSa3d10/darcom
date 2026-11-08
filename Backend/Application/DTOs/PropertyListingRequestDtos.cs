namespace Application.DTOs;

public sealed record CreatePropertyListingRequest(
    int VillageId,
    int ZoneId,
    string BuildingNumber,
    string UnitNumber,
    string PhoneNumber);

public sealed record UpdateListingRequestStatusRequest(
    string Status,
    string? AdminNotes = null,
    DateTime? InspectionDate = null,
    int? AssignedAdminId = null);

public sealed record PropertyListingRequestDto(
    int Id,
    string RequestNumber,
    int UserId,
    string OwnerName,
    string PhoneNumber,
    int VillageId,
    string VillageName,
    string? VillageNameAr,
    int ZoneId,
    string ZoneName,
    string? ZoneNameAr,
    string BuildingNumber,
    string UnitNumber,
    string Status,
    string? AdminNotes,
    DateTime? InspectionDate,
    int? AssignedAdminId,
    string? AssignedAdminName,
    int? PropertyId,
    string? PropertyTitle,
    string? PropertyReference,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

