using Application.Security;
using Application.Services;
using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Security;

public sealed class GoogleTokenValidator : IGoogleTokenValidator
{
    private readonly GoogleAuthOptions _options;
    private readonly ILogger<GoogleTokenValidator> _logger;

    public GoogleTokenValidator(IOptions<GoogleAuthOptions> options, ILogger<GoogleTokenValidator> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GoogleUserPayload?> ValidateAsync(string idToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
            return null;

        if (string.IsNullOrWhiteSpace(_options.ClientId))
        {
            _logger.LogWarning("GoogleAuth:ClientId is not configured. Rejecting Google login attempt.");
            return null;
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _options.ClientId }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            if (payload is null || !payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
                return null;

            return new GoogleUserPayload(
                payload.Subject,
                payload.Email.Trim().ToLowerInvariant(),
                payload.Name ?? string.Empty,
                payload.EmailVerified);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(ex, "Invalid Google ID token rejected.");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while validating Google ID token.");
            return null;
        }
    }
}

