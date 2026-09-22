using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence.Seed;

/// <summary>
/// PHASE-01 seed: admin (from configuration, never hard-coded production credentials),
/// demo agents/users and 22 realistic properties. Idempotent — safe to run on startup.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DarcomDbContext>();

        await db.Database.MigrateAsync();

        var adminEmail = config["Admin:Email"] ?? "admin@darcom.local";
        var adminPassword = config["Admin:Password"] ?? "ChangeMe123!";
        var adminName = config["Admin:FullName"] ?? "Darcom Admin";

        if (!await db.Users.AnyAsync(u => u.Email == adminEmail))
        {
            db.Users.Add(new User
            {
                FullName = adminName,
                Email = adminEmail,
                PasswordHash = PasswordHasher.Hash(adminPassword),
                RoleId = 1,
                IsActive = true
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded admin user {Email}.", adminEmail);
        }

        if (!await db.Agents.AnyAsync())
        {
            db.Agents.AddRange(
                new Agent { Name = "Ahmed El-Masry", Title = "Red Sea Specialist", Agency = "SeaView Properties", Phone = "+201001234501", Email = "ahmed@seaviewprops.com", IsVerified = true },
                new Agent { Name = "Mona Adel", Title = "New Cairo Consultant", Agency = "New Cairo Homes", Phone = "+201001234502", Email = "mona@newcairohomes.com", IsVerified = true },
                new Agent { Name = "Karim Nasser", Title = "North Coast Advisor", Agency = "North Realty", Phone = "+201001234503", Email = "karim@northrealty.com", IsVerified = true }
            );
            await db.SaveChangesAsync();
        }

        if (!await db.Users.AnyAsync(u => u.Email == "buyer@darcom.local"))
        {
            db.Users.Add(new User
            {
                FullName = "Demo Buyer",
                Email = "buyer@darcom.local",
                PasswordHash = PasswordHasher.Hash("Buyer123!"),
                RoleId = 4,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        if (await db.Properties.AnyAsync()) return;

        var P = SeedCatalog.All;
        var refNo = 1000;
        foreach (var s in P)
        {
            var property = new Property
            {
                Title = s.Title,
                Slug = s.Slug,
                ReferenceNumber = $"DAR-{(refNo++).ToString()}",
                Description = s.Description,
                PropertyTypeId = s.TypeId,
                Status = s.Status,
                Purpose = s.Purpose,
                Price = s.Price,
                Currency = "EGP",
                Area = s.Area,
                Bedrooms = s.Beds,
                Bathrooms = s.Baths,
                Floor = s.Floor,
                TotalFloors = s.TotalFloors,
                BuiltYear = s.BuiltYear,
                FurnishedStatus = s.Furnished,
                FinishingStatus = s.Finishing,
                Parking = s.Parking,
                Garden = s.Garden,
                Pool = s.Pool,
                SeaView = s.SeaView,
                BeachAccess = s.Beach,
                LocationId = s.LocationId,
                Developer = s.Developer,
                AgentId = s.AgentId,
                IsVerified = true,
                IsFeatured = s.Status == PropertyStatus.Featured
            };
            db.Properties.Add(property);
            await db.SaveChangesAsync();

            var order = 0;
            foreach (var seed in s.ImageSeeds)
            {
                db.PropertyImages.Add(new PropertyImage
                {
                    PropertyId = property.Id,
                    Url = $"https://picsum.photos/seed/{seed}/1200/800",
                    Order = order,
                    IsPrimary = order == 0,
                    AltText = $"{s.Title} — photo {order + 1}"
                });
                order++;
            }

            foreach (var amenityId in s.AmenityIds)
                db.PropertyAmenities.Add(new PropertyAmenity { PropertyId = property.Id, AmenityId = amenityId });

            foreach (var (title, value) in s.Features)
                db.PropertyFeatures.Add(new PropertyFeature { PropertyId = property.Id, Title = title, Value = value });

            await db.SaveChangesAsync();
        }

        logger.LogInformation("Seeded {Count} properties.", P.Count);
    }

    private sealed record SeedProperty(
        string Title, string Slug, int TypeId, PropertyPurpose Purpose, PropertyStatus Status,
        decimal Price, decimal Area, int? Beds, int? Baths, int LocationId,
        bool Parking, bool Garden, bool Pool, bool SeaView, bool Beach,
        string? Furnished, string? Finishing, int? Floor, int? TotalFloors, int? BuiltYear,
        string? Developer, int AgentId, string Description,
        string[] ImageSeeds, int[] AmenityIds, (string, string)[] Features);

    private static class SeedCatalog
    {
        public static readonly List<SeedProperty> All = new()
        {
            new("Sea-View Chalet with Private Beach Access", "sea-view-chalet-ain-sokhna", 1, PropertyPurpose.Sale, PropertyStatus.Featured,
                12500000, 180, 3, 3, 1, true, true, true, true, true, "Fully Furnished", "Super Lux", 1, 3, 2021, "Porto Group", 1,
                "Luxury 3-bedroom chalet overlooking the Red Sea with direct beach access, landscaped garden and a private pool terrace.",
                new[]{"sokhna-chalet-1","sokhna-chalet-2","sokhna-chalet-3"}, new[]{1,2,3,4,5,6,8,9,11},
                new[]{("Orientation","Sea facing"),("Flooring","Marble + parquet"),("View","Direct sea view")}),
            new("Modern 2-Bedroom Chalet near Porto Promenade", "modern-chalet-porto-sokhna", 1, PropertyPurpose.Sale, PropertyStatus.Published,
                7800000, 130, 2, 2, 1, true, false, true, true, true, "Semi Furnished", "Lux", 2, 4, 2022, "Porto Group", 1,
                "Bright 2-bedroom chalet minutes from the Porto Sokhna promenade, ideal for weekend getaways and rental income.",
                new[]{"sokhna-chalet-4","sokhna-chalet-5"}, new[]{1,3,4,5,6,8},
                new[]{("Orientation","Partial sea view"),("Maintenance","7,500 EGP/year")}),
            new("Family Chalet with Garden in La Vista Bay", "family-chalet-la-vista-bay", 1, PropertyPurpose.Sale, PropertyStatus.Published,
                9400000, 165, 3, 2, 2, true, true, true, false, true, "Unfurnished", "Super Lux", 0, 2, 2020, "La Vista", 1,
                "Ground-floor family chalet with a private 90 m² garden, perfect for children, with access to La Vista Bay lagoons.",
                new[]{"lavista-1","lavista-2","lavista-3"}, new[]{1,2,5,6,14,15},
                new[]{("Garden","90 m² private"),("Flooring","Porcelain")}),
            new("Weekly-Rent Chalet Steps from the Sand", "rent-chalet-steps-from-sand", 1, PropertyPurpose.Rent, PropertyStatus.Published,
                18000, 120, 2, 2, 2, true, false, true, true, true, "Fully Furnished", "Lux", 1, 3, 2019, "La Vista", 1,
                "Fully serviced 2-bedroom chalet for short and weekly stays, 40 meters from the beach with hotel-style housekeeping.",
                new[]{"lavista-rent-1","lavista-rent-2"}, new[]{1,3,4,5,8,9},
                new[]{("Rental","Weekly / monthly"),("Check-in","Flexible")}),
            new("Investment Chalet with Guaranteed Rental Pool", "investment-chalet-rental-pool", 1, PropertyPurpose.Investment, PropertyStatus.Published,
                8600000, 140, 2, 2, 1, true, false, true, true, true, "Fully Furnished", "Super Lux", 3, 5, 2023, "Porto Group", 1,
                "Hotel-managed chalet inside the rental pool program with published occupancy history and quarterly payouts.",
                new[]{"sokhna-inv-1","sokhna-inv-2"}, new[]{1,3,4,5,6,13,14},
                new[]{("Yield","Target 9% net"),("Management","Hotel operator")}),
            new("Sunny Apartment on South 90 Road", "sunny-apartment-south-90", 2, PropertyPurpose.Sale, PropertyStatus.Published,
                9200000, 175, 3, 3, 3, true, false, false, false, false, "Semi Furnished", "Ultra Super Lux", 5, 9, 2022, "Emaar Misr", 2,
                "High-floor 3-bedroom apartment with an open city view, premium finishing and two underground parking spots.",
                new[]{"cairo-apt-1","cairo-apt-2","cairo-apt-3"}, new[]{5,6,7,8,16},
                new[]{("Flooring","Oak parquet"),("View","Open city view")}),
            new("Garden Apartment in Rehab City", "garden-apartment-rehab-city", 2, PropertyPurpose.Sale, PropertyStatus.Published,
                6100000, 150, 3, 2, 4, true, true, false, false, false, "Unfurnished", "Lux", 0, 5, 2018, "Talaat Moustafa", 2,
                "Ground-floor apartment with a 60 m² private garden in a quiet Rehab City group, close to schools and the food court.",
                new[]{"rehab-1","rehab-2"}, new[]{2,5,6,15},
                new[]{("Garden","60 m² private")}),
            new("Furnished Apartment for Long-Term Rent", "furnished-apartment-long-term-rent", 2, PropertyPurpose.Rent, PropertyStatus.Published,
                45000, 140, 2, 2, 3, true, false, false, false, false, "Fully Furnished", "Super Lux", 4, 8, 2021, "Private Owner", 2,
                "Elegant fully furnished 2-bedroom apartment for yearly contracts, equipped kitchen and dedicated workspace corner.",
                new[]{"cairo-rent-1","cairo-rent-2"}, new[]{5,7,8,9,10,16},
                new[]{("Contract","12 months"),("Payment","Quarterly")}),
            new("Starter Apartment with Club Access", "starter-apartment-club-access", 2, PropertyPurpose.Sale, PropertyStatus.Published,
                4800000, 110, 2, 1, 4, true, false, true, false, false, "Unfurnished", "Semi Finished", 2, 6, 2024, "Talaat Moustafa", 2,
                "Smartly planned 2-bedroom starter home with access to the Rehab club, pools and sports facilities.",
                new[]{"rehab-2-1","rehab-2-2"}, new[]{1,5,13,14},
                new[]{("Delivery","Core & shell + club")}),
            new("Palm-Fringed Villa with Infinity Pool", "palm-villa-infinity-pool-marina", 3, PropertyPurpose.Sale, PropertyStatus.Featured,
                42000000, 520, 5, 6, 5, true, true, true, true, true, "Fully Furnished", "Super Lux", 0, 2, 2020, "Emaar Misr", 3,
                "Architect-designed 5-bedroom villa with an infinity pool facing the lagoon, guest annex and smart-home throughout.",
                new[]{"marina-villa-1","marina-villa-2","marina-villa-3","marina-villa-4"}, new[]{1,2,3,4,5,6,8,9,12,13,16,17},
                new[]{("Plot","900 m²"),("Pool","Infinity 18 m"),("Smart","Full KNX system")}),
            new("Classic Family Villa near Hacienda Bay", "family-villa-hacienda-bay", 3, PropertyPurpose.Sale, PropertyStatus.Published,
                33500000, 450, 4, 5, 6, true, true, true, true, true, "Semi Furnished", "Super Lux", 0, 2, 2019, "Palm Hills", 3,
                "Warm 4-bedroom family villa with mature landscaping, BBQ terrace and a heated pool, two minutes from the beach gate.",
                new[]{"hacienda-villa-1","hacienda-villa-2","hacienda-villa-3"}, new[]{1,2,3,4,5,6,9,17},
                new[]{("Plot","720 m²"),("Pool","Heated 14 m")}),
            new("Sold Lagoon Villa (Reference Listing)", "sold-lagoon-villa-reference", 3, PropertyPurpose.Sale, PropertyStatus.Sold,
                28900000, 410, 4, 4, 5, true, true, true, false, true, "Fully Furnished", "Super Lux", 0, 2, 2018, "Emaar Misr", 3,
                "Reference listing — sold in 2025. Kept visible as a market benchmark for lagoon-facing villas in Marina.",
                new[]{"marina-sold-1"}, new[]{1,2,4,5,6},
                new[]{("Status","Sold 2025 — benchmark")}),
            new("Sky Penthouse with Rooftop Terrace", "sky-penthouse-rooftop-terrace", 6, PropertyPurpose.Sale, PropertyStatus.Featured,
                27500000, 320, 4, 4, 3, true, false, true, false, false, "Fully Furnished", "Ultra Super Lux", 9, 9, 2023, "Emaar Misr", 2,
                "Duplex penthouse crowned by a 120 m² rooftop terrace with outdoor cinema, plunge pool and panoramic skyline views.",
                new[]{"penthouse-1","penthouse-2","penthouse-3"}, new[]{5,7,8,9,12,13,16},
                new[]{("Terrace","120 m² private"),("Pool","Plunge pool")}),
            new("Sea-Breeze Penthouse in Sahl Hasheesh", "sea-breeze-penthouse-sahl-hasheesh", 6, PropertyPurpose.Sale, PropertyStatus.Published,
                19800000, 280, 3, 3, 7, true, false, true, true, true, "Semi Furnished", "Super Lux", 6, 6, 2022, "Capital Group", 1,
                "Top-floor penthouse with wraparound terraces catching the Red Sea breeze, above the Sahl Hasheesh promenade.",
                new[]{"sahl-pent-1","sahl-pent-2"}, new[]{1,3,5,7,8,12},
                new[]{("Terraces","Wraparound 80 m²")}),
            new("Cozy Studio for Young Professionals", "cozy-studio-young-professionals", 7, PropertyPurpose.Sale, PropertyStatus.Published,
                3400000, 65, 1, 1, 4, true, false, true, false, false, "Semi Furnished", "Lux", 3, 6, 2023, "Talaat Moustafa", 2,
                "Efficient studio with a smart layout, built-in storage and access to pools and co-working lounge — ideal first home.",
                new[]{"studio-1","studio-2"}, new[]{1,5,8,13},
                new[]{("Layout","Open plan + storage wall")}),
            new("Rented Studio by Abu Tig Marina", "rented-studio-abu-tig-marina", 7, PropertyPurpose.Rent, PropertyStatus.Rented,
                22000, 58, 1, 1, 10, false, false, true, false, true, "Fully Furnished", "Lux", 2, 4, 2021, "Orascom", 1,
                "Currently tenanted studio overlooking the marina walk — shown as a rental-yield reference for marina properties.",
                new[]{"gouna-studio-1"}, new[]{1,4,8,9},
                new[]{("Status","Tenanted — yield reference")}),
            new("Corner Townhouse with Roof Garden", "corner-townhouse-roof-garden", 4, PropertyPurpose.Sale, PropertyStatus.Published,
                14500000, 260, 4, 4, 3, true, true, true, false, false, "Unfurnished", "Super Lux", 0, 3, 2022, "SODIC", 2,
                "Corner townhouse with extra side garden plus a finished roof garden, maid's room and driver's room.",
                new[]{"townhouse-1","townhouse-2","townhouse-3"}, new[]{1,2,5,6,9,12},
                new[]{("Gardens","Side + roof")}),
            new("Duplex with Double-Height Living Room", "duplex-double-height-living", 5, PropertyPurpose.Sale, PropertyStatus.Published,
                11800000, 230, 3, 3, 3, true, false, true, false, false, "Semi Furnished", "Ultra Super Lux", 7, 9, 2023, "Emaar Misr", 2,
                "Striking duplex with a 6-meter double-height living space, floating staircase and floor-to-ceiling glazing.",
                new[]{"duplex-1","duplex-2"}, new[]{5,7,8,13,16},
                new[]{("Ceiling","6 m double height")}),
            new("Twin House with Lake View", "twin-house-lake-view", 8, PropertyPurpose.Sale, PropertyStatus.Published,
                16900000, 300, 4, 4, 6, true, true, true, false, false, "Unfurnished", "Super Lux", 0, 2, 2021, "Palm Hills", 3,
                "Twin house opening onto the Hacienda Bay lake promenade, with a shaded loggia and outdoor kitchen.",
                new[]{"twin-1","twin-2","twin-3"}, new[]{1,2,5,6,10,17},
                new[]{("View","Lake promenade")}),
            new("Standalone Villa with Guest House in Makadi", "standalone-villa-guest-house-makadi", 9, PropertyPurpose.Investment, PropertyStatus.Published,
                24000000, 480, 5, 5, 8, true, true, true, true, true, "Fully Furnished", "Super Lux", 0, 2, 2020, "Makadi Group", 1,
                "Income-producing standalone villa with a separate guest house, currently achieving 78% annual occupancy.",
                new[]{"makadi-villa-1","makadi-villa-2","makadi-villa-3"}, new[]{1,2,3,4,5,6,8,9,13,14},
                new[]{("Occupancy","78% trailing year"),("Units","Main + guest house")}),
            new("Beachfront Land Plot for Boutique Hotel", "beachfront-land-boutique-hotel", 11, PropertyPurpose.Investment, PropertyStatus.Reserved,
                31000000, 2500, null, null, 7, false, false, false, true, true, null, null, null, null, null, "Private Owner", 1,
                "Rare 2,500 m² beachfront plot with hotel zoning approval in principle — suited for a 20-key boutique resort.",
                new[]{"land-1","land-2"}, new[]{3,4,6},
                new[]{("Zoning","Hotel — in principle"),("Frontage","48 m beach")}),
            new("High-Street Retail Unit in El Gouna", "retail-unit-downtown-gouna", 10, PropertyPurpose.Sale, PropertyStatus.Published,
                13500000, 120, null, 2, 9, true, false, false, false, false, "Unfurnished", "Finished", 0, 2, 2019, "Orascom", 1,
                "Double-frontage retail unit on the Downtown pedestrian spine with established footfall and storage mezzanine.",
                new[]{"retail-1","retail-2"}, new[]{5,6,8},
                new[]{("Frontage","Dual 9 m"),("Footfall","Downtown spine")}),
        };
    }
}
