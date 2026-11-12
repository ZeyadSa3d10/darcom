using System.Linq.Expressions;
using System.Security.Claims;
using API.Security;
using Application.BackgroundJobs;
using Application.DTOs;
using Application.Features.Bookings.Commands;
using Application.Features.ViewingRequests.Commands;
using Application.Security;
using Application.Services;
using Application.Storage;
using Application.Stores;
using Domain.Entities;
using Domain.Enums;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.Storage;
using Infrastructure.BackgroundJobs;
using Infrastructure.Notifications;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Stores;
using Infrastructure.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace Tests;

public sealed class HangfireJobsTests
{
    private sealed class CapturingEmailSender : IEmailSender
    {
        public bool ShouldFail { get; set; }
        public bool ReturnFalse { get; set; }
        public List<(string To, string Subject, string Html)> Sent { get; } = new();

        public Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
        {
            if (ShouldFail)
                throw new InvalidOperationException("SMTP connection timed out.");
            if (ReturnFalse)
                return Task.FromResult(false);
            Sent.Add((toEmail, subject, htmlBody));
            return Task.FromResult(true);
        }
    }

    private sealed class CapturingBackgroundJobService : IBackgroundJobService
    {
        private int _seq;
        public List<(string JobId, string Queue, LambdaExpression Call, DateTimeOffset? EnqueueAt)> Created { get; } = new();
        public List<string> DeletedJobIds { get; } = new();

        public string Enqueue<TJob>(Expression<Func<TJob, Task>> methodCall, string queue = "default")
        {
            var id = $"hf-{Interlocked.Increment(ref _seq)}";
            Created.Add((id, queue, methodCall, null));
            return id;
        }

        public string Schedule<TJob>(Expression<Func<TJob, Task>> methodCall, DateTimeOffset enqueueAt, string queue = "default")
        {
            var id = $"hf-{Interlocked.Increment(ref _seq)}";
            Created.Add((id, queue, methodCall, enqueueAt));
            return id;
        }

        public bool Delete(string jobId)
        {
            DeletedJobIds.Add(jobId);
            return true;
        }

        public void AddOrUpdateRecurring<TJob>(
            string recurringJobId,
            Expression<Func<TJob, Task>> methodCall,
            string cronExpression,
            string queue = "maintenance",
            string? timeZoneId = null)
        { }
    }

    private sealed class CapturingHubPublisher : IRealtimeHubPublisher
    {
        public List<AdminRealtimeNotification> Published { get; } = new();

        public Task PublishToAdminsAsync(AdminRealtimeNotification notification, CancellationToken ct = default)
        {
            Published.Add(notification);
            return Task.CompletedTask;
        }
    }

    private sealed class StubJobStorage : JobStorage
    {
        public override IMonitoringApi GetMonitoringApi() => throw new NotSupportedException();
        public override IStorageConnection GetConnection() => throw new NotSupportedException();
    }

