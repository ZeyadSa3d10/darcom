using Application.Common;
using Application.DTOs;
using Application.Features.Properties.Commands;
using Application.Features.Properties.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PropertiesController : ApiBaseController
{
    /// <summary>
    /// Public catalog with filters, sorting and server-side pagination.
    /// Anonymous callers only see Published / Featured / Reserved.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 422)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> List(
        [FromQuery] PropertyQuery query,
        CancellationToken ct)
        => SendAsync(new GetPropertiesQuery(query, IsAdmin()), ct);

    [HttpGet("featured")]
    [ProducesResponseType(typeof(ApiResponse<List<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<List<PropertyListDto>>>> Featured(
        [FromQuery] int count = 8,
        [FromQuery] string? purpose = null,
        CancellationToken ct = default)
        => SendAsync(new GetFeaturedPropertiesQuery(count, purpose), ct);

    [HttpGet("search")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> Search(
        [FromQuery] string q = "",
        [FromQuery] string? purpose = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new QuickSearchPropertiesQuery(q, purpose, page, pageSize), ct);

    [HttpGet("slug/{slug}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> BySlug(string slug, CancellationToken ct)
        => SendAsync(new GetPropertyBySlugQuery(slug, IsAdmin()), ct);

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> ById(int id, CancellationToken ct)
        => SendAsync(new GetPropertyByIdQuery(id, IsAdmin()), ct);

    [HttpGet("{id:int}/related")]
    [ProducesResponseType(typeof(ApiResponse<List<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<List<PropertyListDto>>>> Related(
        int id, [FromQuery] int count = 4, CancellationToken ct = default)
        => SendAsync(new GetRelatedPropertiesQuery(id, count), ct);

    /// <summary>Public property rental availability calendar (booked intervals only — no private renter info).</summary>
    [HttpGet("{id:int}/rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<PublicRentalPeriodDto>>), 200)]
    public Task<ActionResult<ApiResponse<List<PublicRentalPeriodDto>>>> RentalPeriods(int id, CancellationToken ct)
        => SendAsync(new GetPublicRentalPeriodsQuery(id), ct);

    [HttpPost]
    [Authorize(Roles = "Seller,Agent,Admin")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Create(
        [FromBody] CreatePropertyRequest request,
        CancellationToken ct)
        => SendAsync(new CreatePropertyCommand(CurrentUserId(), CurrentRole()!, request), ct);

    [HttpPut("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Update(
        int id,
        [FromBody] UpdatePropertyRequest request,
        CancellationToken ct)
        => SendAsync(new UpdatePropertyCommand(CurrentUserId(), IsAdmin(), id, request), ct);

    [HttpDelete("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<object?>>> Delete(int id, CancellationToken ct)
        => SendAsync(new DeletePropertyCommand(CurrentUserId(), IsAdmin(), id), ct);
}
