using Application.Common;
using Application.DTOs;
using Application.Features.Inquiries.Commands;
using Application.Features.Inquiries.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class InquiriesController : ApiBaseController
{
    /// <summary>Public contact-agent form. Rate-limited against spam.</summary>
    [HttpPost("properties/{propertyId:int}")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 201)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<object?>>> Submit(
        int propertyId,
        [FromBody] CreateInquiryRequest request,
        CancellationToken ct)
        => SendAsync(new CreateInquiryCommand(propertyId, TryGetCurrentUserId(), request), ct);

    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<InquiryDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<InquiryDto>>>> List(
        [FromQuery] int? propertyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetAllInquiriesQuery(propertyId, page, pageSize), ct);
}
