using Application.Common;
using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Owner-managed media. Binaries live in object storage; the DB keeps URL references only.</summary>
[ApiController]
[Route("api/properties/{propertyId:int}/media")]
[Authorize]
public sealed class PropertyMediaController : ApiBaseController
{
    private readonly IMediaService _media;

    public PropertyMediaController(IMediaService media)
    {
        _media = media;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<MediaItemDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<MediaItemDto>>>> List(int propertyId, CancellationToken ct)
    {
        var result = await _media.ListAsync(propertyId, ct);
        return Ok(ApiResponse<List<MediaItemDto>>.Ok(result.Data!));
    }

    /// <summary>Upload a file (image / mp4 video / pdf). Validated by type and size.</summary>
    [HttpPost("{kind}")]
    [RequestSizeLimit(220_000_000)]
    [ProducesResponseType(typeof(ApiResponse<MediaItemDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<MediaItemDto>), 422)]
    public async Task<ActionResult<ApiResponse<MediaItemDto>>> Upload(
        int propertyId, string kind, [FromForm] IFormFile file,
        [FromForm] string? altText, CancellationToken ct)
    {
        if (file is null)
            return StatusCode(422, ApiResponse<MediaItemDto>.Fail("File is required.",
                new() { new("File is required.", "file") }));
        await using var stream = file.OpenReadStream();
        var result = await _media.UploadAsync(propertyId, CurrentUserId(), IsAdmin(),
            kind, stream, file.FileName, file.ContentType, file.Length, altText, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<MediaItemDto>.Ok(result.Data!, result.Message)
            : ApiResponse<MediaItemDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>Attach an existing http(s) URL (used by the seller submission flow).</summary>
    [HttpPost("{kind}/by-url")]
    [ProducesResponseType(typeof(ApiResponse<MediaItemDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<MediaItemDto>), 422)]
    public async Task<ActionResult<ApiResponse<MediaItemDto>>> AttachUrl(
        int propertyId, string kind,
        [FromBody] AttachUrlBody body, CancellationToken ct)
    {
        var result = await _media.AttachUrlAsync(propertyId, CurrentUserId(), IsAdmin(),
            kind, body.Url, body.Type, body.AltText, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<MediaItemDto>.Ok(result.Data!, result.Message)
            : ApiResponse<MediaItemDto>.Fail(result.Message, result.Errors));
    }

    [HttpDelete("{kind}/{mediaId:int}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(
        string kind, int mediaId, CancellationToken ct)
    {
        var result = await _media.DeleteAsync(CurrentUserId(), IsAdmin(), kind, mediaId, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    /// <summary>Set an image as the primary cover image for this property.</summary>
    [HttpPut("image/{mediaId:int}/primary")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ApiResponse<object?>>> SetPrimary(
        int propertyId, int mediaId, CancellationToken ct)
    {
        var result = await _media.SetPrimaryImageAsync(propertyId, CurrentUserId(), IsAdmin(), mediaId, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    public sealed record AttachUrlBody(string Url, string? Type, string? AltText);
}
