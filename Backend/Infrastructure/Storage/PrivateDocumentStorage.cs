using Application.Storage;

namespace Infrastructure.Storage;

public sealed class PrivateDocumentStorage : IPrivateDocumentStorage
{
    private readonly string _basePath;

    public PrivateDocumentStorage(string? basePath = null)
    {
        _basePath = basePath ?? Path.Combine(AppContext.BaseDirectory, "App_Data", "private-documents");
        if (!Directory.Exists(_basePath))
        {
            Directory.CreateDirectory(_basePath);
        }
    }

    public async Task<string> SavePrivateDocumentAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default)
    {
        var targetFolder = Path.Combine(_basePath, folder);
        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var uniqueName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(targetFolder, uniqueName);

        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true);
        await content.CopyToAsync(fs, ct);

        // Return relative path: e.g. "broker-ids/uniqueName.jpg"
        return Path.Combine(folder, uniqueName).Replace('\\', '/');
    }

    public Task<(Stream Stream, string ContentType)?> GetPrivateDocumentAsync(string relativePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return Task.FromResult<(Stream Stream, string ContentType)?>(null);

        var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, normalized));

        // Path traversal protection
        if (!fullPath.StartsWith(Path.GetFullPath(_basePath), StringComparison.OrdinalIgnoreCase))
            return Task.FromResult<(Stream Stream, string ContentType)?>(null);

        if (!File.Exists(fullPath))
            return Task.FromResult<(Stream Stream, string ContentType)?>(null);

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream Stream, string ContentType)?>((stream, contentType));
    }

    public Task DeletePrivateDocumentAsync(string relativePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return Task.CompletedTask;

        var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, normalized));

        if (fullPath.StartsWith(Path.GetFullPath(_basePath), StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
