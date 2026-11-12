namespace Application.Security;

public sealed class EmailOtpOptions
{
    public const string Section = "EmailOtp";

    public int ExpiryMinutes { get; set; } = 5;
    public int ResendCooldownSeconds { get; set; } = 60;
    public int MaxAttempts { get; set; } = 5;
    public string SecretPepper { get; set; } = string.Empty;
}

