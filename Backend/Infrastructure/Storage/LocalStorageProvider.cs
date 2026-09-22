using Application.Storage;
using Microsoft.Extensions.Options;

namespace Infrastructure.Storage;

/// <summary>Development/local implementation. Production providers (Cloudinary, S3, Azure)
/// implement the same interface — business logic never changes.</summary>
public sealed class LocalStorageProvider : IStorageProvider
{
    public string Name => "Local";

    private readonly string _root;

    public LocalStorageProvider(IOptions<StorageOptions> options)
    {
        _root = options.Value.LocalPath;
    }

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default)
    {
        var dir = Path.Combine(_root, folder);
        Directory.CreateDirectory(dir);

        var name = $"{Guid.NewGuid():N}{Path.GetExtension(fileName).ToLowerInvariant()}";
        var path = Path.Combine(dir, name);
        await using var file = File.Create(path);
        await content.CopyToAsync(file, ct);

        return $"/uploads/{folder}/{name}";
    }

    public Task DeleteAsync(string publicUrl, CancellationToken ct = default)
    {
        const string prefix = "/uploads/";
        if (!publicUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;

        var relative = publicUrl[prefix.Length..].Replace('/', Path.DirectorySeparatorChar);
        var full = Path.GetFullPath(Path.Combine(_root, relative));
        if (full.StartsWith(Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase) && File.Exists(full))
            File.Delete(full);
        return Task.CompletedTask;
    }
}
