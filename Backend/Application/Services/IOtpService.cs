namespace Application.Services;

public interface IOtpService
{
    Task<string> SendOtpAsync(string phoneNumber, CancellationToken ct = default);
    Task<bool> VerifyOtpAsync(string phoneNumber, string code, CancellationToken ct = default);
}

