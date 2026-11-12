using System.Text.Json;
using Application.Security;
using Application.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Security;

public sealed class GoogleOAuthService : IGoogleOAuthService
{
    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    private readonly HttpClient _http;
    private readonly GoogleAuthOptions _options;
    private readonly IGoogleTokenValidator _tokenValidator;
    private readonly ILogger<GoogleOAuthService> _logger;

    public GoogleOAuthService(
        HttpClient http,
        IOptions<GoogleAuthOptions> options,
        IGoogleTokenValidator tokenValidator,
        ILogger<GoogleOAuthService> logger)
    {
        _http = http;
        _options = options.Value;
        _tokenValidator = tokenValidator;
        _logger = logger;
    }

    public bool IsRedirectFlowConfigured()
        => !string.IsNullOrWhiteSpace(_options.ClientId)
           && !string.IsNullOrWhiteSpace(_options.ClientSecret);

    public string BuildAuthorizationUrl(string redirectUri, string state, string codeChallenge)
    {
        if (!IsRedirectFlowConfigured())
            throw new InvalidOperationException("GoogleAuth:ClientId and GoogleAuth:ClientSecret must be configured.");

        var query = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
            ["prompt"] = "select_account"
        };

        var qs = string.Join("&", query.Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));
        return $"{AuthorizationEndpoint}?{qs}";
    }

    public async Task<GoogleUserPayload?> ExchangeCodeForUserAsync(
        string code,
        string codeVerifier,
        string redirectUri,
        CancellationToken ct = default)
    {
        if (!IsRedirectFlowConfigured() || string.IsNullOrWhiteSpace(code))
            return null;

        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code",
            ["code_verifier"] = codeVerifier
        });

        using var response = await _http.PostAsync(TokenEndpoint, form, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Google token exchange failed with status {Status}: {Body}", (int)response.StatusCode, errBody);
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("id_token", out var idTokenProp))
        {
            _logger.LogWarning("Google token response did not include id_token.");
            return null;
        }

        var idToken = idTokenProp.GetString();
        if (string.IsNullOrWhiteSpace(idToken))
            return null;

        // Validate signature, Issuer, Audience, Expiration, and EmailVerified via GoogleJsonWebSignature
        return await _tokenValidator.ValidateAsync(idToken, ct);
    }
}

