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
/// inquiries and the audit trail. Full management tables land in the PHASE-10 UI.
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

    private string? ClientIp()
        => HttpContext.Connection.RemoteIpAddress?.ToString();
}
