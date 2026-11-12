using Application.Common;
using Application.DTOs;
using Application.Features.Bookings.Commands;
using Application.Features.Bookings.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/purchase-requests")]
[Authorize]
public sealed class PurchaseRequestsController : ApiBaseController
{
    /// <summary>
    /// Submit a purchase request. Submitting NEVER means the property was purchased —
    /// availability is re-checked server-side inside a transaction.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<PurchaseRequestDto>>> Create(
        [FromBody] CreatePurchaseRequest request,
        CancellationToken ct)
        => SendAsync(new CreatePurchaseRequestCommand(CurrentUserId(), request), ct);

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PurchaseRequestDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PurchaseRequestDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
        => SendAsync(new GetMyPurchasesQuery(CurrentUserId(), page, pageSize), ct);
}
