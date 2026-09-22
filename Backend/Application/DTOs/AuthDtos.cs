namespace Application.DTOs;

public sealed record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber);

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshRequest(string RefreshToken);

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
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User);
