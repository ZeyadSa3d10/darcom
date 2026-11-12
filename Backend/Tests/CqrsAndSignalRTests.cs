using System.Security.Claims;
using API.Hubs;
using Application;
using Application.Behaviors;
using Application.Common;
using Application.DTOs;
using Application.Features.Admin.Commands;
using Application.Features.Admin.Queries;
using Application.Features.Bookings.Commands;
using Application.Features.Inquiries.Commands;
using Application.Features.Properties.Commands;
using Application.Features.Properties.Queries;
using Application.Features.ViewingRequests.Commands;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using Infrastructure.Notifications;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Stores;
using Infrastructure.Security;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public sealed class CqrsAndSignalRTests
{
    private sealed class CapturingNotifier : IAdminRealtimeNotifier
    {
        public List<(string EventType, string Title, string Message, int? EntityId, string? EntityType, string? EventKey)> Events { get; } = new();

        public Task NotifyAdminsAsync(
            string eventType,
            string title,
            string message,
            int? relatedEntityId = null,
            string? relatedEntityType = null,
            string? eventKey = null,
            CancellationToken ct = default)
        {
            Events.Add((eventType, title, message, relatedEntityId, relatedEntityType, eventKey));
            return Task.CompletedTask;
        }
    }

    private sealed class CapturingHubPublisher : IRealtimeHubPublisher
    {
        public bool ShouldThrow { get; set; }
        public List<AdminRealtimeNotification> Published { get; } = new();

        public Task PublishToAdminsAsync(AdminRealtimeNotification notification, CancellationToken ct = default)
        {
            if (ShouldThrow)
                throw new InvalidOperationException("Simulated SignalR transport failure");
            Published.Add(notification);
            return Task.CompletedTask;
        }
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = new();

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception)));

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }

    private sealed class NoopEmailSender : IEmailSender
    {
        public Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
            => Task.FromResult(true);
    }

    private sealed class NoopGoogleValidator : IGoogleTokenValidator
    {
        public Task<GoogleUserPayload?> ValidateAsync(string idToken, CancellationToken ct = default)
            => Task.FromResult<GoogleUserPayload?>(null);
    }

    private sealed class NoopPrivateStorage : IPrivateDocumentStorage
    {
        public Task<string> SavePrivateDocumentAsync(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default)
            => Task.FromResult($"{folder}/{fileName}");

        public Task<(Stream Stream, string ContentType)?> GetPrivateDocumentAsync(string relativePath, CancellationToken ct = default)
            => Task.FromResult<(Stream, string)?>(null);

        public Task DeletePrivateDocumentAsync(string relativePath, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class StubHubCallerContext : HubCallerContext
    {
        private readonly ClaimsPrincipal? _user;
        private readonly string _connectionId;

        public StubHubCallerContext(ClaimsPrincipal? user, string connectionId = "conn-1")
        {
            _user = user;
            _connectionId = connectionId;
        }

        public bool WasAborted { get; private set; }
        public override string ConnectionId => _connectionId;
        public override string? UserIdentifier => _user?.FindFirstValue(ClaimTypes.NameIdentifier);
        public override ClaimsPrincipal? User => _user;
        public override IDictionary<object, object?> Items { get; } = new Dictionary<object, object?>();
        public override IFeatureCollection Features { get; } = new FeatureCollection();
        public override CancellationToken ConnectionAborted => CancellationToken.None;
        public override void Abort() => WasAborted = true;
    }

    private sealed class StubGroupManager : IGroupManager
    {
        public List<(string ConnectionId, string Group)> Added { get; } = new();
        public List<(string ConnectionId, string Group)> Removed { get; } = new();

        public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
        {
            Added.Add((connectionId, groupName));
            return Task.CompletedTask;
        }

        public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
        {
            Removed.Add((connectionId, groupName));
            return Task.CompletedTask;
        }
    }

    private static ServiceProvider BuildCqrsContainer(bool useRealDispatcher = false)
    {
        var services = new ServiceCollection();
        var dbName = $"DarcomCqrs_{Guid.NewGuid():N}";

        services.AddLogging();
        services.AddMemoryCache();
        services.AddDbContext<DarcomDbContext>(o =>
            o.UseInMemoryDatabase(dbName)
             .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

        services.AddScoped<IPasswordHasher<User>, LegacyCompatiblePasswordHasher>();
        services.AddIdentityCore<User>(o =>
        {
            o.User.RequireUniqueEmail = true;
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
            o.Key = "TEST-ONLY-darcom-jwt-signing-key-32-chars-minimum!!";
            o.AccessTokenMinutes = 15;
            o.RefreshTokenDays = 7;
        });

        services.Configure<EmailOtpOptions>(o =>
        {
            o.ExpiryMinutes = 5;
            o.ResendCooldownSeconds = 60;
            o.MaxAttempts = 5;
            o.SecretPepper = "test-pepper";
        });

        services.AddSingleton<CapturingHubPublisher>();
        services.AddSingleton<IRealtimeHubPublisher>(sp => sp.GetRequiredService<CapturingHubPublisher>());

        if (useRealDispatcher)
        {
            services.AddScoped<IAdminRealtimeNotifier, AdminNotificationDispatcher>();
        }
        else
        {
            services.AddSingleton<CapturingNotifier>();
            services.AddSingleton<IAdminRealtimeNotifier>(sp => sp.GetRequiredService<CapturingNotifier>());
        }

        services.AddSingleton<IEmailSender, NoopEmailSender>();
        services.AddSingleton<IGoogleTokenValidator, NoopGoogleValidator>();
        services.AddSingleton<IPrivateDocumentStorage, NoopPrivateStorage>();

        services.AddScoped<IPropertyStore, PropertyStore>();
        services.AddScoped<IRequestStore, RequestStore>();
        services.AddScoped<IEngagementStore, EngagementStore>();
        services.AddScoped<IAuthStore, AuthStore>();
        services.AddScoped<IAdminStore, AdminStore>();
        services.AddScoped<IAuditWriter, AuditWriter>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IEmailOtpService, EmailOtpService>();

        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IRequestService, RequestService>();
        services.AddScoped<ISellerService, SellerService>();
        services.AddScoped<IInquiryService, InquiryService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<INotificationService, NotificationService>();

        services.AddApplicationLayer();

        var provider = services.BuildServiceProvider();
        SeedLookups(provider);
        return provider;
    }

    private static void SeedLookups(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();

        foreach (var roleName in new[] { "Admin", "Agent", "Seller", "Buyer", "Broker" })
            roleMgr.CreateAsync(new Role { Name = roleName }).GetAwaiter().GetResult();

        var city = new City { Id = 1, Name = "North Coast", Slug = "north-coast", Country = "Egypt" };
        db.Cities.Add(city);
        db.Locations.Add(new Location { Id = 1, CityId = 1, Name = "Sidi Abdel Rahman" });
        db.PropertyTypes.Add(new PropertyType { Id = 1, Name = "Chalet", Slug = "chalet" });
        var village = new Village { Id = 1, Name = "Marassi", NameAr = "مراسي", Slug = "marassi", IsActive = true };
        db.Villages.Add(village);
        db.Zones.Add(new Zone { Id = 1, VillageId = 1, Name = "Bay", NameAr = "باي", Slug = "bay", IsActive = true });
        db.SaveChanges();
    }

    private static async Task<(User Admin, User Buyer, User Broker)> SeedUsersAsync(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        var admin = new User
        {
            UserName = "admin@darcom.test",
            Email = "admin@darcom.test",
            FullName = "System Admin",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await userMgr.CreateAsync(admin, "Admin123!");
        await userMgr.AddToRoleAsync(admin, "Admin");

        var buyer = new User
        {
            UserName = "buyer@darcom.test",
            Email = "buyer@darcom.test",
            FullName = "Test Buyer",
            PhoneNumber = "+201001112233",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await userMgr.CreateAsync(buyer, "Buyer123!");
        await userMgr.AddToRoleAsync(buyer, "Buyer");

        var brokerUser = new User
        {
            UserName = "broker@darcom.test",
            Email = "broker@darcom.test",
            FullName = "Test Broker",
            PhoneNumber = "+201009998877",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await userMgr.CreateAsync(brokerUser, "Broker123!");
        await userMgr.AddToRoleAsync(brokerUser, "Broker");

        db.BrokerProfiles.Add(new BrokerProfile
        {
            UserId = brokerUser.Id,
            AgencyName = "Coast Brokers",
            Status = BrokerStatus.Pending,
            IsPhoneVerified = true
        });
        await db.SaveChangesAsync();

        return (admin, buyer, brokerUser);
    }

    [Fact]
    public async Task CreatePropertyCommand_Succeeds_And_Emits_Realtime_Notification()
    {
        using var sp = BuildCqrsContainer();
        var (admin, _, _) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var notifier = sp.GetRequiredService<CapturingNotifier>();

        var req = new CreatePropertyRequest
        {
            Title = "Luxury Sea View Chalet",
            PropertyTypeId = 1,
            Purpose = "Rent",
            Price = 12000m,
            VillageId = 1,
            ZoneId = 1,
            BuildingNumber = "B12",
            LocationId = 1,
            SeaView = true
        };

        var result = await mediator.Send(new CreatePropertyCommand(admin.Id, "Admin", req));

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Data);
        Assert.Single(notifier.Events);
        Assert.Equal("property.created", notifier.Events[0].EventType);
        Assert.Equal("Property", notifier.Events[0].EntityType);
        Assert.Equal(result.Data!.Id, notifier.Events[0].EntityId);
    }

    [Fact]
    public async Task CreatePropertyCommand_InvalidPayload_Rejected_Before_Handler_Without_Notification()
    {
        using var sp = BuildCqrsContainer();
        var (admin, _, _) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var notifier = sp.GetRequiredService<CapturingNotifier>();

        var invalidReq = new CreatePropertyRequest
        {
            Title = "", // invalid
            PropertyTypeId = 1,
            Purpose = "InvalidPurpose", // invalid
            Price = -100, // invalid
            VillageId = 0 // invalid
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            mediator.Send(new CreatePropertyCommand(admin.Id, "Admin", invalidReq)));

        Assert.Contains(ex.Errors, e => e.PropertyName == "Title");
        Assert.Empty(notifier.Events);
    }

    [Fact]
    public async Task GetPropertiesQuery_Rejects_Invalid_PriceRange_Via_ValidationBehavior()
    {
        using var sp = BuildCqrsContainer();
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var badQuery = new PropertyQuery { MinPrice = 500000m, MaxPrice = 100000m };

        await Assert.ThrowsAsync<ValidationException>(() =>
            mediator.Send(new GetPropertiesQuery(badQuery, false)));
    }

    [Fact]
    public async Task GetPropertiesQuery_Valid_Returns_Paginated_Results()
    {
        using var sp = BuildCqrsContainer();
        var (admin, _, _) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        await mediator.Send(new CreatePropertyCommand(admin.Id, "Admin", new CreatePropertyRequest
        {
            Title = "Marassi Villa One",
            PropertyTypeId = 1,
            Purpose = "Sale",
            Price = 9500000m,
            VillageId = 1,
            LocationId = 1
        }));

        var list = await mediator.Send(new GetPropertiesQuery(new PropertyQuery { Purpose = "Sale" }, true));

        Assert.True(list.Succeeded);
        Assert.Single(list.Data!.Data);
    }

    [Fact]
    public async Task PerformanceBehavior_Flags_Slow_Request_Over_500ms()
    {
        var logger = new CapturingLogger<PerformanceBehavior<GetAdminDashboardQuery, ServiceResult<DashboardDto>>>();
        var behavior = new PerformanceBehavior<GetAdminDashboardQuery, ServiceResult<DashboardDto>>(logger);

        await behavior.Handle(new GetAdminDashboardQuery(), async () =>
        {
            await Task.Delay(550);
            return ServiceResult<DashboardDto>.Ok(
                new DashboardDto(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        }, CancellationToken.None);

        Assert.Contains(logger.Entries, e => e.Level == LogLevel.Warning && e.Message.Contains("Long-running request"));
    }

    [Fact]
    public async Task BookingConfirmation_Prevents_Overlaps_And_DoesNot_Notify_On_Failure()
    {
        using var sp = BuildCqrsContainer();
        var (admin, buyer, _) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var notifier = sp.GetRequiredService<CapturingNotifier>();

        // 1. Create a Published rental property
        var propRes = await mediator.Send(new CreatePropertyCommand(admin.Id, "Admin", new CreatePropertyRequest
        {
            Title = "Summer Rental Chalet",
            PropertyTypeId = 1,
            Purpose = "Rent",
            Price = 7500m,
            VillageId = 1,
            LocationId = 1
        }));
        var propertyId = propRes.Data!.Id;
        await mediator.Send(new UpdatePropertyCommand(admin.Id, true, propertyId, new UpdatePropertyRequest
        {
            Status = "Published"
        }));

        var start1 = DateTime.UtcNow.Date.AddDays(10);
        var end1 = DateTime.UtcNow.Date.AddDays(15);

        // 2. First booking request succeeds & notifies
        var b1 = await mediator.Send(new CreateBookingRequestCommand(buyer.Id, new CreateBookingRequest(
            propertyId, "Buyer One", "buyer@darcom.test", "+201001112233", start1, null, null, end1)));
        Assert.True(b1.Succeeded);

        // Move booking 1 UnderReview -> Approved (creates RentalPeriod & emits booking.confirmed)
        await mediator.Send(new UpdateBookingStatusCommand(admin.Id, b1.Data!.Id,
            new UpdateRequestStatusRequest("UnderReview", null), null));
        var confirm1 = await mediator.Send(new UpdateBookingStatusCommand(admin.Id, b1.Data!.Id,
            new UpdateRequestStatusRequest("Approved", null), null));
        Assert.True(confirm1.Succeeded);

        // 3. Second booking for overlapping dates by another buyer
        int buyer2Id;
        using (var userScope = sp.CreateScope())
        {
            var userMgr = userScope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var b2User = new User
            {
                UserName = "buyer2@darcom.test",
                Email = "buyer2@darcom.test",
                FullName = "Second Buyer",
                EmailConfirmed = true,
                IsActive = true
            };
            await userMgr.CreateAsync(b2User, "Buyer123!");
            await userMgr.AddToRoleAsync(b2User, "Buyer");
            buyer2Id = b2User.Id;
        }

        notifier.Events.Clear();

        var overlapEx = await Assert.ThrowsAsync<RequestFailure>(() =>
            mediator.Send(new CreateBookingRequestCommand(buyer2Id, new CreateBookingRequest(
                propertyId, "Second Buyer", "buyer2@darcom.test", "+201004445566",
                start1.AddDays(1), null, null, end1.AddDays(1)))));

        // Overlap must fail cleanly and NEVER emit a notification
        Assert.Equal(409, overlapEx.StatusCode);
        Assert.Empty(notifier.Events);
    }

    [Fact]
    public async Task Inquiries_ListingRequests_Requirements_And_Brokers_Emit_Domain_Notifications()
    {
        using var sp = BuildCqrsContainer();
        var (admin, buyer, brokerUser) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var notifier = sp.GetRequiredService<CapturingNotifier>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        var propRes = await mediator.Send(new CreatePropertyCommand(admin.Id, "Admin", new CreatePropertyRequest
        {
            Title = "Bay Front Villa",
            PropertyTypeId = 1,
            Purpose = "Sale",
            Price = 22000000m,
            VillageId = 1,
            LocationId = 1
        }));
        var propId = propRes.Data!.Id;
        notifier.Events.Clear();

        // Inquiry
        var inq = await mediator.Send(new CreateInquiryCommand(propId, buyer.Id,
            new CreateInquiryRequest("Test Buyer", "buyer@darcom.test", "+201001112233", "Interested in viewing")));
        Assert.True(inq.Succeeded);

        // Listing Request
        var listing = await mediator.Send(new CreatePropertyListingRequestCommand(buyer.Id,
            new CreatePropertyListingRequest(1, 1, "B9", "U102", "+201001112233")));
        Assert.True(listing.Succeeded);

        // Viewing / Requirement Lead
        var reqLead = await mediator.Send(new CreateRequirementCommand(buyer.Id,
            new CreatePropertyRequirementRequest("Test Buyer", "buyer@darcom.test", "+201001112233", "Sale",
                1, 1, 1, 1000000m, 5000000m, 3, null, null, null, "Need garden")));
        Assert.True(reqLead.Succeeded);

        // Broker approval
        var brokerProfile = await db.BrokerProfiles.FirstAsync(b => b.UserId == brokerUser.Id);
        var brokerApprove = await mediator.Send(new SetBrokerStatusCommand(admin.Id, brokerProfile.Id,
            new SetBrokerStatusRequest("Approved", "Verified")));
        Assert.True(brokerApprove.Succeeded);

        var types = notifier.Events.Select(e => e.EventType).ToList();
        Assert.Contains("inquiry.created", types);
        Assert.Contains("property.listing-request.created", types);
        Assert.Contains("viewing.request.created", types);
        Assert.Contains("broker.status.changed", types);
    }

    [Fact]
    public async Task AuthService_Registrations_Notify_Admins_When_User_Or_Broker_Registers()
    {
        using var sp = BuildCqrsContainer();
        await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var notifier = sp.GetRequiredService<CapturingNotifier>();

        var userReg = await auth.RegisterAsync(new RegisterRequest(
            "New Buyer", "newbuyer@darcom.test", "StrongPass1!", "+201005556677"));
        Assert.True(userReg.Succeeded);

        Assert.Contains(notifier.Events, e => e.EventType == "user.registered");
    }

    [Fact]
    public async Task Dispatcher_Persists_Notifications_Before_SignalR_And_Deduplicates_By_EventKey()
    {
        using var sp = BuildCqrsContainer(useRealDispatcher: true);
        var (admin, _, _) = await SeedUsersAsync(sp);
        using var scope = sp.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IAdminRealtimeNotifier>();
        var publisher = sp.GetRequiredService<CapturingHubPublisher>();
        var notifService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        // Simulate hub publisher failure -> DB row must still persist cleanly!
        publisher.ShouldThrow = true;

        await dispatcher.NotifyAdminsAsync(
            "booking.created",
            "New Booking",
            "Booking REQ-001 created",
            relatedEntityId: 42,
            relatedEntityType: "BookingRequest",
            eventKey: "booking:created:42");

        // Second call with identical eventKey must be deduplicated cleanly
        publisher.ShouldThrow = false;
        await dispatcher.NotifyAdminsAsync(
            "booking.created",
            "New Booking",
            "Booking REQ-001 created",
            relatedEntityId: 42,
            relatedEntityType: "BookingRequest",
            eventKey: "booking:created:42");

        var saved = await db.Notifications.Where(n => n.UserId == admin.Id && n.EventKey == "booking:created:42").ToListAsync();
        Assert.Single(saved);
        Assert.Equal("booking.created", saved[0].Type);
        Assert.Equal(42, saved[0].RelatedEntityId);
        Assert.Equal("BookingRequest", saved[0].RelatedEntityType);

        // Distinct EventKey persists and broadcasts over hub publisher
        await dispatcher.NotifyAdminsAsync(
            "booking.confirmed",
            "Booking Confirmed",
            "Booking REQ-001 approved",
            relatedEntityId: 42,
            relatedEntityType: "BookingRequest",
            eventKey: "booking:confirmed:42");

        Assert.Single(publisher.Published);
        Assert.Equal("booking.confirmed", publisher.Published[0].EventType);

        // Mark Read populates ReadAt and decrements unread count
        var unreadBefore = await notifService.UnreadCountAsync(admin.Id);
        Assert.Equal(2, unreadBefore.Data);

        await notifService.MarkReadAsync(admin.Id, saved[0].Id);
        var updatedRow = await db.Notifications.AsNoTracking().FirstAsync(n => n.Id == saved[0].Id);
        Assert.True(updatedRow.IsRead);
        Assert.NotNull(updatedRow.ReadAt);

        var unreadAfterOne = await notifService.UnreadCountAsync(admin.Id);
        Assert.Equal(1, unreadAfterOne.Data);

        await notifService.MarkAllReadAsync(admin.Id);
        var unreadAfterAll = await notifService.UnreadCountAsync(admin.Id);
        Assert.Equal(0, unreadAfterAll.Data);
    }

    [Fact]
    public async Task AdminNotificationHub_Requires_Admin_Role_And_Manages_Admins_Group()
    {
        // 1. Attribute verification: Hub strictly protected with [Authorize(Roles = "Admin")]
        var authAttr = typeof(AdminNotificationHub)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        Assert.NotNull(authAttr);
        Assert.Equal("Admin", authAttr!.Roles);

        // 2. Verified Admin joins "Admins" group and cleans up on disconnect
        var groups = new StubGroupManager();
        var adminPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "7"),
            new Claim(ClaimTypes.Role, "Admin")
        }, "Bearer"));
        var adminContext = new StubHubCallerContext(adminPrincipal, "conn-admin-1");

        var hub = new AdminNotificationHub(NullLogger<AdminNotificationHub>.Instance)
        {
            Context = adminContext,
            Groups = groups
        };

        await hub.OnConnectedAsync();
        Assert.False(adminContext.WasAborted);
        Assert.Contains(groups.Added, x => x.ConnectionId == "conn-admin-1" && x.Group == AdminNotificationHub.AdminsGroup);

        await hub.OnDisconnectedAsync(null);
        Assert.Contains(groups.Removed, x => x.ConnectionId == "conn-admin-1" && x.Group == AdminNotificationHub.AdminsGroup);

        // 3. Non-Admin connection is aborted cleanly even if invoked directly
        var buyerGroups = new StubGroupManager();
        var buyerPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "99"),
            new Claim(ClaimTypes.Role, "Buyer")
        }, "Bearer"));
        var buyerContext = new StubHubCallerContext(buyerPrincipal, "conn-buyer-1");

        var buyerHub = new AdminNotificationHub(NullLogger<AdminNotificationHub>.Instance)
        {
            Context = buyerContext,
            Groups = buyerGroups
        };

        await buyerHub.OnConnectedAsync();
        Assert.True(buyerContext.WasAborted);
        Assert.Empty(buyerGroups.Added);
    }
}

