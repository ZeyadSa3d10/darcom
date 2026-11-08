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

    public Task<string> SendOtpAsync(string phoneNumber, CancellationToken ct = default)
    {
        var normalized = Application.Common.PhoneNormalizer.Normalize(phoneNumber);
        // Generate a cryptographically secure 6-digit code
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        // 5-minute expiry
        _cache.Set($"OTP_{normalized}", code, TimeSpan.FromMinutes(5));

        _logger.LogInformation("Generated OTP for phone {Phone}: {Code}", normalized, code);

        return Task.FromResult(code);
    }

    public Task<bool> VerifyOtpAsync(string phoneNumber, string code, CancellationToken ct = default)
    {
        var normalized = Application.Common.PhoneNormalizer.Normalize(phoneNumber);
        var normalizedCode = Application.Common.PhoneNormalizer.NormalizeDigits(code).Trim();
        var key = $"OTP_{normalized}";

        if (_cache.TryGetValue(key, out string? cachedCode) && cachedCode == normalizedCode)
        {
            _cache.Remove(key);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }
}

