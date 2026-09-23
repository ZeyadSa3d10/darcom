namespace API.Middleware;

/// <summary>Baseline secure headers (website.md #29).</summary>
public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        // HSTS is only honored over HTTPS (harmless on plain HTTP dev).
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        // Images/media are self-hosted; maps come from OSM embeds; fonts from Google.
        headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: blob:; " +
            "media-src 'self' data: blob:; " +
            "connect-src 'self' https:; " +
            "frame-src https://www.openstreetmap.org https://export.openstreetmap.org; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; form-action 'self'";
        headers["X-Darcom-Trace"] = context.TraceIdentifier;
        await _next(context);
    }
}
