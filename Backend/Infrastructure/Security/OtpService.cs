using System.Security.Cryptography;
using Application.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Security;

public sealed class OtpService : IOtpService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<OtpService> _logger;

    public OtpService(IMemoryCache cache, ILogger<OtpService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("20") && digits.Length == 12)
        {
            digits = "0" + digits[2..];
        }
        return digits;
    }

    public Task<string> SendOtpAsync(string phoneNumber, CancellationToken ct = default)
    {
        var normalized = NormalizePhone(phoneNumber);
        // Generate a cryptographically secure 6-digit code
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        // 5-minute expiry
        _cache.Set($"OTP_{normalized}", code, TimeSpan.FromMinutes(5));

        _logger.LogInformation("Generated OTP for phone {Phone}: {Code}", normalized, code);

        return Task.FromResult(code);
    }

    public Task<bool> VerifyOtpAsync(string phoneNumber, string code, CancellationToken ct = default)
    {
        var normalized = NormalizePhone(phoneNumber);
        var key = $"OTP_{normalized}";

        if (_cache.TryGetValue(key, out string? cachedCode) && cachedCode == code.Trim())
        {
            _cache.Remove(key);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }
}

