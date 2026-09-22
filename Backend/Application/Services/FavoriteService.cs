using Application.Common;
using Application.DTOs;
using Application.Stores;

namespace Application.Services;

public interface IFavoriteService
{
    Task<ServiceResult<object?>> AddAsync(int userId, int propertyId, CancellationToken ct = default);
    Task<ServiceResult<object?>> RemoveAsync(int userId, int propertyId, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<PropertyListDto>>> MyAsync(int userId, int page, int pageSize, CancellationToken ct = default);
}

public sealed class FavoriteService : IFavoriteService
{
    private readonly IEngagementStore _store;

    public FavoriteService(IEngagementStore store)
    {
        _store = store;
    }

    public async Task<ServiceResult<object?>> AddAsync(int userId, int propertyId, CancellationToken ct = default)
    {
        if (!await _store.PropertyExistsAsync(propertyId, ct))
            return ServiceResult<object?>.NotFound("Property not found.");

        // Idempotent success — the unique (UserId, PropertyId) constraint is the backstop.
        if (await _store.IsFavoritedAsync(userId, propertyId, ct))
            return ServiceResult<object?>.Ok(null, "Already in favorites.");

        await _store.AddFavoriteAsync(userId, propertyId, ct);
        await _store.SaveChangesAsync(ct);
        return ServiceResult<object?>.Created(null, "Added to favorites.");
    }

    public async Task<ServiceResult<object?>> RemoveAsync(int userId, int propertyId, CancellationToken ct = default)
    {
        await _store.RemoveFavoriteAsync(userId, propertyId, ct);
        await _store.SaveChangesAsync(ct);
        return ServiceResult<object?>.Ok(null, "Removed from favorites.");
    }

    public async Task<ServiceResult<PagedResult<PropertyListDto>>> MyAsync(int userId, int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 50);
        return ServiceResult<PagedResult<PropertyListDto>>.Ok(
            await _store.GetFavoritesAsync(userId, page, pageSize, ct));
    }
}
