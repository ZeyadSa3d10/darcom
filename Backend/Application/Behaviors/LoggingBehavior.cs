using Application.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Behaviors;

/// <summary>
/// Logs MediatR request execution and outcome without logging sensitive payload values.
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}", requestName);

        try
        {
            var response = await next();

            if (response is IServiceResult result && !result.Succeeded)
            {
                _logger.LogWarning("Completed {RequestName} with failure status {StatusCode}: {Message}",
                    requestName, result.StatusCode, result.Message);
            }
            else
            {
                _logger.LogInformation("Handled {RequestName} successfully", requestName);
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while handling {RequestName}", requestName);
            throw;
        }
    }
}
