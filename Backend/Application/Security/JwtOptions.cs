namespace Application.Security;

/// <summary>JWT settings bound from configuration (never hard-coded).</summary>
public sealed class JwtOptions
{
    public const string Section = "JWT";

    public string Issuer { get; set; } = "Darcom";
    public string Audience { get; set; } = "Darcom";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}
