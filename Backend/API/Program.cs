using System.Text;
using System.Threading.RateLimiting;
using API.Hubs;
using API.Middleware;
using API.Security;
using Application;
using Application.BackgroundJobs;
using Hangfire;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Application.Validators;
using Domain.Entities;
using FluentValidation;
using Infrastructure.BackgroundJobs;
using Infrastructure.Notifications;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Seed;
using Infrastructure.Persistence.Stores;
using Infrastructure.Security;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Controllers (kept thin — business logic lives in Application/Infrastructure).
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddDataProtection();

// SQL Server via EF Core. Connection string from configuration (never hard-coded).
builder.Services.AddDbContext<DarcomDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ASP.NET Core Identity configured with custom User/Role (int PKs preserving existing Users/Roles tables)
// and legacy PBKDF2 hash compatibility for smooth password upgrade.
builder.Services.AddScoped<IPasswordHasher<User>, LegacyCompatiblePasswordHasher>();
builder.Services.AddIdentityCore<User>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
})
.AddRoles<Role>()
.AddEntityFrameworkStores<DarcomDbContext>()
.AddSignInManager<SignInManager<User>>()
.AddDefaultTokenProviders();

// Auth / OTP / SMTP / Google options (bound from configuration / env / user-secrets).
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<EmailOtpOptions>(builder.Configuration.GetSection(EmailOtpOptions.Section));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.Section));
builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.Section));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPropertyService, PropertyService>();
builder.Services.AddScoped<IFavoriteService, FavoriteService>();
builder.Services.AddScoped<IRequestService, RequestService>();
builder.Services.AddScoped<ISellerService, SellerService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IInquiryService, InquiryService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IAuthStore, AuthStore>();
builder.Services.AddScoped<IPropertyStore, PropertyStore>();
builder.Services.AddScoped<IRequestStore, RequestStore>();
builder.Services.AddScoped<IEngagementStore, EngagementStore>();
builder.Services.AddScoped<IAdminStore, AdminStore>();
builder.Services.AddScoped<IAuditWriter, AuditWriter>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IEmailOtpService, EmailOtpService>();
builder.Services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
builder.Services.AddHttpClient<IGoogleOAuthService, GoogleOAuthService>();

// MediatR + CQRS + FluentValidation Pipeline + SignalR Real-Time Admin Notifications
builder.Services.AddApplicationLayer();
builder.Services.AddHangfireInfrastructure(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddScoped<IAdminRealtimeNotifier, AdminNotificationDispatcher>();
builder.Services.AddScoped<IRealtimeHubPublisher, SignalRAdminHubPublisher>();
builder.Services.AddSingleton<IPrivateDocumentStorage>(_ =>
    new PrivateDocumentStorage(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "private-documents")));
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<ISiteContentStore, SiteContentStore>();

// Object storage (website.md #22). Swapping Local → Cloudinary/S3/Azure is a
// Storage:Provider config change plus a new IStorageProvider class — no business-logic rewrite.
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.Section));
builder.Services.PostConfigure<StorageOptions>(o =>
{
    if (!Path.IsPathRooted(o.LocalPath))
        o.LocalPath = Path.Combine(builder.Environment.ContentRootPath, o.LocalPath);
});
builder.Services.AddSingleton<IStorageProvider>(sp =>
{
    var provider = builder.Configuration.GetValue("Storage:Provider", "Local");
    return provider switch
    {
        "Local" => new LocalStorageProvider(
            sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<StorageOptions>>()),
        _ => throw new InvalidOperationException(
            $"Unknown Storage:Provider '{provider}'. Supported: Local (add Cloudinary/S3/Azure classes to use them).")
    };
});

// Validators and MediatR handlers/behaviors are registered via AddApplicationLayer().

// Swagger / OpenAPI with JWT Bearer support.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Darcom API", Version = "v1" });
    var bearerScheme = new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    };
    c.AddSecurityDefinition("Bearer", bearerScheme);
    c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer")] = new List<string>()
    });
});

// CORS — origins come from configuration, never hard-coded.
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// Rate limiting for auth, OTP, and public submission endpoints.
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 20;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueLimit = 0;
    });
    options.AddPolicy("otp", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0
        });
    });
    options.AddFixedWindowLimiter("submit", o =>
    {
        o.PermitLimit = 15;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueLimit = 0;
    });
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "تم إرسال طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة لاحقاً.",
            errors = Array.Empty<object>()
        }, ct);
    };
});

// JWT Bearer Authentication
var jwtKey = builder.Configuration["JWT:Key"];
if (builder.Environment.IsProduction() && string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT:Key is not configured. Set it via environment variables or user-secrets — never commit secrets.");
}
if (!string.IsNullOrWhiteSpace(jwtKey))
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidIssuer = builder.Configuration["JWT:Issuer"],
            ValidAudience = builder.Configuration["JWT:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
}

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // HTTPS is terminated at the VPS reverse proxy (Nginx) — HSTS only,
    // no in-app HTTPS redirection to avoid proxy redirect loops.
    app.UseHsts();
}

app.UseCors("Frontend");
app.UseRateLimiter();

// Local-dev object storage served at /uploads (prod: CDN / cloud URLs instead).
var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

var hangfireOpts = app.Configuration.GetSection(HangfireOptions.Section).Get<HangfireOptions>() ?? new HangfireOptions();
if (hangfireOpts.Enabled && hangfireOpts.EnableDashboard)
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        DashboardTitle = "Darcom Background Jobs",
        DisplayStorageConnectionString = false,
        Authorization = [new HangfireAdminDashboardAuthorizationFilter()],
        IsReadOnlyFunc = _ => hangfireOpts.ReadOnlyDashboardInProduction && !app.Environment.IsDevelopment()
    });
}

app.MapControllers();
app.MapHub<AdminNotificationHub>("/hubs/admin-notifications");

// PHASE-01 seed (migrate + seed lookups/admin/demo data when enabled).
if (builder.Configuration.GetValue("SeedOnStartup", false))
{
    try
    {
        await DataSeeder.SeedAsync(app.Services, builder.Configuration,
            app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Seeder"));
    }
    catch (Exception ex)
    {
        app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Seeder")
            .LogError(ex, "Database seeding failed.");
    }
}

app.Run();
