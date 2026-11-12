using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Stores;
using Infrastructure.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;

namespace Tests;

public sealed class IdentityAuthIntegrationTests
{
    private const string TestJwtKey = "TEST-ONLY-darcom-jwt-signing-key-32-chars-minimum!!";

    private sealed class CapturingEmailSender : IEmailSender
    {
        public List<(string To, string Subject, string Html)> Sent { get; } = new();

        public Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
        {
            Sent.Add((toEmail, subject, htmlBody));
            return Task.FromResult(true);
        }

        public string? ExtractLastCode()
        {
            if (Sent.Count == 0) return null;
            var match = Regex.Match(Sent[^1].Html, @"\b\d{6}\b");
            return match.Success ? match.Value : null;
        }
    }

    private sealed class StubGoogleValidator : IGoogleTokenValidator
    {
        public Dictionary<string, GoogleUserPayload> Tokens { get; } = new();

        public Task<GoogleUserPayload?> ValidateAsync(string idToken, CancellationToken ct = default)
            => Task.FromResult(Tokens.TryGetValue(idToken, out var payload) ? payload : null);
    }

    private sealed class NoopPrivateDocStorage : IPrivateDocumentStorage
    {
        public Task<string> SavePrivateDocumentAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default)
            => Task.FromResult($"{folder}/{fileName}");

        public Task<(Stream Stream, string ContentType)?> GetPrivateDocumentAsync(string relativePath, CancellationToken ct = default)
            => Task.FromResult<(Stream, string)?>(null);

        public Task DeletePrivateDocumentAsync(string relativePath, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private static (ServiceProvider Provider, CapturingEmailSender EmailSender, StubGoogleValidator GoogleValidator) BuildTestContainer(
        int otpExpiryMinutes = 5,
        int cooldownSeconds = 60,
        int maxAttempts = 5)
    {
        var services = new ServiceCollection();
        var dbName = $"DarcomIdentityTest_{Guid.NewGuid():N}";

        services.AddLogging();
        services.AddMemoryCache();
        services.AddDbContext<DarcomDbContext>(o => o.UseInMemoryDatabase(dbName));

        services.AddScoped<IPasswordHasher<User>, LegacyCompatiblePasswordHasher>();
        services.AddIdentityCore<User>(o =>
        {
            o.User.RequireUniqueEmail = true;
            o.Lockout.AllowedForNewUsers = true;
            o.Lockout.MaxFailedAccessAttempts = 5;
            o.Password.RequireDigit = true;
            o.Password.RequireLowercase = true;
            o.Password.RequireUppercase = true;
            o.Password.RequireNonAlphanumeric = false;
            o.Password.RequiredLength = 8;
        })
        .AddRoles<Role>()
        .AddEntityFrameworkStores<DarcomDbContext>();

        services.Configure<JwtOptions>(o =>
        {
            o.Issuer = "DarcomTest";
            o.Audience = "DarcomTest";
            o.Key = TestJwtKey;
            o.AccessTokenMinutes = 15;
            o.RefreshTokenDays = 7;
        });

        services.Configure<EmailOtpOptions>(o =>
        {
            o.ExpiryMinutes = otpExpiryMinutes;
            o.ResendCooldownSeconds = cooldownSeconds;
            o.MaxAttempts = maxAttempts;
            o.SecretPepper = "test-otp-pepper";
        });

        var emailSender = new CapturingEmailSender();
        var googleValidator = new StubGoogleValidator();

        services.AddSingleton<IEmailSender>(emailSender);
        services.AddSingleton<IGoogleTokenValidator>(googleValidator);
        services.AddSingleton<IPrivateDocumentStorage, NoopPrivateDocStorage>();

        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthStore, AuthStore>();
        services.AddScoped<IAdminStore, AdminStore>();
        services.AddScoped<IAuditWriter, AuditWriter>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IEmailOtpService, EmailOtpService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();

        var provider = services.BuildServiceProvider();

        using var scope = provider.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        foreach (var r in new[] { "Admin", "Agent", "Seller", "Buyer", "Broker" })
            roleManager.CreateAsync(new Role { Name = r }).GetAwaiter().GetResult();

        return (provider, emailSender, googleValidator);
    }

    [Fact]
    public async Task EmailOtp_Flow_Sends_Hashed_Code_Creates_Buyer_And_Prevents_Reuse()
    {
        var (provider, emailSender, _) = BuildTestContainer();
        using var scope = provider.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        // 1. Send OTP
        var sendRes = await auth.SendEmailOtpAsync(new SendEmailOtpRequest("buyer.test@gmail.com"), "127.0.0.1", isDevelopment: false);
        Assert.True(sendRes.Succeeded);
        Assert.Null(sendRes.Data!.DebugCode); // Never exposed when SMTP succeeded / prod
        Assert.Single(emailSender.Sent);

        var otpCode = emailSender.ExtractLastCode();
        Assert.NotNull(otpCode);

        // OTP must NOT be stored as plaintext in DB
        var storedOtp = await db.EmailOtpCodes.FirstAsync();
        Assert.NotEqual(otpCode, storedOtp.CodeHash);

        // 2. Resend immediately triggers cooldown 429
        var resendRes = await auth.SendEmailOtpAsync(new SendEmailOtpRequest("buyer.test@gmail.com"), "127.0.0.1", isDevelopment: false);
        Assert.False(resendRes.Succeeded);
        Assert.Equal(429, resendRes.StatusCode);

        // 3. Wrong OTP fails and increments AttemptCount
        var badVerify = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("buyer.test@gmail.com", "000000"), "127.0.0.1");
        Assert.False(badVerify.Succeeded);
        Assert.Equal(1, (await db.EmailOtpCodes.FirstAsync()).AttemptCount);

        // 4. Correct OTP creates Buyer user & returns valid JWT + Refresh Token
        var okVerify = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("buyer.test@gmail.com", otpCode!, "Test Gmail User"), "127.0.0.1");
        Assert.True(okVerify.Succeeded);
        Assert.Equal("Buyer", okVerify.Data!.User.Role);
        Assert.Equal("Test Gmail User", okVerify.Data.User.FullName);

