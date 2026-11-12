namespace Application.Services;

public sealed record GoogleUserPayload(string Subject, string Email, string Name, bool EmailVerified);

public interface IGoogleTokenValidator
{
    Task<GoogleUserPayload?> ValidateAsync(string idToken, CancellationToken ct = default);
}

