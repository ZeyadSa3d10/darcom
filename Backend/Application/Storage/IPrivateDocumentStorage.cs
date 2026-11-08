namespace Application.Storage;

/// <summary>
/// Storage abstraction for sensitive/private documents (e.g. National ID cards)
/// that must NEVER be exposed publicly via the /uploads static endpoint.
/// </summary>
public interface IPrivateDocumentStorage
{
    Task<string> SavePrivateDocumentAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType)?> GetPrivateDocumentAsync(string relativePath, CancellationToken ct = default);
    Task DeletePrivateDocumentAsync(string relativePath, CancellationToken ct = default);
}

