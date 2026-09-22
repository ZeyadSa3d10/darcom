namespace Application.DTOs;

public sealed record UpdateProfileRequest(
    string FullName,
    string? PhoneNumber);

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);
