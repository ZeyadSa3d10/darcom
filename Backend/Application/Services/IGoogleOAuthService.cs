namespace Application.Services;

public interface IGoogleOAuthService
{
    bool IsRedirectFlowConfigured();
    string BuildAuthorizationUrl(string redirectUri, string state, string codeChallenge);
    Task<GoogleUserPayload?> ExchangeCodeForUserAsync(
        string code,
        string codeVerifier,
        string redirectUri,
        CancellationToken ct = default);
}

