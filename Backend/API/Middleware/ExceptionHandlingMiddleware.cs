using System.Net;
using System.Text.Json;
using Application.Common;
using Application.Services;
using FluentValidation;

namespace API.Middleware;

/// <summary>
/// Global exception handler: maps ValidationException (422) and RequestFailure cleanly,
/// and never leaks stack traces on unexpected errors.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
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
        catch (ValidationException vex)
        {
            var errors = vex.Errors
                .Select(e => new ApiError(e.ErrorMessage, ToCamel(e.PropertyName)))
                .ToList();

            context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
            context.Response.ContentType = "application/json";
            var body = ApiResponse.Fail("Validation failed.", errors);
            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
        }
        catch (RequestFailure rf)
        {
            context.Response.StatusCode = rf.StatusCode;
            context.Response.ContentType = "application/json";
            var body = ApiResponse.Fail(rf.Message, rf.Errors);
            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
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

    private static string ToCamel(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        var leaf = name.Contains('.') ? name[(name.LastIndexOf('.') + 1)..] : name;
        return char.ToLowerInvariant(leaf[0]) + leaf[1..];
    }
}
