using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Broker workflow redesign:
/// 1. "شاليه عندي وعايز أعرضه" -> 4-field unit submission for company inspection.
/// 2. "بدور على شاليه" -> Direct Rent/Sale request on listed properties.
/// 3. "مش لاقي الوحدة" -> Custom specs requirement request.
/// 4. "طلباتي" -> Unified request tracking.
/// 5. "شاليهاتي" -> Officially published listings linked to broker.
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

    /// <summary>Get properties officially listed and associated with the authenticated broker.</summary>
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
    /// Workflow 1: Broker submits a chalet/unit for company physical inspection and listing.
    /// Requires ONLY 4 fields: Area, VillageId, ZoneId (optional), UnitNumber.
    /// </summary>
    [HttpPost("submissions")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertySubmissionDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertySubmissionDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertySubmissionDto>), 422)]
    public async Task<ActionResult<ApiResponse<BrokerPropertySubmissionDto>>> SubmitUnit(
        [FromBody] BrokerPropertySubmissionCreateDto request,
        CancellationToken ct)
    {
        var result = await _requests.SubmitBrokerUnitAsync(CurrentUserId(), request, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<BrokerPropertySubmissionDto>.Ok(result.Data!, result.Message)
            : ApiResponse<BrokerPropertySubmissionDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>View unit submissions created by the authenticated broker.</summary>
    [HttpGet("submissions")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertySubmissionDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BrokerPropertySubmissionDto>>>> MySubmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.MyBrokerSubmissionsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BrokerPropertySubmissionDto>>.Ok(result.Data!));
    }

    /// <summary>
    /// Workflow 2: Broker requests to Rent or Buy an existing property listing.
    /// Broker identity (Name/Phone) is automatically linked from profile.
    /// </summary>
    [HttpPost("property-requests")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 422)]
    public async Task<ActionResult<ApiResponse<BrokerPropertyRequestDto>>> CreatePropertyRequest(
        [FromBody] BrokerPropertyRequestCreateDto request,
        CancellationToken ct)
    {
        var result = await _requests.CreateBrokerPropertyRequestAsync(CurrentUserId(), request, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<BrokerPropertyRequestDto>.Ok(result.Data!, result.Message)
            : ApiResponse<BrokerPropertyRequestDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>View Rent/Sale requests submitted by the authenticated broker.</summary>
    [HttpGet("property-requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertyRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BrokerPropertyRequestDto>>>> MyPropertyRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.MyBrokerRequestsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BrokerPropertyRequestDto>>.Ok(result.Data!));
    }

    /// <summary>
    /// Workflow 3: Broker cannot find a suitable unit and requests custom specifications.
    /// </summary>
    [HttpPost("requirements")]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 403)]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 422)]
    public async Task<ActionResult<ApiResponse<PropertyRequirementDto>>> CreateRequirement(
        [FromBody] BrokerRequirementCreateDto request,
        CancellationToken ct)
    {
        var result = await _requests.CreateBrokerRequirementAsync(CurrentUserId(), request, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<PropertyRequirementDto>.Ok(result.Data!, result.Message)
            : ApiResponse<PropertyRequirementDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>View custom requirements submitted by the authenticated broker.</summary>
    [HttpGet("requirements")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyRequirementDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyRequirementDto>>>> MyRequirements(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.MyRequirementsAsync(CurrentUserId(), page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyRequirementDto>>.Ok(result.Data!));
    }

    /// <summary>Legacy / backwards compatible property submission endpoint.</summary>
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

    /// <summary>Legacy client request submission endpoint.</summary>
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

    /// <summary>Legacy client requests retrieval endpoint.</summary>
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
