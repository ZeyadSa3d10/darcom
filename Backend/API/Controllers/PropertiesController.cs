using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PropertiesController : ApiBaseController
{
    private readonly IPropertyService _properties;

    public PropertiesController(IPropertyService properties)
    {
        _properties = properties;
    }

    /// <summary>
    /// Public catalog with filters, sorting and server-side pagination.
    /// Anonymous callers only see Published / Featured / Reserved.
    /// </summary>
    /// <response code="200">Paginated list (empty page with totals when out of range).</response>
    /// <response code="422">Invalid filter (bad sort, inverted price range, ...).</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 422)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> List(
        [FromQuery] PropertyQuery query,
        [FromServices] PropertyQueryValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, query, () => _properties.SearchAsync(query, IsAdmin(), ct), ct);

    /// <response code="200">Featured properties for home sections.</response>
    [HttpGet("featured")]
    [ProducesResponseType(typeof(ApiResponse<List<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<PropertyListDto>>>> Featured(
        [FromQuery] int count = 8,
        [FromQuery] string? purpose = null,
        CancellationToken ct = default)
    {
        var result = await _properties.GetFeaturedAsync(count, purpose, ct);
        return Ok(ApiResponse<List<PropertyListDto>>.Ok(result.Data!));
    }

    /// <summary>Full-text search across title, description, location and type.</summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> Search(
        [FromQuery] string q = "",
        [FromQuery] string? purpose = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(ApiResponse<PagedResult<PropertyListDto>>.Ok(new(new(), page, pageSize, 0, 1)));
        var result = await _properties.QuickSearchAsync(q, purpose, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyListDto>>.Ok(result.Data!));
    }

    /// <response code="200">Full property presentation.</response>
    /// <response code="404">Unknown slug or not publicly visible.</response>
    [HttpGet("slug/{slug}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 404)]
    public async Task<ActionResult<ApiResponse<PropertyDetailsDto>>> BySlug(string slug, CancellationToken ct)
    {
        var result = await _properties.GetBySlugAsync(slug, IsAdmin(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<PropertyDetailsDto>.Ok(result.Data!, result.Message)
            : ApiResponse<PropertyDetailsDto>.Fail(result.Message, result.Errors));
    }

    /// <response code="200">Full property presentation.</response>
    /// <response code="404">Unknown id or not publicly visible.</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 404)]
    public async Task<ActionResult<ApiResponse<PropertyDetailsDto>>> ById(int id, CancellationToken ct)
    {
        var result = await _properties.GetByIdAsync(id, IsAdmin(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<PropertyDetailsDto>.Ok(result.Data!, result.Message)
            : ApiResponse<PropertyDetailsDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>Similar properties: same type, same city first, closest price.</summary>
    [HttpGet("{id:int}/related")]
    [ProducesResponseType(typeof(ApiResponse<List<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<PropertyListDto>>>> Related(
        int id, [FromQuery] int count = 4, CancellationToken ct = default)
    {
        var result = await _properties.GetRelatedAsync(id, count, ct);
        return Ok(ApiResponse<List<PropertyListDto>>.Ok(result.Data!));
    }

    /// <summary>Public property rental availability calendar (booked intervals only — no private renter info).</summary>
    [HttpGet("{id:int}/rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<PublicRentalPeriodDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<PublicRentalPeriodDto>>>> RentalPeriods(int id, CancellationToken ct)
    {
        var result = await _properties.GetPublicRentalPeriodsAsync(id, ct);
        return Ok(ApiResponse<List<PublicRentalPeriodDto>>.Ok(result.Data!));
    }

    /// <summary>Seller/Agent listings start as Draft; Admin listings publish immediately.</summary>
    /// <response code="201">Created.</response>
    /// <response code="403">Buyers cannot list.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPost]
    [Authorize(Roles = "Seller,Agent,Admin")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Create(
        [FromBody] CreatePropertyRequest request,
        [FromServices] CreatePropertyValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _properties.CreateAsync(CurrentUserId(), CurrentRole()!, request, ct), ct);

    /// <summary>Owner or Admin. Writers cannot touch Sold/Rented/Archived or publish.</summary>
    /// <response code="403">Not the owner.</response>
    /// <response code="409">Locked lifecycle state.</response>
    [HttpPut("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(409)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Update(
        int id,
        [FromBody] UpdatePropertyRequest request,
        [FromServices] UpdatePropertyValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _properties.UpdateAsync(CurrentUserId(), IsAdmin(), id, request, ct), ct);

    /// <summary>Owner or Admin. Soft delete — the property is Archived, history preserved.</summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int id, CancellationToken ct)
    {
        var result = await _properties.DeleteAsync(CurrentUserId(), IsAdmin(), id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }
}
