using Application.Common;
using Application.DTOs;

namespace Application.Services;

public interface IEmailOtpService
{
    Task<ServiceResult<SendEmailOtpResponse>> SendOtpAsync(string email, string? ipAddress, bool isDevelopment, CancellationToken ct = default);
    Task<ServiceResult<object?>> VerifyOtpAsync(string email, string code, CancellationToken ct = default);
}

