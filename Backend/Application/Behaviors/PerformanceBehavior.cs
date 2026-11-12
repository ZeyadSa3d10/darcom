using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Behaviors;

/// <summary>
/// Measures execution time of MediatR Commands and Queries and flags slow handlers (> 500ms).
/// </summary>
public sealed class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const long SlowThresholdMs = 500;
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            return await next();
        }
        finally
        {
            sw.Stop();
            if (sw.ElapsedMilliseconds > SlowThresholdMs)
            {
                _logger.LogWarning("Long-running request detected: {RequestName} took {ElapsedMs}ms",
                    typeof(TRequest).Name, sw.ElapsedMilliseconds);
            }
        }
    }
}

