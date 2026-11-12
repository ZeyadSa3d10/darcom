using Application.Common;
using Application.DTOs;
using Application.Features.Brokers.Commands;
using Application.Features.Brokers.Queries;
using Application.Features.Properties.Queries;
using Application.Features.ViewingRequests.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Broker workflows and tracking endpoints dispatched via MediatR.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class BrokerController : ApiBaseController
{
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiResponse<BrokerDashboardDto>), 200)]
    public Task<ActionResult<ApiResponse<BrokerDashboardDto>>> Dashboard(CancellationToken ct)
        => SendAsync(new GetBrokerDashboardQuery(CurrentUserId()), ct);

    [HttpGet("properties")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> MyProperties(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetBrokerPropertiesQuery(CurrentUserId(), status, page, pageSize), ct);

    [HttpPost("submissions")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertySubmissionDto>), 201)]
    [ProducesResponseType(403)]
    [ProducesResponseType(422)]
    public Task<ActionResult<ApiResponse<BrokerPropertySubmissionDto>>> SubmitUnit(
        [FromBody] BrokerPropertySubmissionCreateDto request,
        CancellationToken ct)
        => SendAsync(new SubmitBrokerUnitCommand(CurrentUserId(), request), ct);

    [HttpGet("submissions")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertySubmissionDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<BrokerPropertySubmissionDto>>>> MySubmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyBrokerSubmissionsQuery(CurrentUserId(), page, pageSize), ct);

    [HttpPost("property-requests")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 201)]
    [ProducesResponseType(403)]
    [ProducesResponseType(422)]
    public Task<ActionResult<ApiResponse<BrokerPropertyRequestDto>>> CreatePropertyRequest(
        [FromBody] BrokerPropertyRequestCreateDto request,
        CancellationToken ct)
        => SendAsync(new CreateBrokerPropertyRequestCommand(CurrentUserId(), request), ct);

    [HttpGet("property-requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertyRequestDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<BrokerPropertyRequestDto>>>> MyPropertyRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyBrokerRequestsQuery(CurrentUserId(), page, pageSize), ct);

    [HttpPost("requirements")]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 201)]
    [ProducesResponseType(403)]
    [ProducesResponseType(422)]
    public Task<ActionResult<ApiResponse<PropertyRequirementDto>>> CreateRequirement(
        [FromBody] BrokerRequirementCreateDto request,
        CancellationToken ct)
        => SendAsync(new CreateBrokerRequirementCommand(CurrentUserId(), request), ct);

    [HttpGet("requirements")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyRequirementDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyRequirementDto>>>> MyRequirements(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyRequirementsQuery(CurrentUserId(), page, pageSize), ct);

    [HttpPost("properties")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(403)]
    [ProducesResponseType(422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> SubmitProperty(
        [FromBody] BrokerPropertySubmissionRequest request,
        CancellationToken ct)
        => SendAsync(new SubmitBrokerPropertyCommand(CurrentUserId(), request), ct);

    [HttpGet("properties/{id:int}/rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<RentalPeriodDto>>), 200)]
    public Task<ActionResult<ApiResponse<List<RentalPeriodDto>>>> PropertyRentalPeriods(
        int id, CancellationToken ct)
        => SendAsync(new GetRentalPeriodsQuery(CurrentUserId(), IsAdmin(), id), ct);

    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<ApiResponse<BrokerProfileDto>>> MyProfile(CancellationToken ct)
        => SendAsync(new GetMyBrokerProfileQuery(CurrentUserId()), ct);

    [HttpPost("requests")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 201)]
    [ProducesResponseType(403)]
    [ProducesResponseType(422)]
    public Task<ActionResult<ApiResponse<BrokerPropertyRequestDto>>> CreateRequest(
        [FromBody] CreateBrokerPropertyRequest request,
        CancellationToken ct)
        => SendAsync(new CreateBrokerLegacyRequestCommand(CurrentUserId(), request), ct);

    [HttpGet("requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertyRequestDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<BrokerPropertyRequestDto>>>> MyRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => SendAsync(new GetMyBrokerRequestsQuery(CurrentUserId(), page, pageSize), ct);
}
