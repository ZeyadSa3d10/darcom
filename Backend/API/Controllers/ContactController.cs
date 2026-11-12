using Application.Common;
using Application.DTOs;
using Application.Features.Inquiries.Commands;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

/// <summary>General contact form (public, rate-limited).</summary>
[ApiController]
[Route("api/contact")]
public sealed class ContactController : ApiBaseController
{
    [HttpPost]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 201)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 422)]
    public Task<ActionResult<ApiResponse<object?>>> Submit(
        [FromBody] ContactRequest request,
        CancellationToken ct)
        => SendAsync(new SubmitContactCommand(request), ct);
}
