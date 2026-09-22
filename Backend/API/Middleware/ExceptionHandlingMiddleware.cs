using System.Net;
using System.Text.Json;
using Application.Common;

namespace API.Middleware;

/// <summary>
/// Global exception handler (website.md #31). Never leaks stack traces:
/// always returns { success:false, message, errors:[] } and logs with a trace id.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = null };
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var traceId = context.TraceIdentifier;
            _logger.LogError(ex, "Unhandled exception. TraceId: {TraceId} {Method} {Path}",
                traceId, context.Request.Method, context.Request.Path);

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            var body = ApiResponse.Fail("Something went wrong.",
                new() { new($"Reference: {traceId}") });
            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
        }
    }
}