    private static (ServiceProvider Provider, CapturingEmailSender EmailSender, CapturingBackgroundJobService BgJobs, CapturingHubPublisher Hub)
        BuildHangfireTestContainer(HangfireOptions? hangfireOpts = null, string? uploadsPath = null)
    {
        var services = new ServiceCollection();
        var dbName = $"DarcomHangfire_{Guid.NewGuid():N}";
        var opts = hangfireOpts ?? new HangfireOptions { Enabled = true };

        services.AddLogging();
        services.AddMemoryCache();
        services.AddDataProtection();
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
        });
        services.Configure<EmailOtpOptions>(o =>
        {
            o.ExpiryMinutes = 10;
            o.ResendCooldownSeconds = 15;
            o.MaxAttempts = 5;
            o.SecretPepper = "test-otp-pepper";
        });
        services.Configure<SmtpOptions>(o =>
        {
            o.Host = "smtp.darcom.test";
            o.FromEmail = "noreply@darcom.test";
        });
        services.Configure<StorageOptions>(o =>
        {
            o.Provider = "Local";
            o.LocalPath = uploadsPath ?? Path.Combine(Path.GetTempPath(), $"darcom-uploads-{Guid.NewGuid():N}");
        });
        services.AddSingleton(Options.Create(opts));

        var emailSender = new CapturingEmailSender();
        var bgJobs = new CapturingBackgroundJobService();
        var hub = new CapturingHubPublisher();

        services.AddSingleton<IEmailSender>(emailSender);
        services.AddSingleton<IBackgroundJobService>(bgJobs);
        services.AddSingleton<IRealtimeHubPublisher>(hub);

        services.AddScoped<IPropertyStore, PropertyStore>();
        services.AddScoped<IRequestStore, RequestStore>();
        services.AddScoped<IEngagementStore, EngagementStore>();
        services.AddScoped<IAuthStore, AuthStore>();
        services.AddScoped<IAdminStore, AdminStore>();
        services.AddScoped<IAuditWriter, AuditWriter>();
        services.AddScoped<IAdminRealtimeNotifier, AdminNotificationDispatcher>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IRequestService, RequestService>();

        services.AddScoped<IEmailJobService, HangfireEmailJobService>();
        services.AddScoped<IReminderJobService, HangfireReminderJobService>();
        services.AddScoped<INotificationJobService, HangfireNotificationJobService>();
        services.AddScoped<IPropertyImageJobService, HangfirePropertyImageJobService>();

        services.AddScoped<EmailBackgroundJobWorker>();
        services.AddScoped<ReminderBackgroundJobWorker>();
        services.AddScoped<PendingRequestsMonitorJob>();
        services.AddScoped<SecurityCleanupJob>();
        services.AddScoped<PropertyImageProcessingJob>();
        services.AddScoped<DailyReportJob>();
        services.AddScoped<ScheduledPropertyPublishingJob>();
        services.AddScoped<IEmailOtpService, EmailOtpService>();

        var provider = services.BuildServiceProvider();
        SeedBaseData(provider);
        return (provider, emailSender, bgJobs, hub);
    }

    private static void SeedBaseData(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        foreach (var r in new[] { "Admin", "Agent", "Seller", "Buyer", "Broker" })
            roleMgr.CreateAsync(new Role { Name = r }).GetAwaiter().GetResult();

        var admin = new User
        {
            UserName = "admin@darcom.test",
            Email = "admin@darcom.test",
            FullName = "Admin User",
            EmailConfirmed = true,
            IsActive = true
        };
        userMgr.CreateAsync(admin, "Admin123!").GetAwaiter().GetResult();
        userMgr.AddToRoleAsync(admin, "Admin").GetAwaiter().GetResult();

        var buyer = new User
        {
            UserName = "client@darcom.test",
            Email = "client@darcom.test",
            FullName = "Client User",
            PhoneNumber = "+201001234567",
            EmailConfirmed = true,
            IsActive = true
        };
        userMgr.CreateAsync(buyer, "Buyer123!").GetAwaiter().GetResult();
        userMgr.AddToRoleAsync(buyer, "Buyer").GetAwaiter().GetResult();

        db.Cities.Add(new City { Id = 1, Name = "North Coast", Slug = "north-coast", Country = "Egypt" });
        db.Locations.Add(new Location { Id = 1, CityId = 1, Name = "Sidi Abdel Rahman" });
        db.PropertyTypes.Add(new PropertyType { Id = 1, Name = "Chalet", Slug = "chalet" });
        db.Villages.Add(new Village { Id = 1, Name = "Marassi", NameAr = "مراسي", Slug = "marassi", IsActive = true });
        db.Zones.Add(new Zone { Id = 1, VillageId = 1, Name = "Bay", NameAr = "باي", Slug = "bay", IsActive = true });
        db.SaveChanges();
    }

    [Fact]
    public async Task EmailOtp_Enqueues_Protected_Payload_Without_Plaintext_And_Sends_On_Worker()
    {
        var (sp, emailSender, bgJobs, _) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var otpService = scope.ServiceProvider.GetRequiredService<IEmailOtpService>();
        var worker = scope.ServiceProvider.GetRequiredService<EmailBackgroundJobWorker>();

        var res = await otpService.SendOtpAsync("user@darcom.test", "127.0.0.1", isDevelopment: false);

        Assert.True(res.Succeeded);
        Assert.Null(res.Data!.DebugCode);
        Assert.Single(bgJobs.Created);
        Assert.Equal("critical", bgJobs.Created[0].Queue);

        // Inspect scheduled Hangfire expression arguments: MUST NOT expose plaintext 6-digit OTP!
        var mce = Assert.IsAssignableFrom<MethodCallExpression>(bgJobs.Created[0].Call.Body);
        static object? EvalArg(Expression expr) => Expression.Lambda(expr).Compile().DynamicInvoke();
        var otpRecordId = (int)EvalArg(mce.Arguments[0])!;
        var toEmail = (string)EvalArg(mce.Arguments[1])!;
        var protectedPayload = (string)EvalArg(mce.Arguments[2])!;

        Assert.Equal("user@darcom.test", toEmail);
        Assert.DoesNotMatch(@"^\d{6}$", protectedPayload);

        // Executing worker unprotects payload and sends exact 6-digit OTP via IEmailSender
        await worker.SendOtpEmailAsync(otpRecordId, toEmail, protectedPayload);

        Assert.Single(emailSender.Sent);
        Assert.Equal("user@darcom.test", emailSender.Sent[0].To);
        Assert.Matches(@"\b\d{6}\b", emailSender.Sent[0].Html);
    }

    [Fact]
    public async Task EmailJob_Handles_SmtpFailure_And_Prevents_Duplicate_Send_On_Retry()
    {
        var (sp, emailSender, _, _) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var worker = scope.ServiceProvider.GetRequiredService<EmailBackgroundJobWorker>();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        // 1. Transient SMTP failure records Failed and rethrows for Hangfire retry
        emailSender.ShouldFail = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            worker.SendWelcomeEmailAsync(501, "retry@darcom.test", "Retry User"));

        var failedLog = await db.JobDispatchLogs.FirstAsync(l => l.DispatchKey == "email:welcome:501");
        Assert.Equal("Failed", failedLog.Status);
        Assert.Equal(1, failedLog.AttemptCount);
        Assert.Contains("SMTP connection timed out", failedLog.LastError);

        // 2. Retry succeeds
        emailSender.ShouldFail = false;
        await worker.SendWelcomeEmailAsync(501, "retry@darcom.test", "Retry User");
        Assert.Single(emailSender.Sent);

        // 3. Re-running same job is idempotent — NEVER sends duplicate email
        await worker.SendWelcomeEmailAsync(501, "retry@darcom.test", "Retry User");
        Assert.Single(emailSender.Sent);
    }

    [Fact]
    public async Task EmailOtpWorker_Skips_Expired_Or_Used_Otp_Without_Sending()
    {
        var (sp, emailSender, _, _) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var protector = scope.ServiceProvider.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(EmailBackgroundJobWorker.OtpProtectorPurpose)
            .ToTimeLimitedDataProtector();
        var worker = scope.ServiceProvider.GetRequiredService<EmailBackgroundJobWorker>();

        var expiredOtp = new EmailOtpCode
        {
            NormalizedEmail = "EXPIRED@DARCOM.TEST",
            CodeHash = "hash",
            Salt = "salt",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-2),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow.AddMinutes(-12)
        };
        db.EmailOtpCodes.Add(expiredOtp);
        await db.SaveChangesAsync();

        var protectedPayload = protector.Protect("123456", TimeSpan.FromMinutes(10));
        await worker.SendOtpEmailAsync(expiredOtp.Id, "expired@darcom.test", protectedPayload);

        Assert.Empty(emailSender.Sent);
        var log = await db.JobDispatchLogs.FirstAsync(l => l.DispatchKey == $"email:otp:{expiredOtp.Id}");
        Assert.Equal("Skipped", log.Status);
    }

    [Fact]
    public async Task ViewingReminder_Schedules_Cancels_On_Reschedule_And_Skips_When_Rejected()
    {
        var (sp, emailSender, bgJobs, hub) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var requestService = scope.ServiceProvider.GetRequiredService<IRequestService>();
        var notifier = scope.ServiceProvider.GetRequiredService<IAdminRealtimeNotifier>();
        var emailJobs = scope.ServiceProvider.GetRequiredService<IEmailJobService>();
        var reminders = scope.ServiceProvider.GetRequiredService<IReminderJobService>();
        var worker = scope.ServiceProvider.GetRequiredService<ReminderBackgroundJobWorker>();

        var admin = await db.Users.FirstAsync(u => u.Email == "admin@darcom.test");
        var client = await db.Users.FirstAsync(u => u.Email == "client@darcom.test");

        var listing = new PropertyListingRequest
        {
            RequestNumber = "LR-1001",
            UserId = client.Id,
            VillageId = 1,
            ZoneId = 1,
            BuildingNumber = "B1",
            UnitNumber = "U5",
            PhoneNumber = "+201001234567",
            Status = ListingRequestStatus.Pending
        };
        db.PropertyListingRequests.Add(listing);
        await db.SaveChangesAsync();

        var handler = new UpdateListingRequestStatusCommandHandler(requestService, notifier, emailJobs, reminders);

        // 1. Schedule Inspection 3 days in the future -> creates 24h & 1h reminder jobs
        var firstDate = DateTime.UtcNow.AddDays(3);
        var res1 = await handler.Handle(new UpdateListingRequestStatusCommand(
            admin.Id, listing.Id, new UpdateListingRequestStatusRequest("InspectionScheduled", "Visit 1", firstDate)), CancellationToken.None);
        Assert.True(res1.Succeeded);

        var firstRecords = await db.ScheduledJobRecords
            .Where(r => r.EntityType == "PropertyListingRequest" && r.EntityId == listing.Id && !r.IsCancelled)
            .ToListAsync();
        Assert.Equal(2, firstRecords.Count);
        var oldJobIds = firstRecords.Select(r => r.HangfireJobId).ToList();

        // 2. Reschedule Inspection -> old Hangfire jobs deleted/cancelled, new jobs created
        var secondDate = DateTime.UtcNow.AddDays(5);
        await handler.Handle(new UpdateListingRequestStatusCommand(
            admin.Id, listing.Id, new UpdateListingRequestStatusRequest("InspectionScheduled", "Rescheduled", secondDate)), CancellationToken.None);

        foreach (var oldId in oldJobIds)
            Assert.Contains(oldId, bgJobs.DeletedJobIds);

        var activeAfterReschedule = await db.ScheduledJobRecords
            .Where(r => r.EntityType == "PropertyListingRequest" && r.EntityId == listing.Id && !r.IsCancelled)
            .ToListAsync();
        Assert.Equal(2, activeAfterReschedule.Count);

        // 3. Rejecting cancels remaining jobs AND worker skips reminder even if executed
        await handler.Handle(new UpdateListingRequestStatusCommand(
            admin.Id, listing.Id, new UpdateListingRequestStatusRequest("Rejected", "Owner cancelled", null)), CancellationToken.None);

        var activeAfterReject = await db.ScheduledJobRecords
            .CountAsync(r => r.EntityType == "PropertyListingRequest" && r.EntityId == listing.Id && !r.IsCancelled);
        Assert.Equal(0, activeAfterReject);

        emailSender.Sent.Clear();
        hub.Published.Clear();
        await worker.SendViewingReminderAsync(listing.Id, 24);
        Assert.Empty(emailSender.Sent);
        Assert.DoesNotContain(hub.Published, n => n.EventType == "viewing.reminder");
    }

    [Fact]
    public async Task BookingConfirmation_Schedules_And_Cancelled_Booking_Skips_Reminder()
    {
        var (sp, emailSender, _, _) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var requestService = scope.ServiceProvider.GetRequiredService<IRequestService>();
        var notifier = scope.ServiceProvider.GetRequiredService<IAdminRealtimeNotifier>();
        var emailJobs = scope.ServiceProvider.GetRequiredService<IEmailJobService>();
        var reminders = scope.ServiceProvider.GetRequiredService<IReminderJobService>();
        var worker = scope.ServiceProvider.GetRequiredService<ReminderBackgroundJobWorker>();

        var admin = await db.Users.FirstAsync(u => u.Email == "admin@darcom.test");
        var client = await db.Users.FirstAsync(u => u.Email == "client@darcom.test");

        var prop = new Property
        {
            Title = "Rental Chalet A",
            Slug = "rental-chalet-a",
            ReferenceNumber = "DAR-9901",
            PropertyTypeId = 1,
            VillageId = 1,
            LocationId = 1,
            Purpose = PropertyPurpose.Rent,
            Status = PropertyStatus.Published,
            Price = 5000m
        };
        db.Properties.Add(prop);
        await db.SaveChangesAsync();

        var booking = new BookingRequest
        {
            RequestNumber = "BK-2001",
            PropertyId = prop.Id,
            RenterId = client.Id,
            FullName = "Client User",
            Email = client.Email!,
            Phone = "+201001234567",
            StartDate = DateTime.UtcNow.AddDays(4),
            EndDate = DateTime.UtcNow.AddDays(8),
            Status = RequestStatus.UnderReview
        };
        db.BookingRequests.Add(booking);
        await db.SaveChangesAsync();

        var handler = new UpdateBookingStatusCommandHandler(requestService, notifier, emailJobs, reminders);
        var approveRes = await handler.Handle(new UpdateBookingStatusCommand(
            admin.Id, booking.Id, new UpdateRequestStatusRequest("Approved", "Confirmed"), null), CancellationToken.None);
        Assert.True(approveRes.Succeeded);

        var tracked = await db.ScheduledJobRecords
            .Where(r => r.EntityType == "BookingRequest" && r.EntityId == booking.Id && !r.IsCancelled)
            .ToListAsync();
        Assert.Equal(2, tracked.Count); // start & end reminders

        // Simulate cancellation directly -> worker must skip sending reminder
        var trackedEntity = await db.BookingRequests.FirstAsync(b => b.Id == booking.Id);
        trackedEntity.Status = RequestStatus.Cancelled;
        await db.SaveChangesAsync();

        emailSender.Sent.Clear();
        await worker.SendBookingReminderAsync(booking.Id, "start");
        Assert.Empty(emailSender.Sent);
    }

    [Fact]
    public async Task PendingRequestsMonitor_Alerts_Admins_Without_Duplicating_Or_Alerting_Processed()
    {
        var (sp, _, _, hub) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var monitor = scope.ServiceProvider.GetRequiredService<PendingRequestsMonitorJob>();
        var client = await db.Users.FirstAsync(u => u.Email == "client@darcom.test");

        var oldProp = new Property
        {
            Title = "Pending Check Unit",
            Slug = "pending-check-unit",
            ReferenceNumber = "DAR-7701",
            PropertyTypeId = 1,
            VillageId = 1,
            LocationId = 1,
            Purpose = PropertyPurpose.Rent,
            Status = PropertyStatus.Published,
            Price = 4000m
        };
        db.Properties.Add(oldProp);
        await db.SaveChangesAsync();

        // Overdue > 24h pending booking + already approved booking
        db.BookingRequests.AddRange(
            new BookingRequest
            {
                RequestNumber = "BK-OLD-1",
                PropertyId = oldProp.Id,
                RenterId = client.Id,
                FullName = "Wait User",
                Email = "wait@darcom.test",
                Phone = "+201001112233",
                Status = RequestStatus.Pending,
                CreatedAt = DateTime.UtcNow.AddHours(-30)
            },
            new BookingRequest
            {
                RequestNumber = "BK-DONE-1",
                PropertyId = oldProp.Id,
                RenterId = client.Id,
                FullName = "Done User",
                Email = "done@darcom.test",
                Phone = "+201001112234",
                Status = RequestStatus.Approved,
                CreatedAt = DateTime.UtcNow.AddHours(-30)
            });

        // Unread overdue inquiry
        db.PropertyInquiries.Add(new PropertyInquiry
        {
            PropertyId = oldProp.Id,
            Name = "Inq",
            Email = "inq@darcom.test",
            Message = "Need info",
            IsRead = false,
            CreatedAt = DateTime.UtcNow.AddHours(-26)
        });
        await db.SaveChangesAsync();

        await monitor.ExecuteAsync();
        await monitor.ExecuteAsync(); // Second run must NOT create duplicate notifications!

        var alerts = await db.Notifications.Where(n => n.Type == "pending.request.alert").ToListAsync();
        Assert.Equal(2, alerts.Count); // 1 overdue booking + 1 unread inquiry (approved booking ignored)
        Assert.Equal(2, hub.Published.Count);
    }

    [Fact]
    public async Task SecurityCleanupJob_Purges_Expired_Otp_And_RefreshTokens_While_Keeping_Active()
    {
        var (sp, _, _, _) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var cleanup = scope.ServiceProvider.GetRequiredService<SecurityCleanupJob>();
        var client = await db.Users.FirstAsync(u => u.Email == "client@darcom.test");

        // OTPs: 1 old expired, 1 still valid active
        db.EmailOtpCodes.AddRange(
            new EmailOtpCode
            {
                NormalizedEmail = "OLD@DARCOM.TEST",
                CodeHash = "h1",
                Salt = "s1",
                ExpiresAt = DateTime.UtcNow.AddHours(-30),
                CreatedAt = DateTime.UtcNow.AddHours(-31)
            },
            new EmailOtpCode
            {
                NormalizedEmail = "ACTIVE@DARCOM.TEST",
                CodeHash = "h2",
                Salt = "s2",
                ExpiresAt = DateTime.UtcNow.AddMinutes(8),
                CreatedAt = DateTime.UtcNow
            });

        // Refresh tokens: 1 expired >30d, 1 active, 1 recently revoked (<30d audit retention)
        db.UserRefreshTokens.AddRange(
            new UserRefreshToken
            {
                UserId = client.Id,
                TokenHash = "tok-old",
                ExpiresAt = DateTime.UtcNow.AddDays(-35)
            },
            new UserRefreshToken
            {
                UserId = client.Id,
                TokenHash = "tok-active",
                ExpiresAt = DateTime.UtcNow.AddDays(5)
            },
            new UserRefreshToken
            {
                UserId = client.Id,
                TokenHash = "tok-recent-revoked",
                ExpiresAt = DateTime.UtcNow.AddDays(5),
                RevokedAt = DateTime.UtcNow.AddDays(-2),
                RevocationReason = "UserLogout"
            });
        await db.SaveChangesAsync();

        var deletedOtps = await cleanup.CleanupExpiredOtpsAsync();
        var deletedTokens = await cleanup.CleanupExpiredRefreshTokensAsync();

        Assert.Equal(1, deletedOtps);
        Assert.Equal(1, deletedTokens);
        Assert.True(await db.EmailOtpCodes.AnyAsync(o => o.NormalizedEmail == "ACTIVE@DARCOM.TEST"));
        Assert.True(await db.UserRefreshTokens.AnyAsync(t => t.TokenHash == "tok-active"));
        Assert.True(await db.UserRefreshTokens.AnyAsync(t => t.TokenHash == "tok-recent-revoked"));
    }

    [Fact]
    public async Task DailyReportJob_Aggregates_Counts_Notifies_Admins_And_Sends_Idempotent_Email()
    {
        var (sp, emailSender, _, hub) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var reportJob = scope.ServiceProvider.GetRequiredService<DailyReportJob>();

        // Run twice for idempotency check
        await reportJob.ExecuteAsync();
        await reportJob.ExecuteAsync();

        Assert.Single(emailSender.Sent);
        Assert.Equal("admin@darcom.test", emailSender.Sent[0].To);
        Assert.Single(hub.Published);
        Assert.Equal("daily.report.ready", hub.Published[0].EventType);
        Assert.Equal(1, await db.Notifications.CountAsync(n => n.Type == "daily.report.ready"));
    }

    [Fact]
    public async Task ScheduledPropertyPublishingJob_Publishes_Due_And_Archives_Expired()
    {
        var (sp, _, _, hub) = BuildHangfireTestContainer();
        using var _ = sp;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
        var job = scope.ServiceProvider.GetRequiredService<ScheduledPropertyPublishingJob>();

        var dueProp = new Property
        {
            Title = "Scheduled Launch Unit",
            Slug = "scheduled-launch",
            ReferenceNumber = "DAR-1101",
            PropertyTypeId = 1,
            VillageId = 1,
            LocationId = 1,
            Status = PropertyStatus.Draft,
            Purpose = PropertyPurpose.Sale,
            Price = 4000000m,
            PublishAt = DateTime.UtcNow.AddMinutes(-5)
        };
        var expiredProp = new Property
        {
            Title = "Expired Offer Unit",
            Slug = "expired-offer",
            ReferenceNumber = "DAR-1102",
            PropertyTypeId = 1,
            VillageId = 1,
            LocationId = 1,
            Status = PropertyStatus.Published,
            Purpose = PropertyPurpose.Sale,
            Price = 3000000m,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
        };
        db.Properties.AddRange(dueProp, expiredProp);
        await db.SaveChangesAsync();

        var count = await job.ExecuteAsync();

        Assert.Equal(2, count);
        var updatedDue = await db.Properties.AsNoTracking().FirstAsync(p => p.Id == dueProp.Id);
        var updatedExpired = await db.Properties.AsNoTracking().FirstAsync(p => p.Id == expiredProp.Id);
        Assert.Equal(PropertyStatus.Published, updatedDue.Status);
        Assert.Equal(PropertyStatus.Archived, updatedExpired.Status);
        Assert.Equal(2, hub.Published.Count);
    }

    [Fact]
    public async Task PropertyImageProcessingJob_Generates_WebP_And_Thumbnail_Preserving_Original()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"darcom-imgtest-{Guid.NewGuid():N}");
        try
        {
            var (sp, _, _, _) = BuildHangfireTestContainer(uploadsPath: tempRoot);
            using var _ = sp;
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();
            var job = scope.ServiceProvider.GetRequiredService<PropertyImageProcessingJob>();

            var imagesDir = Path.Combine(tempRoot, "images");
            Directory.CreateDirectory(imagesDir);
            var originalFile = Path.Combine(imagesDir, "sample-villa.png");

            using (var bmp = new SKBitmap(2200, 1200))
            using (var canvas = new SKCanvas(bmp))
            {
                canvas.Clear(SKColors.Teal);
                using var img = SKImage.FromBitmap(bmp);
                using var encoded = img.Encode(SKEncodedImageFormat.Png, 90);
                await using var fs = File.Create(originalFile);
                encoded.SaveTo(fs);
            }

            var prop = new Property
            {
                Title = "Img Prop",
                Slug = "img-prop",
                ReferenceNumber = "DAR-5501",
                PropertyTypeId = 1,
                VillageId = 1,
                LocationId = 1,
                Price = 1000m
            };
            db.Properties.Add(prop);
            await db.SaveChangesAsync();

            var propImg = new PropertyImage
            {
                PropertyId = prop.Id,
                Url = "/uploads/images/sample-villa.png",
                Order = 1,
                IsPrimary = true
            };
            db.PropertyImages.Add(propImg);
            await db.SaveChangesAsync();

            await job.ProcessAsync(propImg.Id);

            Assert.True(File.Exists(originalFile)); // Original preserved
            Assert.True(File.Exists(Path.Combine(imagesDir, "sample-villa_web.webp")));
            Assert.True(File.Exists(Path.Combine(imagesDir, "sample-villa_thumb.webp")));
            var log = await db.JobDispatchLogs.FirstAsync(l => l.DispatchKey == $"image:optimize:{propImg.Id}");
            Assert.Equal("Sent", log.Status);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public void HangfireDashboardAuthFilter_Allows_Only_Authenticated_Admins()
    {
        var filter = new HangfireAdminDashboardAuthorizationFilter();
        var storage = new StubJobStorage();
        var options = new DashboardOptions();

        DashboardContext ContextWith(ClaimsPrincipal? principal)
        {
            var http = new DefaultHttpContext
            {
                RequestServices = new ServiceCollection().BuildServiceProvider()
            };
            if (principal is not null)
                http.User = principal;
            return new AspNetCoreDashboardContext(storage, options, http);
        }

        // Anonymous denied
        Assert.False(filter.Authorize(ContextWith(null)));

        // Buyer denied
        var buyer = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "2"),
            new Claim(ClaimTypes.Role, "Buyer")
        }, "Bearer"));
        Assert.False(filter.Authorize(ContextWith(buyer)));

        // Broker denied
        var broker = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "3"),
            new Claim(ClaimTypes.Role, "Broker")
        }, "Bearer"));
        Assert.False(filter.Authorize(ContextWith(broker)));

        // Admin allowed
        var admin = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Admin")
        }, "Bearer"));
        Assert.True(filter.Authorize(ContextWith(admin)));
    }
}

