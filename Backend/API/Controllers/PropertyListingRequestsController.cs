using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

[ApiController]
[Route("api/property-listing-requests")]
[Authorize]
[EnableRateLimiting("submit")]
public sealed class PropertyListingRequestsController : ApiBaseController
{
    private readonly IRequestService _requests;

    public PropertyListingRequestsController(IRequestService requests)
    {
        _requests = requests;
    }

    /// <summary>
    /// Submit a property listing request ("اعرض عقارك").
    /// Normal users submit a 5-field request for team inspection.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyListingRequestDto>>> Create(
        [FromBody] CreatePropertyListingRequest request,
        [FromServices] CreatePropertyListingRequestValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.CreateListingRequestAsync(CurrentUserId(), request, ct), ct);

    /// <summary>
    /// Get the current authenticated user's submitted listing requests.
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListingRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyListingRequestDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _requests.MyListingRequestsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyListingRequestDto>>.Ok(result.Data!));
    }

    /// <summary>
    /// Get a specific property listing request by ID.
    /// Normal users can only view their own requests; admins can view any.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<PropertyListingRequestDto>), 404)]
    public async Task<ActionResult<ApiResponse<PropertyListingRequestDto>>> GetById(
        int id, CancellationToken ct = default)
    {
        var isAdmin = User.IsInRole("Admin");
        var result = await _requests.GetListingRequestByIdAsync(id, CurrentUserId(), isAdmin, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<PropertyListingRequestDto>.Ok(result.Data!)
            : ApiResponse<PropertyListingRequestDto>.Fail(result.Message, result.Errors));
    }
}

