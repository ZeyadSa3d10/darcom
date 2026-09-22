using Application.Common;
using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class UsersController : ApiBaseController
{
    private readonly IUserService _users;

    public UsersController(IUserService users)
    {
        _users = users;
    }

    /// <response code="200">Current user profile.</response>
    /// <response code="401">Missing or invalid token.</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Me(CancellationToken ct)
    {
        var result = await _users.GetMeAsync(CurrentUserId(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<UserDto>.Ok(result.Data!, result.Message)
            : ApiResponse<UserDto>.Fail(result.Message, result.Errors));
    }

    /// <response code="200">Updated profile.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPut("me")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 422)]
    public Task<ActionResult<ApiResponse<UserDto>>> UpdateMe(
        [FromBody] UpdateProfileRequest request,
        [FromServices] UpdateProfileValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _users.UpdateProfileAsync(CurrentUserId(), request, ct), ct);

    /// <response code="200">Password changed (all sessions revoked).</response>
    /// <response code="422">Wrong current password or weak new password.</response>
    [HttpPost("change-password")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 422)]
    public Task<ActionResult<ApiResponse<object?>>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        [FromServices] ChangePasswordValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _users.ChangePasswordAsync(CurrentUserId(), request, ct), ct);
}
