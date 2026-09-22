using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/booking-requests")]
[Authorize]
public sealed class BookingRequestsController : ApiBaseController
{
    private readonly IRequestService _requests;

    public BookingRequestsController(IRequestService requests)
    {
        _requests = requests;
    }

    /// <summary>Submit a rental request for a Rent-purpose property.</summary>
    /// <response code="201">Request submitted (returns Request Number).</response>
    /// <response code="409">Active request already exists.</response>
    /// <response code="422">Property unavailable or validation failed.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<BookingRequestDto>>> Create(
        [FromBody] CreateBookingRequest request,
        [FromServices] CreateBookingValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.CreateBookingAsync(CurrentUserId(), request, ct), ct);

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BookingRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BookingRequestDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _requests.MyBookingsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BookingRequestDto>>.Ok(result.Data!));
    }
}
