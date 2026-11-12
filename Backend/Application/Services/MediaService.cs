using Application.BackgroundJobs;
using Application.Common;
using Application.DTOs;
using Application.Storage;
using Application.Stores;

namespace Application.Services;

public interface IMediaService
{
    Task<ServiceResult<MediaItemDto>> UploadAsync(int propertyId, int userId, bool isAdmin, string kind, Stream content, string fileName, string contentType, long length, string? altText, CancellationToken ct = default);
    Task<ServiceResult<MediaItemDto>> AttachUrlAsync(int propertyId, int userId, bool isAdmin, string kind, string url, string? type, string? altText, CancellationToken ct = default);
    Task<ServiceResult<List<MediaItemDto>>> ListAsync(int propertyId, CancellationToken ct = default);
    Task<ServiceResult<object?>> DeleteAsync(int userId, bool isAdmin, string kind, int mediaId, CancellationToken ct = default);
    Task<ServiceResult<object?>> SetPrimaryImageAsync(int propertyId, int userId, bool isAdmin, int imageId, CancellationToken ct = default);
}

public sealed class MediaService : IMediaService
{
    private static readonly Dictionary<string, (string[] Extensions, string[] ContentTypes, long MaxBytes, string Folder)> Kinds = new()
    {
        ["image"] = (new[] { ".jpg", ".jpeg", ".png", ".webp" }, new[] { "image/jpeg", "image/jpg", "image/png", "image/webp", "image/pjpeg", "image/x-png" }, 15 * 1024 * 1024, "images"),
        ["video"] = (new[] { ".mp4" }, new[] { "video/mp4" }, 200 * 1024 * 1024, "videos"),
        ["document"] = (new[] { ".pdf" }, new[] { "application/pdf" }, 20 * 1024 * 1024, "documents")
    };

    private readonly IStorageProvider _storage;
    private readonly IPropertyStore _properties;
    private readonly IPropertyImageJobService? _imageJobs;

    public MediaService(
        IStorageProvider storage,
        IPropertyStore properties,
        IPropertyImageJobService? imageJobs = null)
    {
        _storage = storage;
        _properties = properties;
        _imageJobs = imageJobs;
    }

    public async Task<ServiceResult<MediaItemDto>> UploadAsync(int propertyId, int userId, bool isAdmin, string kind, Stream content, string fileName, string contentType, long length, string? altText, CancellationToken ct = default)
    {
        if (!Kinds.TryGetValue(kind.ToLowerInvariant(), out var spec))
            return ServiceResult<MediaItemDto>.Fail("Kind must be image, video or document.", 422,
                new() { new("Invalid media kind.", "kind") });

        var ownerCheck = await CheckOwnership(propertyId, userId, isAdmin, ct);
        if (ownerCheck is not null) return ownerCheck;

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var cleanContentType = (contentType ?? "").Split(';')[0].Trim().ToLowerInvariant();
        if (!spec.Extensions.Contains(ext) || (!spec.ContentTypes.Contains(cleanContentType) && cleanContentType != "application/octet-stream" && !cleanContentType.StartsWith("image/")))
            return ServiceResult<MediaItemDto>.Fail($"Invalid {kind} file type.", 422,
                new() { new($"Allowed: {string.Join(", ", spec.Extensions)}.", "file") });
        if (length <= 0 || length > spec.MaxBytes)
            return ServiceResult<MediaItemDto>.Fail($"{kind} must be between 1 byte and {spec.MaxBytes / 1024 / 1024} MB.", 422,
                new() { new("File size out of range.", "file") });

        var url = await _storage.SaveAsync(content, fileName, contentType, spec.Folder, ct);
        var item = await AttachInternal(propertyId, kind, url, kind == "video" ? "upload" : null, altText, ct);

        if (kind.Equals("image", StringComparison.OrdinalIgnoreCase) && _imageJobs is not null)
        {
            try { await _imageJobs.EnqueueImageOptimizationAsync(item.Id, ct); }
            catch { /* Original image already stored and linked; optimization failure must never fail upload */ }
        }

        return ServiceResult<MediaItemDto>.Created(item, $"{kind} uploaded.");
    }

