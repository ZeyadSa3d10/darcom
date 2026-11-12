using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.Common;
using Application.DTOs;
using Application.Security;
using Application.Services;
using Application.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public sealed class AuthController : ApiBaseController
{
    private const string RefreshCookieName = "darcom_refresh_token";
    private const string GoogleStateCookieName = "darcom_google_oauth";

    private readonly IAuthService _auth;
    private readonly IGoogleOAuthService _googleOAuth;
    private readonly ITimeLimitedDataProtector _oauthStateProtector;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly GoogleAuthOptions _googleOptions;

    public AuthController(
        IAuthService auth,
        IGoogleOAuthService googleOAuth,
        IDataProtectionProvider dataProtection,
        IWebHostEnvironment env,
        IConfiguration config,
        IOptions<GoogleAuthOptions> googleOptions)
    {
        _auth = auth;
        _googleOAuth = googleOAuth;
        _oauthStateProtector = dataProtection.CreateProtector("Darcom.GoogleOAuthState.v1").ToTimeLimitedDataProtector();
        _env = env;
        _config = config;
        _googleOptions = googleOptions.Value;
    }

    /// <summary>Public auth configuration (exposes public Google ClientId and callback path only, never secrets).</summary>
    [HttpGet("config")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public ActionResult<ApiResponse<object>> Config()
        => Ok(ApiResponse<object>.Ok(new
        {
            googleEnabled = !string.IsNullOrWhiteSpace(_googleOptions.ClientId),
            googleRedirectEnabled = _googleOAuth.IsRedirectFlowConfigured(),
            googleClientId = _googleOptions.ClientId,
            googleCallbackUrl = ResolveGoogleRedirectUri()
        }));

    /// <summary>Send a 6-digit login/sign-up OTP to the provided email address.</summary>
    [HttpPost("email-otp/send")]
    [EnableRateLimiting("otp")]
    [ProducesResponseType(typeof(ApiResponse<SendEmailOtpResponse>), 200)]
    [ProducesResponseType(422)]
    [ProducesResponseType(429)]
    public Task<ActionResult<ApiResponse<SendEmailOtpResponse>>> SendEmailOtp(
        [FromBody] SendEmailOtpRequest request,
        [FromServices] SendEmailOtpValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(
            validator,
            request,
            () => _auth.SendEmailOtpAsync(request, ClientIp(), _env.IsDevelopment(), ct),
            ct);

    /// <summary>Verify email OTP, create Buyer account if new, and issue JWT + HttpOnly refresh cookie.</summary>
    [HttpPost("email-otp/verify")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 201)]
    [ProducesResponseType(422)]
    [ProducesResponseType(429)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> VerifyEmailOtp(
        [FromBody] VerifyEmailOtpRequest request,
        [FromServices] VerifyEmailOtpValidator validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblemResponse<AuthResponse>(validation);

        var result = await _auth.VerifyEmailOtpAndSignInAsync(request, ClientIp(), ct);
        return HandleTokenBundleResult(result);
    }

    /// <summary>Verify Google ID Token, safely link or create user, and issue Darcom JWT + HttpOnly refresh cookie.</summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(422)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> GoogleLogin(
        [FromBody] GoogleLoginRequest request,
        [FromServices] GoogleLoginValidator validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblemResponse<AuthResponse>(validation);

        var result = await _auth.GoogleLoginAsync(request, ClientIp(), ct);
        return HandleTokenBundleResult(result);
    }

    /// <summary>Initiates Google OAuth 2.0 Authorization Code + PKCE redirect flow.</summary>
    [HttpGet("google/login")]
    public IActionResult GoogleRedirectLogin([FromQuery] string? returnUrl = "/")
    {
        var frontendBase = ResolveFrontendBaseUrl();
        var safeReturnUrl = SanitizeReturnUrl(returnUrl);

        if (!_googleOAuth.IsRedirectFlowConfigured())
            return Redirect($"{frontendBase}/login?authError=google_not_configured");

        var state = Base64Url(RandomNumberGenerator.GetBytes(32));
        var codeVerifier = Base64Url(RandomNumberGenerator.GetBytes(48));
        var codeChallenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier)));

        var payloadJson = JsonSerializer.Serialize(new GoogleOAuthCookieState(state, codeVerifier, safeReturnUrl));
        var protectedState = _oauthStateProtector.Protect(payloadJson, TimeSpan.FromMinutes(10));

        var isHttps = Request.IsHttps || !_env.IsDevelopment();
        Response.Cookies.Append(GoogleStateCookieName, protectedState, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth/google",
            MaxAge = TimeSpan.FromMinutes(10),
            IsEssential = true
        });

        var redirectUri = ResolveGoogleRedirectUri();
        var googleAuthUrl = _googleOAuth.BuildAuthorizationUrl(redirectUri, state, codeChallenge);
        return Redirect(googleAuthUrl);
    }

    /// <summary>Google OAuth 2.0 Callback URL: validates state + PKCE, exchanges code for verified ID token, sets HttpOnly refresh cookie.</summary>
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleRedirectCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken ct)
    {
        var frontendBase = ResolveFrontendBaseUrl();
        var protectedCookie = Request.Cookies[GoogleStateCookieName];
        ClearGoogleStateCookie();

        if (!string.IsNullOrWhiteSpace(error))
            return Redirect($"{frontendBase}/login?authError=google_cancelled");

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(protectedCookie))
            return Redirect($"{frontendBase}/login?authError=google_invalid_state");

        GoogleOAuthCookieState? cookieState;
        try
        {
            var json = _oauthStateProtector.Unprotect(protectedCookie);
            cookieState = JsonSerializer.Deserialize<GoogleOAuthCookieState>(json);
        }
        catch
        {
            return Redirect($"{frontendBase}/login?authError=google_expired_state");
        }

        if (cookieState is null || !FixedTimeStringEquals(cookieState.State, state))
            return Redirect($"{frontendBase}/login?authError=google_invalid_state");

        var redirectUri = ResolveGoogleRedirectUri();
        var userPayload = await _googleOAuth.ExchangeCodeForUserAsync(code, cookieState.CodeVerifier, redirectUri, ct);
        if (userPayload is null)
            return Redirect($"{frontendBase}/login?authError=google_failed");

        var authResult = await _auth.GoogleExternalLoginAsync(userPayload, ClientIp(), ct);
        if (!authResult.Succeeded || authResult.Data is null)
            return Redirect($"{frontendBase}/login?authError=google_account_disabled");

        SetRefreshCookie(authResult.Data.RefreshToken, authResult.Data.RefreshExpiresAt);
        var safeReturnUrl = SanitizeReturnUrl(cookieState.ReturnUrl);
        return Redirect($"{frontendBase}{safeReturnUrl}");
    }

    /// <summary>Self-registration. The role is always Buyer — roles are never taken from the client.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 201)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 409)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 422)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(
        [FromBody] RegisterRequest request,
        [FromServices] RegisterValidator validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblemResponse<AuthResponse>(validation);

        var result = await _auth.RegisterAsync(request, ClientIp(), ct);
        return HandleTokenBundleResult(result);
    }

    /// <summary>Send OTP code to the provided phone number for broker registration.</summary>
    [HttpPost("otp/send")]
    [EnableRateLimiting("otp")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<ActionResult<ApiResponse<object>>> SendOtp(
        [FromBody] SendOtpRequest request,
        [FromServices] IOtpService otp,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(ApiResponse<object>.Fail("رقم الهاتف مطلوب."));

        var code = await otp.SendOtpAsync(request.PhoneNumber, ct);
        return Ok(ApiResponse<object>.Ok(
            new { Sent = true, DebugCode = _env.IsDevelopment() ? code : null },
            "تم إرسال رمز التحقق بنجاح."));
    }

    /// <summary>Verify the OTP code sent to the phone number.</summary>
    [HttpPost("otp/verify")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<ActionResult<ApiResponse<object>>> VerifyOtp(
        [FromBody] VerifyOtpRequest request,
        [FromServices] IOtpService otp,
        CancellationToken ct)
    {
        var isValid = await otp.VerifyOtpAsync(request.PhoneNumber, request.Code, ct);
        if (!isValid)
            return UnprocessableEntity(ApiResponse<object>.Fail("رمز التحقق غير صحيح أو انتهت صلاحيته."));

        return Ok(ApiResponse<object>.Ok(new { Verified = true }, "تم التحقق من رقم الهاتف بنجاح."));
    }

    /// <summary>Broker self-registration with verified Phone OTP and National ID card images.</summary>
    [HttpPost("register-broker")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 201)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 409)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 422)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RegisterBroker(
        [FromBody] RegisterBrokerDto request,
        CancellationToken ct)
    {
        var result = await _auth.RegisterBrokerAsync(request, ClientIp(), ct);
        return HandleTokenBundleResult(result);
    }

    /// <summary>Password login (used by Admin and password-enabled Broker accounts).</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 401)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 422)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(
        [FromBody] LoginRequest request,
        [FromServices] LoginValidator validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblemResponse<AuthResponse>(validation);

        var result = await _auth.LoginAsync(request, ClientIp(), ct);
        return HandleTokenBundleResult(result);
    }

    /// <summary>Rotates the refresh token from HttpOnly cookie (or body fallback) and issues a new Access Token.</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Refresh(
        [FromBody] RefreshRequest? request,
        CancellationToken ct)
    {
        var cookieToken = Request.Cookies[RefreshCookieName];
        var rawToken = !string.IsNullOrWhiteSpace(cookieToken)
            ? cookieToken
            : request?.RefreshToken;

        if (string.IsNullOrWhiteSpace(rawToken))
        {
            ClearRefreshCookie();
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Session expired. Please log in again."));
        }

        var result = await _auth.RefreshAsync(rawToken, ClientIp(), ct);
        if (!result.Succeeded)
        {
            ClearRefreshCookie();
            return StatusCode(result.StatusCode, ApiResponse<AuthResponse>.Fail(result.Message, result.Errors));
        }

        return HandleTokenBundleResult(result);
    }

    /// <summary>Revokes the current refresh token and clears the HttpOnly cookie.</summary>
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<ActionResult<ApiResponse<object?>>> Logout(CancellationToken ct)
    {
        var userId = TryGetCurrentUserId() ?? 0;
        var cookieToken = Request.Cookies[RefreshCookieName];
        var result = await _auth.LogoutAsync(userId, cookieToken, ClientIp(), ct);
        ClearRefreshCookie();

        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    /// <summary>Revokes all active sessions for the current user across all devices.</summary>
    [Authorize]
    [HttpPost("revoke-all")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<ApiResponse<object?>>> RevokeAll(CancellationToken ct)
    {
        var result = await _auth.RevokeAllSessionsAsync(CurrentUserId(), ClientIp(), ct);
        ClearRefreshCookie();

        return StatusCode(result.StatusCode, result.Succeeded
            ? ApiResponse<object?>.Ok(result.Message)
            : ApiResponse<object?>.Fail(result.Message, result.Errors));
    }

    /// <summary>Issues a password reset token via Identity. Always returns the same message.</summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ApiResponse<string?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string?>), 422)]
    public Task<ActionResult<ApiResponse<string?>>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] ForgotPasswordValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request,
            () => _auth.ForgotPasswordAsync(request, _env.IsDevelopment(), ct), ct);

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 400)]
    [ProducesResponseType(typeof(ApiResponse<object?>), 422)]
    public Task<ActionResult<ApiResponse<object?>>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        [FromServices] ResetPasswordValidator validator,
        CancellationToken ct)
        => ValidateAndExecute(validator, request, () => _auth.ResetPasswordAsync(request, ct), ct);

    private ActionResult<ApiResponse<AuthResponse>> HandleTokenBundleResult(ServiceResult<AuthTokenBundle> result)
    {
        if (!result.Succeeded || result.Data is null)
            return StatusCode(result.StatusCode, ApiResponse<AuthResponse>.Fail(result.Message, result.Errors));

        var bundle = result.Data;
        SetRefreshCookie(bundle.RefreshToken, bundle.RefreshExpiresAt);

        // Do not expose raw RefreshToken in browser JSON payloads; it lives safely in the HttpOnly cookie.
        var publicResponse = new AuthResponse(bundle.AccessToken, null, bundle.AccessExpiresAt, bundle.User);
        return StatusCode(result.StatusCode, ApiResponse<AuthResponse>.Ok(publicResponse, result.Message));
    }

    private void SetRefreshCookie(string refreshToken, DateTime expiresAt)
    {
        var isHttps = Request.IsHttps || !_env.IsDevelopment();
        Response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = new DateTimeOffset(expiresAt, TimeSpan.Zero),
            IsEssential = true
        });
    }

    private void ClearRefreshCookie()
    {
        var isHttps = Request.IsHttps || !_env.IsDevelopment();
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/api/auth"
        });
    }

    private ActionResult<ApiResponse<T>> ValidationProblemResponse<T>(FluentValidation.Results.ValidationResult validation)
    {
        var errors = validation.Errors
            .Select(e => new ApiError(
                e.ErrorMessage,
                string.IsNullOrEmpty(e.PropertyName)
                    ? e.PropertyName
                    : char.ToLowerInvariant(e.PropertyName[0]) + e.PropertyName[1..]))
            .ToList();
        return StatusCode(422, ApiResponse<T>.Fail("Validation failed.", errors));
    }

    private string? ClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private string ResolveGoogleRedirectUri()
    {
        if (!string.IsNullOrWhiteSpace(_googleOptions.RedirectUri))
            return _googleOptions.RedirectUri.Trim();

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
        return $"{scheme}://{host}/api/auth/google/callback";
    }

    private string ResolveFrontendBaseUrl()
    {
        if (!string.IsNullOrWhiteSpace(_googleOptions.FrontendBaseUrl))
            return _googleOptions.FrontendBaseUrl.Trim().TrimEnd('/');

        var allowed = _config.GetSection("AllowedOrigins").Get<string[]>();
        if (allowed is { Length: > 0 } && !string.IsNullOrWhiteSpace(allowed[0]))
            return allowed[0].Trim().TrimEnd('/');

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
        return $"{scheme}://{host}";
    }

    private string SanitizeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl)) return "/";
        var trimmed = returnUrl.Trim();
        if (!trimmed.StartsWith('/') || trimmed.StartsWith("//") || trimmed.StartsWith("/\\"))
            return "/";
        return Url.IsLocalUrl(trimmed) ? trimmed : "/";
    }

    private void ClearGoogleStateCookie()
    {
        var isHttps = Request.IsHttps || !_env.IsDevelopment();
        Response.Cookies.Delete(GoogleStateCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth/google"
        });
    }

    private static string Base64Url(byte[] bytes)
        => Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static bool FixedTimeStringEquals(string a, string b)
        => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));

    private sealed record GoogleOAuthCookieState(string State, string CodeVerifier, string ReturnUrl);
}
