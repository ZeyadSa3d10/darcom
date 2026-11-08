namespace Application.DTOs;

public sealed record VillageDto(
    int Id,
    string Name,
    string? NameAr,
    string Slug,
    string? ImageUrl,
    bool IsActive,
    int PropertiesCount,
    List<ZoneDto> Zones);

public sealed record ZoneDto(
    int Id,
    int VillageId,
    string Name,
    string? NameAr,
    string Slug,
    bool IsActive);

public sealed record CreateVillageRequest(
    string Name,
    string? NameAr = null,
    string? Slug = null,
    string? ImageUrl = null,
    bool IsActive = true);

public sealed record UpdateVillageRequest(
    string? Name,
    string? NameAr = null,
    string? Slug = null,
    string? ImageUrl = null,
    bool? IsActive = null);

public sealed record CreateZoneRequest(
    string Name,
    string? NameAr = null,
    string? Slug = null,
    bool IsActive = true);

public sealed record UpdateZoneRequest(
    string? Name,
    string? NameAr = null,
    string? Slug = null,
    bool? IsActive = null);

public sealed record CreatePropertyTypeRequest(
    string Name,
    string? Slug,
    string? Description,
    string? Icon);

public sealed record UpdatePropertyTypeRequest(
    string? Name,
    string? Slug,
    string? Description,
    string? Icon);

public sealed record PropertyTypeDto(
    int Id,
    string Name,
    string Slug,
    string? Description,
    string? Icon);