    public async Task<ServiceResult<MediaItemDto>> AttachUrlAsync(int propertyId, int userId, bool isAdmin, string kind, string url, string? type, string? altText, CancellationToken ct = default)
    {
        if (!Kinds.ContainsKey(kind.ToLowerInvariant()))
            return ServiceResult<MediaItemDto>.Fail("Kind must be image, video or document.", 422,
                new() { new("Invalid media kind.", "kind") });

        var ownerCheck = await CheckOwnership(propertyId, userId, isAdmin, ct);
        if (ownerCheck is not null) return ownerCheck;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || (u.Scheme != Uri.UriSchemeHttp && u.Scheme != Uri.UriSchemeHttps))
            return ServiceResult<MediaItemDto>.Fail("URL must be http(s).", 422,
                new() { new("Invalid URL.", "url") });

        var item = await AttachInternal(propertyId, kind.ToLowerInvariant(), url, type, altText, ct);
        return ServiceResult<MediaItemDto>.Created(item, $"{kind} attached.");
    }

    public async Task<ServiceResult<List<MediaItemDto>>> ListAsync(int propertyId, CancellationToken ct = default)
        => ServiceResult<List<MediaItemDto>>.Ok(await _properties.GetMediaAsync(propertyId, ct));

    public async Task<ServiceResult<object?>> DeleteAsync(int userId, bool isAdmin, string kind, int mediaId, CancellationToken ct = default)
    {
        var peeked = await _properties.PeekMediaAsync(kind.ToLowerInvariant(), mediaId, ct);
        if (peeked is null)
            return ServiceResult<object?>.NotFound("Media not found.");

        var (propertyId, ownerId, url) = peeked.Value;
        if (!isAdmin && ownerId != userId && !await _properties.CanUserManagePropertyAsync(propertyId, userId, ct))
            return ServiceResult<object?>.Fail("You can only manage your own property media.", 403);

        await _properties.RemoveMediaAsync(kind.ToLowerInvariant(), mediaId, ct);
        await _properties.SaveChangesAsync(ct);

        // Delete the binary best-effort — cleanup must never fail the request.
        try { await _storage.DeleteAsync(url, ct); }
        catch { }

        return ServiceResult<object?>.Ok(null, "Media deleted.");
    }

    public async Task<ServiceResult<object?>> SetPrimaryImageAsync(int propertyId, int userId, bool isAdmin, int imageId, CancellationToken ct = default)
    {
        var ownerCheck = await CheckOwnership(propertyId, userId, isAdmin, ct);
        if (ownerCheck is not null) return ServiceResult<object?>.Fail(ownerCheck.Message, ownerCheck.StatusCode);

        var success = await _properties.SetPrimaryImageAsync(propertyId, imageId, ct);
        if (!success)
            return ServiceResult<object?>.NotFound("Image not found on this property.");

        await _properties.SaveChangesAsync(ct);
        return ServiceResult<object?>.Ok(null, "Primary cover image updated.");
    }

    private async Task<ServiceResult<MediaItemDto>?> CheckOwnership(int propertyId, int userId, bool isAdmin, CancellationToken ct)
    {
        var property = await _properties.GetEntityAsync(propertyId, ct);
        if (property is null)
            return ServiceResult<MediaItemDto>.NotFound("Property not found.");
        if (!isAdmin && property.OwnerId != userId && property.CreatedByUserId != userId)
            return ServiceResult<MediaItemDto>.Fail("You can only manage your own property media.", 403);
        return null;
    }

    private async Task<MediaItemDto> AttachInternal(int propertyId, string kind, string url, string? type, string? altText, CancellationToken ct)
    {
        if (kind == "image")
        {
            var img = await _properties.AttachImageAsync(propertyId, url, altText, ct);
            await _properties.SaveChangesAsync(ct);
            return new MediaItemDto("image", img.Id, img.Url, null, img.Order, img.IsPrimary, img.AltText);
        }
        if (kind == "video")
        {
            var vid = await _properties.AttachVideoAsync(propertyId, url, type, ct);
            await _properties.SaveChangesAsync(ct);
            return new MediaItemDto("video", vid.Id, vid.Url, vid.Type, vid.Order, vid.IsPrimary, vid.AltText);
        }
        var doc = await _properties.AttachDocumentAsync(propertyId, url, type, ct);
        await _properties.SaveChangesAsync(ct);
        return new MediaItemDto("document", doc.Id, doc.Url, doc.Type, doc.Order, false, doc.AltText);
    }
}
