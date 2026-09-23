using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Generic CMS key-value store. Each row holds a JSON blob keyed by a unique
/// ContentKey (e.g. "hero.slides", "site.settings"). Admin dashboard editors
/// read/write these entries; public pages consume them with hardcoded fallbacks.
/// </summary>
public sealed class SiteContent : EntityBase
{
    /// <summary>Unique identifier such as "hero.slides", "home.cities", "site.settings".</summary>
    public string ContentKey { get; set; } = string.Empty;

    /// <summary>JSON payload — shape depends on the key.</summary>
    public string ContentValue { get; set; } = "{}";

    /// <summary>Admin-friendly label shown in the CMS editor.</summary>
    public string? Description { get; set; }

    /// <summary>Last admin user who updated this entry.</summary>
    public int? UpdatedBy { get; set; }
}
