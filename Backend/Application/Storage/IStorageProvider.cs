namespace Application.Storage;

/// <summary>
/// Object-storage abstraction (website.md #22). Business logic depends ONLY on this
/// interface — swapping Local / Cloudinary / Azure Blob / S3 is a config change
/// plus a new implementation class, never a rewrite.
/// </summary>
public interface IStorageProvider
{
    string Name { get; }

    /// <returns>Public URL of the stored file (e.g. /uploads/images/abc.jpg).</returns>
    Task<string> SaveAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default);

    /// <param name="publicUrl">The URL previously returned by <see cref="SaveAsync"/>.</param>
    Task DeleteAsync(string publicUrl, CancellationToken ct = default);
}

public sealed class StorageOptions
{
    public const string Section = "Storage";

    public string Provider { get; set; } = "Local";
    public string LocalPath { get; set; } = "uploads";
}
