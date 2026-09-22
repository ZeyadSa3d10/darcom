using Application.DTOs;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

/// <summary>General contact form (public, rate-limited).</summary>
[ApiController]
[Route("api/contact")]
public sealed class ContactController : ApiBaseController
{
    private readonly IInquiryService _inquiries;

    public ContactController(IInquiryService inquiries)
    {
        _inquiries = inquiries;
    }

    /// <response code="201">Message received.</response>
    /// <response code="422">Validation failed.</response>
    [HttpPost]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(Application.Common.ApiResponse<object?>), 201)]
    [ProducesResponseType(typeof(Application.Common.ApiResponse<object?>), 422)]
    public Task<ActionResult<Application.Common.ApiResponse<object?>>> Submit(
        [FromBody] ContactRequest request,
        [FromServices] ContactValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _inquiries.SubmitContactAsync(request, ct), ct);
}
