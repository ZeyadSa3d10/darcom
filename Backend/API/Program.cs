using System.Text;
using System.Threading.RateLimiting;
using API.Middleware;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Application.Validators;
using FluentValidation;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Seed;
using Infrastructure.Persistence.Stores;
using Infrastructure.Security;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Controllers (kept thin — business logic lives in Application/Infrastructure).
builder.Services.AddControllers();

// SQL Server via EF Core. Connection string from configuration (never hard-coded).
builder.Services.AddDbContext<DarcomDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// JWT options (bound from configuration) + auth services.
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
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
builder.Services.AddScoped<IPasswordHasher, PasswordHasherService>();

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

// FluentValidation validators (validated manually in ApiBaseController for a consistent envelope).
builder.Services.AddValidatorsFromAssemblyContaining<RegisterValidator>();

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

// Rate limiting for auth endpoints (website.md #29).
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 20;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueLimit = 0;
    });
    options.OnRejected = (context, _) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        return ValueTask.CompletedTask;
    };
});

// JWT skeleton — real AuthService/token logic lands in PHASE-02.
var jwtKey = builder.Configuration["JWT:Key"];
if (builder.Environment.IsProduction() && string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT:Key is not configured. Set it via environment variables or user-secrets — never commit secrets.");
}
if (!string.IsNullOrWhiteSpace(jwtKey))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o =>
        {
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["JWT:Issuer"],
                ValidAudience = builder.Configuration["JWT:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
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
app.MapControllers();

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
