using Application.Common;
using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Public CMS content reader + admin-only writer.
/// Public endpoints serve JSON blobs by key; admin endpoints upsert/delete.
/// </summary>
[ApiController]
[Route("api/site-content")]
public sealed class SiteContentController : ApiBaseController
{
    private readonly ISiteContentService _cms;

    public SiteContentController(ISiteContentService cms) => _cms = cms;

    /// <summary>Fetch a single content block by key.</summary>
    [HttpGet("{key}")]
    [ProducesResponseType(typeof(ApiResponse<SiteContentDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<SiteContentDto>), 404)]
    public async Task<ActionResult<ApiResponse<SiteContentDto>>> GetByKey(string key, CancellationToken ct)
    {
        var result = await _cms.GetByKeyAsync(key, ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<SiteContentDto>.Ok(result.Data!, result.Message)
            : ApiResponse<SiteContentDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>Fetch multiple content blocks. Pass keys as comma-separated query param.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<Dictionary<string, string>>), 200)]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> GetBulk(
        [FromQuery] string? keys,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(keys))
        {
            var all = await _cms.GetAllAsync(ct);
            return Ok(ApiResponse<List<SiteContentDto>>.Ok(all.Data!));
        }

        var keyArray = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var result = await _cms.GetBulkAsync(keyArray, ct);
        return Ok(ApiResponse<Dictionary<string, string>>.Ok(result.Data!));
    }

    /// <summary>Create or update a content block. Admin only.</summary>
    [HttpPut]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<SiteContentDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<SiteContentDto>), 422)]
    public async Task<ActionResult<ApiResponse<SiteContentDto>>> Upsert(
        [FromBody] UpsertSiteContentRequest request,
        CancellationToken ct)
    {
        var result = await _cms.UpsertAsync(CurrentUserId(), request, ClientIp(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<SiteContentDto>.Ok(result.Data!, result.Message)
            : ApiResponse<SiteContentDto>.Fail(result.Message, result.Errors));
    }

    /// <summary>Delete a content block. Admin only.</summary>
    [HttpDelete("{key}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 404)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(string key, CancellationToken ct)
    {
        var result = await _cms.DeleteAsync(CurrentUserId(), key, ClientIp(), ct);
        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    private string? ClientIp()
        => HttpContext.Connection.RemoteIpAddress?.ToString();
}
