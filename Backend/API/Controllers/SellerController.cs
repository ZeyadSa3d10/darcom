using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace API.Controllers;

/// <summary>Seller submission pipeline: Draft → PendingReview → Published / Rejected / Archived.</summary>
[ApiController]
[Route("api/seller/properties")]
[Authorize(Roles = "Seller,Agent,Admin")]
public sealed class SellerController : ApiBaseController
{
    private readonly ISellerService _seller;
    private readonly IPropertyService _properties;

    public SellerController(ISellerService seller, IPropertyService properties)
    {
        _seller = seller;
        _properties = properties;
    }

    /// <summary>Owner's own submissions in any status (Draft → … → Published).</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> My(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var result = await _properties.MyPropertiesAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyListDto>>.Ok(result.Data!));
    }

    /// <summary>
    /// Full submission (details + features + amenities + media URLs + contact).
    /// Always creates a Draft — publication requires admin approval.
    /// </summary>
    /// <response code="201">Draft created.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> Submit(
        [FromBody] SellerSubmissionRequest request,
        [FromServices] SellerSubmissionValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _seller.SubmitAsync(CurrentUserId(), CurrentRole()!, request, ct), ct);

    /// <summary>Move own Draft to PendingReview.</summary>
    /// <response code="409">Not a draft.</response>
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 409)]
    public Task<ActionResult<ApiResponse<object?>>> SubmitForReview(
        int id, CancellationToken ct)
        => ExecuteTransactional(() => _seller.SubmitForReviewAsync(CurrentUserId(), id, ct));
}