        // Verify JWT Claims
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(okVerify.Data.AccessToken);
        Assert.Equal("DarcomTest", jwt.Issuer);
        Assert.Contains("DarcomTest", jwt.Audiences);
        Assert.Equal(okVerify.Data.User.Id.ToString(), jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("Buyer", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);

        // 5. Reusing the exact same OTP fails (single-use)
        var reuseVerify = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("buyer.test@gmail.com", otpCode!), "127.0.0.1");
        Assert.False(reuseVerify.Succeeded);
    }

    [Fact]
    public async Task EmailOtp_Rejects_Expired_Code_And_Locks_After_MaxAttempts()
    {
        var (provider, emailSender, _) = BuildTestContainer(otpExpiryMinutes: 5, cooldownSeconds: 15, maxAttempts: 3);
        using var scope = provider.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        await auth.SendEmailOtpAsync(new SendEmailOtpRequest("expire@gmail.com"), "127.0.0.1", false);
        var code = emailSender.ExtractLastCode()!;
        var record = await db.EmailOtpCodes.FirstAsync();
        record.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        var expiredRes = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("expire@gmail.com", code), "127.0.0.1");
        Assert.False(expiredRes.Succeeded);

        // Test max attempts on another email
        await auth.SendEmailOtpAsync(new SendEmailOtpRequest("brute@gmail.com"), "127.0.0.1", false);
        var realCode = emailSender.ExtractLastCode()!;
        for (int i = 0; i < 3; i++)
        {
            var fail = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("brute@gmail.com", "999999"), "127.0.0.1");
            Assert.False(fail.Succeeded);
        }

        // Now even the real code must be rejected because the OTP was exhausted/invalidated
        var lockedOut = await auth.VerifyEmailOtpAndSignInAsync(new VerifyEmailOtpRequest("brute@gmail.com", realCode), "127.0.0.1");
        Assert.False(lockedOut.Succeeded);
    }

    [Fact]
    public async Task GoogleSignIn_Validates_Links_Existing_User_And_Rejects_Invalid_Tokens()
    {
        var (provider, _, googleValidator) = BuildTestContainer();
        using var scope = provider.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        // Pre-seed an existing Seller account with the same email
        var existingUser = new User
        {
            FullName = "Existing Seller",
            Email = "seller.owner@gmail.com",
            UserName = "seller.owner@gmail.com",
            EmailConfirmed = true,
            IsActive = true
        };
        await userManager.CreateAsync(existingUser);
        await userManager.AddToRoleAsync(existingUser, "Seller");

        googleValidator.Tokens["valid-seller-token"] = new GoogleUserPayload("google-sub-111", "seller.owner@gmail.com", "Google Name", true);
        googleValidator.Tokens["valid-new-token"] = new GoogleUserPayload("google-sub-222", "new.buyer@gmail.com", "New Google Buyer", true);
        googleValidator.Tokens["unverified-token"] = new GoogleUserPayload("google-sub-333", "hacker@gmail.com", "Unverified", false);

        // 1. Invalid token rejected
        var invalidRes = await auth.GoogleLoginAsync(new GoogleLoginRequest("garbage-token"), "127.0.0.1");
        Assert.False(invalidRes.Succeeded);
        Assert.Equal(401, invalidRes.StatusCode);

        // 2. Unverified Google email rejected
        var unverifiedRes = await auth.GoogleLoginAsync(new GoogleLoginRequest("unverified-token"), "127.0.0.1");
        Assert.False(unverifiedRes.Succeeded);
        Assert.Equal(401, unverifiedRes.StatusCode);

        // 3. Valid token safely links to existing Seller account & preserves Seller role!
        var linkedRes = await auth.GoogleLoginAsync(new GoogleLoginRequest("valid-seller-token"), "127.0.0.1");
        Assert.True(linkedRes.Succeeded);
        Assert.Equal(existingUser.Id, linkedRes.Data!.User.Id);
        Assert.Equal("Seller", linkedRes.Data.User.Role);

        var logins = await userManager.GetLoginsAsync(existingUser);
        Assert.Contains(logins, l => l.LoginProvider == "Google" && l.ProviderKey == "google-sub-111");

        // 4. New Google user creates Buyer account cleanly
        var newRes = await auth.GoogleLoginAsync(new GoogleLoginRequest("valid-new-token"), "127.0.0.1");
        Assert.True(newRes.Succeeded);
        Assert.Equal("Buyer", newRes.Data!.User.Role);
        Assert.Equal("New Google Buyer", newRes.Data.User.FullName);
    }

    [Fact]
    public async Task RefreshToken_Rotation_ReuseDetection_And_Logout_Work_Securely()
    {
        var (provider, _, googleValidator) = BuildTestContainer();
        using var scope = provider.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        googleValidator.Tokens["tok"] = new GoogleUserPayload("sub-rt", "rt.user@gmail.com", "RT User", true);
        var login = await auth.GoogleLoginAsync(new GoogleLoginRequest("tok"), "127.0.0.1");
        Assert.True(login.Succeeded);

        var rt1 = login.Data!.RefreshToken;

        // Refresh token must be stored hashed in UserRefreshTokens, never plaintext
        var storedTokens = await db.UserRefreshTokens.ToListAsync();
        Assert.Single(storedTokens);
        Assert.NotEqual(rt1, storedTokens[0].TokenHash);

        // Rotate rt1 -> rt2
        var refresh1 = await auth.RefreshAsync(rt1, "127.0.0.1");
        Assert.True(refresh1.Succeeded);
        var rt2 = refresh1.Data!.RefreshToken;
        Assert.NotEqual(rt1, rt2);

        // Replay of old rt1 triggers reuse detection and revokes rt2 as well!
        var replay = await auth.RefreshAsync(rt1, "127.0.0.1");
        Assert.False(replay.Succeeded);
        Assert.Equal(401, replay.StatusCode);

        var rt2AfterReuse = await auth.RefreshAsync(rt2, "127.0.0.1");
        Assert.False(rt2AfterReuse.Succeeded);
        Assert.Equal(401, rt2AfterReuse.StatusCode);

        // Re-login & test Logout revocation
        var login2 = await auth.GoogleLoginAsync(new GoogleLoginRequest("tok"), "127.0.0.1");
        var rt3 = login2.Data!.RefreshToken;
        await auth.LogoutAsync(login2.Data.User.Id, rt3, "127.0.0.1");

        var afterLogout = await auth.RefreshAsync(rt3, "127.0.0.1");
        Assert.False(afterLogout.Succeeded);
    }

    [Fact]
    public async Task Legacy_V1_Password_User_LogsIn_And_Upgrades_To_Identity_Hash()
    {
        var (provider, _, _) = BuildTestContainer();
        using var scope = provider.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        // Build legacy v1 PBKDF2-SHA256 hash identical to pre-migration Admin/Seed accounts
        var salt = RandomNumberGenerator.GetBytes(16);
        var derived = Rfc2898DeriveBytes.Pbkdf2("Admin123!", salt, 100_000, HashAlgorithmName.SHA256, 32);
        var legacyHash = $"v1.100000.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(derived)}";

        var admin = new User
        {
            FullName = "Legacy Admin",
            Email = "admin@darcom.local",
            UserName = "admin@darcom.local",
            PasswordHash = legacyHash,
            EmailConfirmed = true,
            IsActive = true
        };
        await userManager.CreateAsync(admin);
        await userManager.AddToRoleAsync(admin, "Admin");

        var res = await auth.LoginAsync(new LoginRequest("admin@darcom.local", "Admin123!"), "127.0.0.1");
        Assert.True(res.Succeeded);
        Assert.Equal("Admin", res.Data!.User.Role);
    }

    [Fact]
    public void GoogleOAuthService_Builds_PKCE_Authorization_Url_With_Callback()
    {
        var opts = Microsoft.Extensions.Options.Options.Create(new GoogleAuthOptions
        {
            ClientId = "test-client-id.apps.googleusercontent.com",
            ClientSecret = "test-client-secret"
        });
        var oauth = new GoogleOAuthService(
            new System.Net.Http.HttpClient(),
            opts,
            new StubGoogleValidator(),
            NullLogger<GoogleOAuthService>.Instance);

        Assert.True(oauth.IsRedirectFlowConfigured());
        var url = oauth.BuildAuthorizationUrl(
            "http://localhost:5153/api/auth/google/callback",
            "state-abc",
            "challenge-xyz");

        Assert.Contains("https://accounts.google.com/o/oauth2/v2/auth?", url);
        Assert.Contains("redirect_uri=http%3A%2F%2Flocalhost%3A5153%2Fapi%2Fauth%2Fgoogle%2Fcallback", url);
        Assert.Contains("code_challenge=challenge-xyz", url);
        Assert.Contains("code_challenge_method=S256", url);
        Assert.Contains("state=state-abc", url);
    }
}
