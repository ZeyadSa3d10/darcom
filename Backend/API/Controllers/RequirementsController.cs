using Application.Common;
using Application.DTOs;
using Application.Features.ViewingRequests.Commands;
using Application.Features.ViewingRequests.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Customer Property Requirement Leads (Requirement 10).
/// When no available property matches the customer's needs in the North Coast,
/// they submit their specifications and contact information as a lead for the company.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class RequirementsController : ApiBaseController
{
    /// <summary>Submit a property requirement lead (public or authenticated).</summary>
    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyRequirementDto>>> Create(
        [FromBody] CreatePropertyRequirementRequest request,
        CancellationToken ct)
        => SendAsync(new CreateRequirementCommand(TryGetCurrentUserId(), request), ct);

    /// <summary>Authenticated user views their submitted property requirements.</summary>
    [HttpGet("my")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyRequirementDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyRequirementDto>>>> My(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyRequirementsQuery(CurrentUserId(), page, pageSize), ct);
}
