namespace Application.DTOs;

public sealed record SiteContentDto(
    int Id,
    string ContentKey,
    string ContentValue,
    string? Description,
    int? UpdatedBy,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed class UpsertSiteContentRequest
{
    public string ContentKey { get; set; } = string.Empty;
    public string ContentValue { get; set; } = "{}";
    public string? Description { get; set; }
}
