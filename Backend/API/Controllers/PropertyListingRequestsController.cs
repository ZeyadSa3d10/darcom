using Application.Common;
using Application.DTOs;
using Application.Features.ViewingRequests.Commands;
using Application.Features.ViewingRequests.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Owner / User Property Listing Requests ("لدي عقار / طلب إضافة عقار").
/// Authenticated users submit their property location and phone number for company inspection.
/// </summary>
[ApiController]
[Route("api/property-listing-requests")]
[Authorize]
public sealed class PropertyListingRequestsController : ApiBaseController
{
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyListingRequestDto>>> Create(
        [FromBody] CreatePropertyListingRequest request,
        CancellationToken ct)
        => SendAsync(new CreatePropertyListingRequestCommand(CurrentUserId(), request), ct);

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListingRequestDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListingRequestDto>>>> My(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyListingRequestsQuery(CurrentUserId(), page, pageSize), ct);

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<PropertyListingRequestDto>>> GetById(
        int id,
        CancellationToken ct)
        => SendAsync(new GetListingRequestByIdQuery(id, TryGetCurrentUserId(), IsAdmin()), ct);
}
