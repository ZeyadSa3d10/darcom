using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class InquiriesController : ApiBaseController
{
    private readonly IInquiryService _inquiries;

    public InquiriesController(IInquiryService inquiries)
    {
        _inquiries = inquiries;
    }

    /// <summary>Public contact-agent form. Rate-limited against spam.</summary>
    /// <response code="201">Inquiry sent.</response>
    /// <response code="404">Property not found.</response>
    [HttpPost("properties/{propertyId:int}")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 201)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<object?>>> Submit(
        int propertyId,
        [FromBody] CreateInquiryRequest request,
        [FromServices] CreateInquiryValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _inquiries.SubmitAsync(propertyId, request, ct), ct);

    /// <response code="200">Paginated inquiries (admin).</response>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<InquiryDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<InquiryDto>>>> List(
        [FromQuery] int? propertyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _inquiries.AdminListAsync(propertyId, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<InquiryDto>>.Ok(result.Data!));
    }
}
