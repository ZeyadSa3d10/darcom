using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/purchase-requests")]
[Authorize]
public sealed class PurchaseRequestsController : ApiBaseController
{
    private readonly IRequestService _requests;

    public PurchaseRequestsController(IRequestService requests)
    {
        _requests = requests;
    }

    /// <summary>
    /// Submit a purchase request. Submitting NEVER means the property was purchased —
    /// availability is re-checked server-side inside a transaction.
    /// </summary>
    /// <response code="201">Request submitted (returns Request Number).</response>
    /// <response code="409">Active request already exists.</response>
    /// <response code="422">Property unavailable or validation failed.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<PurchaseRequestDto>>> Create(
        [FromBody] CreatePurchaseRequest request,
        [FromServices] CreatePurchaseValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.CreatePurchaseAsync(CurrentUserId(), request, ct), ct);

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PurchaseRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PurchaseRequestDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _requests.MyPurchasesAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PurchaseRequestDto>>.Ok(result.Data!));
    }
}
