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
[EnableRateLimiting("auth")]
public sealed class AuthController : ApiBaseController
{
    private readonly IAuthService _auth;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService auth, IWebHostEnvironment env)
    {
        _auth = auth;
        _env = env;
    }

    /// <summary>Self-registration. The role is always Buyer — roles are never taken from the client.</summary>
    /// <response code="201">Account created; returns tokens + user.</response>
    /// <response code="409">Email already registered.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 201)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 409)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 422)]
    public Task<ActionResult<ApiResponse<AuthResponse>>> Register(
        [FromBody] RegisterRequest request,
        [FromServices] RegisterValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _auth.RegisterAsync(request, ct), ct);

    /// <response code="200">Returns tokens + user.</response>
    /// <response code="401">Invalid credentials.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 401)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 422)]
    public Task<ActionResult<ApiResponse<AuthResponse>>> Login(
        [FromBody] LoginRequest request,
        [FromServices] LoginValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _auth.LoginAsync(request, ct), ct);

    /// <summary>Rotates the token pair: each refresh invalidates the previous refresh token.</summary>
    /// <response code="200">New token pair.</response>
    /// <response code="401">Session expired.</response>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 401)]
    public Task<ActionResult<ApiResponse<AuthResponse>>> Refresh(
        [FromBody] RefreshRequest request,
        [FromServices] RefreshValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _auth.RefreshAsync(request, ct), ct);

    /// <summary>Revokes the server-side refresh token (client must also discard its tokens).</summary>
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<ApiResponse<object?>>> Logout(CancellationToken ct)
    {
        var result = await _auth.LogoutAsync(CurrentUserId(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    /// <summary>Issues a reset token. Always returns the same message (no user enumeration).</summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ApiResponse<string?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string?>), 422)]
    public Task<ActionResult<ApiResponse<string?>>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] ForgotPasswordValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _auth.ForgotPasswordAsync(request, _env.IsDevelopment(), ct), ct);

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 400)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 422)]
    public Task<ActionResult<ApiResponse<object?>>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        [FromServices] ResetPasswordValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _auth.ResetPasswordAsync(request, ct), ct);
}
