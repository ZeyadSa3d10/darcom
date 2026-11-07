using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Broker workflow: registration, profile retrieval, submitting client requests, and viewing requests.
/// External brokers submit required documents and remain pending until company admin approves them.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class BrokerController : ApiBaseController
{
    private readonly IRequestService _requests;
    private readonly IPropertyService _properties;

    public BrokerController(IRequestService requests, IPropertyService properties)
    {
        _requests = requests;
        _properties = properties;
    }

    /// <summary>Get broker dashboard statistics and profile status.</summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiResponse<BrokerDashboardDto>), 200)]
    public async Task<ActionResult<ApiResponse<BrokerDashboardDto>>> Dashboard(CancellationToken ct)
    {
        var result = await _requests.GetBrokerDashboardAsync(CurrentUserId(), ct);
        return Ok(ApiResponse<BrokerDashboardDto>.Ok(result.Data!));
    }

    /// <summary>Get properties associated with the authenticated broker.</summary>
    [HttpGet("properties")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> MyProperties(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.GetBrokerPropertiesAsync(CurrentUserId(), status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyListDto>>.Ok(result.Data!));
    }

    /// <summary>
    /// Approved broker submits a chalet/property for company review.
    /// Creates a property in PendingReview status (not published immediately).
    /// </summary>
    [HttpPost("properties")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> SubmitProperty(
        [FromBody] BrokerPropertySubmissionRequest request,
        [FromServices] BrokerPropertySubmissionValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _requests.SubmitBrokerPropertyAsync(CurrentUserId(), request, ct), ct);

    /// <summary>Confirmed rental periods for a broker's rental property.</summary>
    [HttpGet("properties/{id:int}/rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<RentalPeriodDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<RentalPeriodDto>>>> PropertyRentalPeriods(
        int id, CancellationToken ct)
    {
        var result = await _properties.GetRentalPeriodsAsync(CurrentUserId(), IsAdmin(), id, ct);
        return Ok(ApiResponse<List<RentalPeriodDto>>.Ok(result.Data!));
    }

    /// <summary>Submit a broker registration application. Access remains pending until admin approval.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 409)]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 422)]
    public Task<ActionResult<ApiResponse<BrokerProfileDto>>> Register(
        [FromBody] RegisterBrokerRequest request,
        [FromServices] RegisterBrokerValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _requests.RegisterBrokerAsync(CurrentUserId(), request, ct), ct);

    /// <summary>Get current user's broker profile and approval status.</summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 404)]
    public async Task<ActionResult<ApiResponse<BrokerProfileDto>>> MyProfile(CancellationToken ct)
    {
        var result = await _requests.GetMyBrokerProfileAsync(CurrentUserId(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<BrokerProfileDto>.Ok(result.Data!, result.Message)
            : ApiResponse<BrokerProfileDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>Approved brokers can submit property purchase/rental requests on behalf of their clients.</summary>
    [HttpPost("requests")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<BrokerPropertyRequestDto>>> CreateRequest(
        [FromBody] CreateBrokerPropertyRequest request,
        [FromServices] CreateBrokerPropertyRequestValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _requests.CreateBrokerRequestAsync(CurrentUserId(), request, ct), ct);

    /// <summary>View client requests submitted by the authenticated broker.</summary>
    [HttpGet("requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertyRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BrokerPropertyRequestDto>>>> MyRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.MyBrokerRequestsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BrokerPropertyRequestDto>>.Ok(result.Data!));
    }
}

