using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Stores;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Admin surface: metrics, approval pipeline, request queues, users, reviews,
/// inquiries, villages & zones, property types, broker workflows, property requirements, and audit trail.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public sealed class AdminController : ApiBaseController
{
    private readonly IRequestService _requests;
    private readonly ISellerService _seller;
    private readonly IAdminService _admin;
    private readonly IAuditWriter _audit;
    private readonly IPropertyService _properties;

    public AdminController(
        IRequestService requests,
        ISellerService seller,
        IAdminService admin,
        IAuditWriter audit,
        IPropertyService properties)
    {
        _requests = requests;
        _seller = seller;
        _admin = admin;
        _audit = audit;
        _properties = properties;
    }

    /// <response code="200">Caller holds the Admin role.</response>
    /// <response code="401">Missing or invalid token.</response>
    /// <response code="403">Authenticated but not an Admin.</response>
    [HttpGet("ping")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public ActionResult<ApiResponse<object?>> Ping()
        => Ok(ApiResponse<object?>.Ok("Admin access confirmed."));

    /// <summary>Operational metrics for the dashboard overview.</summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiResponse<DashboardDto>), 200)]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> Dashboard(CancellationToken ct)
    {
        var result = await _admin.GetDashboardAsync(ct);
        return Ok(ApiResponse<DashboardDto>.Ok(result.Data!));
    }

    /// <summary>All properties in any status (admin search). Reuses the catalog search.</summary>
    [HttpGet("properties")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyListDto>>), 200)]
    public Task<ActionResult<ApiResponse<PagedResult<PropertyListDto>>>> Properties(
        [FromQuery] PropertyQuery query,
        [FromServices] PropertyQueryValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, query, () => _properties.SearchAsync(query, true, ct), ct);

    [HttpGet("purchase-requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PurchaseRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PurchaseRequestDto>>>> PurchaseRequests(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.AllPurchasesAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PurchaseRequestDto>>.Ok(result.Data!));
    }

    /// <summary>Drive the request state machine. Illegal transitions are rejected (422).</summary>
    [HttpPut("purchase-requests/{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<PurchaseRequestDto>>> SetPurchaseStatus(
        int id,
        [FromBody] UpdateRequestStatusRequest request,
        [FromServices] UpdateRequestStatusValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _requests.SetPurchaseStatusAsync(CurrentUserId(), id, request, ClientIp(), ct), ct);

    [HttpGet("booking-requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BookingRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BookingRequestDto>>>> BookingRequests(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _requests.AllBookingsAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BookingRequestDto>>.Ok(result.Data!));
    }

    [HttpPut("booking-requests/{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BookingRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<BookingRequestDto>>> SetBookingStatus(
        int id,
        [FromBody] UpdateRequestStatusRequest request,
        [FromServices] UpdateRequestStatusValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _requests.SetBookingStatusAsync(CurrentUserId(), id, request, ClientIp(), ct), ct);

    /// <summary>Confirmed rental periods for a property (Requirement 9).</summary>
    [HttpGet("properties/{propertyId:int}/rental-periods")]
    [ProducesResponseType(typeof(ApiResponse<List<RentalPeriodDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<RentalPeriodDto>>>> PropertyRentalPeriods(
        int propertyId, CancellationToken ct)
    {
        var result = await _properties.GetRentalPeriodsAsync(CurrentUserId(), true, propertyId, ct);
        return Ok(ApiResponse<List<RentalPeriodDto>>.Ok(result.Data!));
    }

    /// <summary>Approve a pending-review property → Published (notifies the owner, writes audit).</summary>
    /// <response code="409">Not pending review.</response>
    [HttpPut("properties/{id:int}/approve")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 409)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> ApproveProperty(
        int id, CancellationToken ct)
        => ExecuteTransactional(() => _seller.ApproveAsync(CurrentUserId(), id, ClientIp(), ct));

    [HttpPut("properties/{id:int}/reject")]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyDetailsDto>), 409)]
    public Task<ActionResult<ApiResponse<PropertyDetailsDto>>> RejectProperty(
        int id,
        [FromBody] RejectPropertyRequest request,
        [FromServices] RejectPropertyValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _seller.RejectAsync(CurrentUserId(), id, request.Reason, ClientIp(), ct), ct);

    /// <summary>Searchable user table. Role changes are audited.</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AdminUserDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminUserDto>>>> Users(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _admin.GetUsersAsync(search, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<AdminUserDto>>.Ok(result.Data!));
    }

    [HttpPut("users/{id:int}/role")]
    [ProducesResponseType(typeof(ApiResponse<AdminUserDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AdminUserDto>), 422)]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> SetUserRole(
        int id, [FromBody] SetUserRoleRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Role))
            return StatusCode(422, ApiResponse<AdminUserDto>.Fail("Role is required.",
                new() { new("Role is required.", "role") }));
        var result = await _admin.SetUserRoleAsync(CurrentUserId(), id, request.Role.Trim(), ClientIp(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<AdminUserDto>.Ok(result.Data!, result.Message)
            : ApiResponse<AdminUserDto>.Fail(result.Message, result.Errors));
    }

    [HttpGet("agents")]
    [ProducesResponseType(typeof(ApiResponse<List<AdminAgentDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<AdminAgentDto>>>> Agents(CancellationToken ct)
    {
        var result = await _admin.GetAgentsAsync(ct);
        return Ok(ApiResponse<List<AdminAgentDto>>.Ok(result.Data!));
    }

    [HttpGet("reviews")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AdminReviewDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminReviewDto>>>> Reviews(
        [FromQuery] bool? approved,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _admin.GetReviewsAsync(approved, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<AdminReviewDto>>.Ok(result.Data!));
    }

    [HttpPut("reviews/{id:int}/approval")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> SetReviewApproval(
        int id, [FromBody] SetReviewApprovalRequest request, CancellationToken ct)
    {
        var result = await _admin.SetReviewApprovalAsync(CurrentUserId(), id, request.Approved, ClientIp(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    [HttpDelete("reviews/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteReview(int id, CancellationToken ct)
    {
        var result = await _admin.DeleteReviewAsync(CurrentUserId(), id, ClientIp(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    [HttpPut("inquiries/{id:int}/read")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> MarkInquiryRead(int id, CancellationToken ct)
    {
        var result = await _admin.MarkInquiryReadAsync(id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    [HttpGet("audit-logs")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AuditLogDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogDto>>>> AuditLogs(
        [FromQuery] string? entity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var logs = await _audit.GetLogsAsync(entity, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        return Ok(ApiResponse<PagedResult<AuditLogDto>>.Ok(logs));
    }

    // ==========================================
    // Village & Zone CRUD (Requirements 3 & 13)
    // ==========================================

    [HttpGet("villages")]
    [ProducesResponseType(typeof(ApiResponse<List<VillageDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<VillageDto>>>> GetVillages(
        [FromQuery] bool includeInactive = true, CancellationToken ct = default)
    {
        var result = await _admin.GetVillagesAsync(includeInactive, ct);
        return Ok(ApiResponse<List<VillageDto>>.Ok(result.Data!));
    }

    [HttpGet("villages/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 404)]
    public async Task<ActionResult<ApiResponse<VillageDto>>> GetVillageById(int id, CancellationToken ct)
    {
        var result = await _admin.GetVillageByIdAsync(id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<VillageDto>.Ok(result.Data!, result.Message)
            : ApiResponse<VillageDto>.Fail(result.Message, result.Errors));
    }

    [HttpPost("villages")]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 422)]
    public Task<ActionResult<ApiResponse<VillageDto>>> CreateVillage(
        [FromBody] CreateVillageRequest request,
        [FromServices] CreateVillageValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.CreateVillageAsync(request, ct), ct);

    [HttpPut("villages/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 404)]
    [ProducesResponseType(typeof(ApiResponse<VillageDto>), 422)]
    public Task<ActionResult<ApiResponse<VillageDto>>> UpdateVillage(
        int id,
        [FromBody] UpdateVillageRequest request,
        [FromServices] UpdateVillageValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.UpdateVillageAsync(id, request, ct), ct);

    [HttpDelete("villages/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 409)]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteVillage(int id, CancellationToken ct)
    {
        var result = await _admin.DeleteVillageAsync(id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    [HttpGet("villages/{villageId:int}/zones")]
    [ProducesResponseType(typeof(ApiResponse<List<ZoneDto>>), 200)]
    [ProducesResponseType(typeof(ApiResponse<List<ZoneDto>>), 404)]
    public async Task<ActionResult<ApiResponse<List<ZoneDto>>>> GetZones(
        int villageId, [FromQuery] bool includeInactive = true, CancellationToken ct = default)
    {
        var result = await _admin.GetZonesByVillageIdAsync(villageId, includeInactive, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<List<ZoneDto>>.Ok(result.Data!, result.Message)
            : ApiResponse<List<ZoneDto>>.Fail(result.Message, result.Errors));
    }

    [HttpGet("villages/{villageId:int}/zones/{zoneId:int}")]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 404)]
    public async Task<ActionResult<ApiResponse<ZoneDto>>> GetZoneById(int villageId, int zoneId, CancellationToken ct)
    {
        var result = await _admin.GetZoneByIdAsync(villageId, zoneId, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<ZoneDto>.Ok(result.Data!, result.Message)
            : ApiResponse<ZoneDto>.Fail(result.Message, result.Errors));
    }

    [HttpPost("villages/{villageId:int}/zones")]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 422)]
    public Task<ActionResult<ApiResponse<ZoneDto>>> CreateZone(
        int villageId,
        [FromBody] CreateZoneRequest request,
        [FromServices] CreateZoneValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.CreateZoneAsync(villageId, request, ct), ct);

    [HttpPut("villages/{villageId:int}/zones/{zoneId:int}")]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 404)]
    [ProducesResponseType(typeof(ApiResponse<ZoneDto>), 422)]
    public Task<ActionResult<ApiResponse<ZoneDto>>> UpdateZone(
        int villageId,
        int zoneId,
        [FromBody] UpdateZoneRequest request,
        [FromServices] UpdateZoneValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.UpdateZoneAsync(villageId, zoneId, request, ct), ct);

    [HttpDelete("villages/{villageId:int}/zones/{zoneId:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 409)]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteZone(int villageId, int zoneId, CancellationToken ct)
    {
        var result = await _admin.DeleteZoneAsync(villageId, zoneId, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    // ==========================================
    // Property Types CRUD (Requirements 5 & 13)
    // ==========================================

    [HttpGet("property-types")]
    [ProducesResponseType(typeof(ApiResponse<List<PropertyTypeDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<PropertyTypeDto>>>> GetPropertyTypes(CancellationToken ct)
    {
        var result = await _admin.GetPropertyTypesAsync(ct);
        return Ok(ApiResponse<List<PropertyTypeDto>>.Ok(result.Data!));
    }

    [HttpGet("property-types/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 404)]
    public async Task<ActionResult<ApiResponse<PropertyTypeDto>>> GetPropertyTypeById(int id, CancellationToken ct)
    {
        var result = await _admin.GetPropertyTypeByIdAsync(id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<PropertyTypeDto>.Ok(result.Data!, result.Message)
            : ApiResponse<PropertyTypeDto>.Fail(result.Message, result.Errors));
    }

    [HttpPost("property-types")]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyTypeDto>>> CreatePropertyType(
        [FromBody] CreatePropertyTypeRequest request,
        [FromServices] CreatePropertyTypeValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.CreatePropertyTypeAsync(request, ct), ct);

    [HttpPut("property-types/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 404)]
    [ProducesResponseType(typeof(ApiResponse<PropertyTypeDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyTypeDto>>> UpdatePropertyType(
        int id,
        [FromBody] UpdatePropertyTypeRequest request,
        [FromServices] UpdatePropertyTypeValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _admin.UpdatePropertyTypeAsync(id, request, ct), ct);

    [HttpDelete("property-types/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 409)]
    public async Task<ActionResult<ApiResponse<object?>>> DeletePropertyType(int id, CancellationToken ct)
    {
        var result = await _admin.DeletePropertyTypeAsync(id, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    // ==========================================
    // Broker Management (Requirements 7 & 8)
    // ==========================================

    [HttpGet("brokers")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerProfileDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BrokerProfileDto>>>> GetBrokers(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _requests.AllBrokersAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BrokerProfileDto>>.Ok(result.Data!));
    }

    [HttpPut("brokers/{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BrokerProfileDto>), 422)]
    public Task<ActionResult<ApiResponse<BrokerProfileDto>>> SetBrokerStatus(
        int id,
        [FromBody] SetBrokerStatusRequest request,
        [FromServices] SetBrokerStatusValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.SetBrokerStatusAsync(CurrentUserId(), id, request, ct), ct);

    [HttpGet("broker-requests")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BrokerPropertyRequestDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BrokerPropertyRequestDto>>>> GetBrokerRequests(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _requests.AllBrokerRequestsAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<BrokerPropertyRequestDto>>.Ok(result.Data!));
    }

    [HttpPut("broker-requests/{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BrokerPropertyRequestDto>), 422)]
    public Task<ActionResult<ApiResponse<BrokerPropertyRequestDto>>> SetBrokerRequestStatus(
        int id,
        [FromBody] UpdateRequestStatusRequest request,
        [FromServices] UpdateRequestStatusValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.SetBrokerRequestStatusAsync(CurrentUserId(), id, request, ct), ct);

    // ==========================================
    // Property Requirement Leads (Requirement 10)
    // ==========================================

    [HttpGet("requirements")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PropertyRequirementDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertyRequirementDto>>>> GetRequirements(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _requests.AllRequirementsAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedResult<PropertyRequirementDto>>.Ok(result.Data!));
    }

    [HttpPut("requirements/{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PropertyRequirementDto>), 422)]
    public Task<ActionResult<ApiResponse<PropertyRequirementDto>>> SetRequirementStatus(
        int id,
        [FromBody] UpdateRequirementStatusRequest request,
        [FromServices] UpdateRequirementStatusValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _requests.SetRequirementStatusAsync(CurrentUserId(), id, request, ct), ct);

    private string? ClientIp()
        => HttpContext.Connection.RemoteIpAddress?.ToString();
}
