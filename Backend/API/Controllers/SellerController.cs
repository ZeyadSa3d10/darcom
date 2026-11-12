using Application.Common;
using Application.DTOs;
using Application.Features.Properties.Commands;
using Application.Features.Properties.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Seller / Owner submission pipeline and rental period tracking.</summary>
[ApiController]
[Route("api/seller/properties")]
[Authorize]
public sealed class SellerController : ApiBaseController
{
    /// <summary>Owner's own submissions in any status (Draft -> ... -> Published).</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
        => SendAsync(new GetMyPropertiesQuery(CurrentUserId(), page, pageSize), ct);

    /// <summary>Owner views confirmed rental periods for their properties.</summary>
    [HttpGet("rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<RentalPeriodDto>>), 200)]
    public Task<ActionResult<ApiResponse<List<RentalPeriodDto>>>> RentalPeriods(
        [FromQuery] int? propertyId, CancellationToken ct = default)
        => SendAsync(new GetRentalPeriodsQuery(CurrentUserId(), IsAdmin(), propertyId), ct);

    /// <summary>Full submission (always creates Draft; publication requires admin approval).</summary>
    [HttpPost]
    [Authorize(Roles = "Seller,Agent,Admin")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Submit(
        [FromBody] SellerSubmissionRequest request,
        CancellationToken ct)
        => SendAsync(new SubmitSellerPropertyCommand(CurrentUserId(), CurrentRole()!, request), ct);

    /// <summary>Move own Draft to PendingReview.</summary>
    [HttpPost("{id:int}/submit")]
    [Authorize(Roles = "Seller,Agent,Admin")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(409)]
    public Task<ActionResult<ApiResponse<object?>>> SubmitForReview(int id, CancellationToken ct)
        => SendAsync(new SubmitPropertyForReviewCommand(CurrentUserId(), id), ct);
}
