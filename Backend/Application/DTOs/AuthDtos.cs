namespace Application.DTOs;

public sealed record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber);

public sealed record LoginRequest(string Email, string Password);

public sealed record SendEmailOtpRequest(string Email);

public sealed record VerifyEmailOtpRequest(string Email, string Code, string? FullName = null);

public sealed record GoogleLoginRequest(string IdToken);

public sealed record RefreshRequest(string? RefreshToken = null);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);

public sealed record UserDto(
    int Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    string Role);

public sealed record AuthResponse(
    string AccessToken,
    string? RefreshToken,
    DateTime ExpiresAt,
    UserDto User);

public sealed record AuthTokenBundle(
    string AccessToken,
    string RefreshToken,
    DateTime AccessExpiresAt,
    DateTime RefreshExpiresAt,
    UserDto User);

public sealed record SendEmailOtpResponse(
    int CooldownSeconds,
    int ExpiryMinutes,
    string? DebugCode = null);
