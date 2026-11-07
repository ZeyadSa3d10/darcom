using Application.Common;
using Application.DTOs;
using Domain.Entities;

namespace Application.Stores;

/// <summary>Catalog persistence abstraction — EF Core stays in Infrastructure.</summary>
public interface IPropertyStore
{
    Task<PagedResult<PropertyListDto>> SearchAsync(PropertyQuery query, bool includeAllStatuses, CancellationToken ct = default);
    Task<PropertyDetailsDto?> GetDetailsAsync(int id, bool isAdmin, CancellationToken ct = default);
    Task<PropertyDetailsDto?> GetDetailsBySlugAsync(string slug, bool isAdmin, CancellationToken ct = default);
    Task<List<PropertyListDto>> GetFeaturedAsync(int count, CancellationToken ct = default);
    Task<PagedResult<PropertyListDto>> QuickSearchAsync(string term, int page, int pageSize, CancellationToken ct = default);
    Task<Property?> GetEntityAsync(int id, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, int? excludeId = null, CancellationToken ct = default);
    Task<bool> ReferenceExistsAsync(string reference, CancellationToken ct = default);
    Task<bool> PropertyTypeExistsAsync(int id, CancellationToken ct = default);
    Task<bool> LocationExistsAsync(int id, CancellationToken ct = default);
    Task<bool> VillageExistsAsync(int id, CancellationToken ct = default);
    Task<bool> ZoneExistsAsync(int id, CancellationToken ct = default);
    Task<bool> ZoneBelongsToVillageAsync(int zoneId, int villageId, CancellationToken ct = default);
    Task AddAsync(Property property, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);

    // Media + children (website.md #22). URLs only — binary storage lives behind IStorageProvider.
    Task<PropertyImage> AttachImageAsync(int propertyId, string url, string? altText, CancellationToken ct = default);
    Task<PropertyVideo> AttachVideoAsync(int propertyId, string url, string? type, CancellationToken ct = default);
    Task<PropertyDocument> AttachDocumentAsync(int propertyId, string url, string? type, CancellationToken ct = default);
    Task SetFeaturesAsync(int propertyId, List<(string Title, string? Value)> features, CancellationToken ct = default);
    Task SetAmenitiesAsync(int propertyId, List<int> amenityIds, CancellationToken ct = default);
    Task<List<MediaItemDto>> GetMediaAsync(int propertyId, CancellationToken ct = default);
    Task<(string Kind, int PropertyId, string Url)?> RemoveMediaAsync(string kind, int mediaId, CancellationToken ct = default);
    Task<(int PropertyId, int? OwnerId, string Url)?> PeekMediaAsync(string kind, int mediaId, CancellationToken ct = default);
    Task<int?> GetOwnerIdAsync(int propertyId, CancellationToken ct = default);
    Task<bool> CanUserManagePropertyAsync(int propertyId, int userId, CancellationToken ct = default);
    Task<bool> AmenityExistsAsync(int amenityId, CancellationToken ct = default);
    Task<List<PropertyListDto>> GetRelatedAsync(int propertyId, int count, CancellationToken ct = default);
    Task<PagedResult<PropertyListDto>> GetMineAsync(int ownerId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<PropertyListDto>> GetBrokerPropertiesAsync(int brokerUserId, string? status, int page, int pageSize, CancellationToken ct = default);
    Task<(int Total, int Pending, int Approved, int Rejected)> GetBrokerPropertyCountsAsync(int brokerUserId, CancellationToken ct = default);
    Task<List<RentalPeriodDto>> GetOwnerRentalPeriodsAsync(int ownerId, int? propertyId = null, CancellationToken ct = default);
    Task<List<RentalPeriodDto>> GetPropertyRentalPeriodsAsync(int propertyId, CancellationToken ct = default);
}
