using Application.Common;
using Application.DTOs;
using Application.Features.Users.Commands;
using Application.Features.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class UsersController : ApiBaseController
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
    [ProducesResponseType(401)]
    public Task<ActionResult<ApiResponse<UserDto>>> Me(CancellationToken ct)
        => SendAsync(new GetCurrentUserQuery(CurrentUserId()), ct);

    [HttpPut("me")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), 422)]
    public Task<ActionResult<ApiResponse<UserDto>>> UpdateMe(
        [FromBody] UpdateProfileRequest request,
        CancellationToken ct)
        => SendAsync(new UpdateProfileCommand(CurrentUserId(), request), ct);

    [HttpPost("change-password")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 422)]
    public Task<ActionResult<ApiResponse<object?>>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
        => SendAsync(new ChangePasswordCommand(CurrentUserId(), request), ct);
}
