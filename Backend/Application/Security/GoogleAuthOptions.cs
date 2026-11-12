namespace Application.Security;

public sealed class GoogleAuthOptions
{
    public const string Section = "GoogleAuth";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string FrontendBaseUrl { get; set; } = string.Empty;
}
