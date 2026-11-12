using Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class DarcomDbContext : IdentityDbContext<User, Role, int>
{
    public DarcomDbContext(DbContextOptions<DarcomDbContext> options) : base(options)
    {
    }

    public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
    public DbSet<EmailOtpCode> EmailOtpCodes => Set<EmailOtpCode>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<BrokerProfile> BrokerProfiles => Set<BrokerProfile>();

    // North Coast Villages & Zones (Requirements 3 & 4)
    public DbSet<Village> Villages => Set<Village>();
    public DbSet<Zone> Zones => Set<Zone>();

    // Legacy location hierarchy
    public DbSet<City> Cities => Set<City>();
    public DbSet<Area> Areas => Set<Area>();
    public DbSet<Location> Locations => Set<Location>();

    public DbSet<PropertyType> PropertyTypes => Set<PropertyType>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyFeature> PropertyFeatures => Set<PropertyFeature>();
    public DbSet<PropertyImage> PropertyImages => Set<PropertyImage>();
    public DbSet<PropertyVideo> PropertyVideos => Set<PropertyVideo>();
    public DbSet<PropertyDocument> PropertyDocuments => Set<PropertyDocument>();
    public DbSet<PropertyAmenity> PropertyAmenities => Set<PropertyAmenity>();

    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<PropertyInquiry> PropertyInquiries => Set<PropertyInquiry>();
    public DbSet<PropertyView> PropertyViews => Set<PropertyView>();
    public DbSet<SearchHistory> SearchHistories => Set<SearchHistory>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<BookingRequest> BookingRequests => Set<BookingRequest>();
    public DbSet<RentalPeriod> RentalPeriods => Set<RentalPeriod>();
    public DbSet<BrokerPropertyRequest> BrokerPropertyRequests => Set<BrokerPropertyRequest>();
    public DbSet<BrokerPropertySubmission> BrokerPropertySubmissions => Set<BrokerPropertySubmission>();
    public DbSet<PropertyRequirement> PropertyRequirements => Set<PropertyRequirement>();
    public DbSet<PropertyListingRequest> PropertyListingRequests => Set<PropertyListingRequest>();

    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SiteContent> SiteContents => Set<SiteContent>();
    public DbSet<ScheduledJobRecord> ScheduledJobRecords => Set<ScheduledJobRecord>();
    public DbSet<JobDispatchLog> JobDispatchLogs => Set<JobDispatchLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DarcomDbContext).Assembly);
    }
}
