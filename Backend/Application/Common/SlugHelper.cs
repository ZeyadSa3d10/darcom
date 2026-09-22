using System.Text;
using System.Text.RegularExpressions;

namespace Application.Common;

public static partial class SlugHelper
{
    private static readonly Regex InvalidChars = InvalidCharsRegex();
    private static readonly Regex MultiDash = MultiDashRegex();

    public static string GenerateSlug(string title)
    {
        var slug = (title ?? string.Empty).Trim().ToLowerInvariant();
        slug = InvalidChars.Replace(slug, "-");
        slug = MultiDash.Replace(slug, "-").Trim('-');
        return slug.Length switch
        {
            0 => "property",
            > 200 => slug[..200].Trim('-'),
            _ => slug
        };
    }

    public static string UniqueSlug(string baseSlug, Func<string, bool> exists)
    {
        var slug = baseSlug;
        var i = 2;
        while (exists(slug))
            slug = $"{baseSlug}-{i++}";
        return slug;
    }

    [GeneratedRegex(@"[^a-z0-9\-]+", RegexOptions.Compiled)]
    private static partial Regex InvalidCharsRegex();

    [GeneratedRegex(@"\-+", RegexOptions.Compiled)]
    private static partial Regex MultiDashRegex();
}
