using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class FavoritesController : ApiBaseController
{
    private readonly IFavoriteService _favorites;

    public FavoritesController(IFavoriteService favorites)
    {
        _favorites = favorites;
    }

    /// <summary>Add a property to favorites. Idempotent — repeating returns success, never duplicates.</summary>
    /// <response code="201">Added.</response>
    /// <response code="404">Property not found.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<object?>), 201)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<object?>>> Add(
        [FromBody] AddFavoriteRequest request,
        [FromServices] AddFavoriteValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _favorites.AddAsync(CurrentUserId(), request.PropertyId, ct), ct);

    [HttpDelete("{propertyId:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> Remove(int propertyId, CancellationToken ct)
    {
        var result = await _favorites.RemoveAsync(CurrentUserId(), propertyId, ct);
        return Ok(ApiResponse<object?>.Ok(result.Message));
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _favorites.MyAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyListDto>>.Ok(result.Data!));
    }
}
