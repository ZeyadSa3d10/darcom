using Application.Common;
using Application.DTOs;
using Application.Features.Bookings.Commands;
using Application.Features.Bookings.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/booking-requests")]
[Authorize]
public sealed class BookingRequestsController : ApiBaseController
{
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<BookingRequestDto>>> Create(
        [FromBody] CreateBookingRequest request,
        CancellationToken ct)
        => SendAsync(new CreateBookingRequestCommand(CurrentUserId(), request), ct);

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BookingRequestDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<BookingRequestDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
        => SendAsync(new GetMyBookingsQuery(CurrentUserId(), page, pageSize), ct);
}
