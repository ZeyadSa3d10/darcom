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

        if (!await db.Users.AnyAsync(u => u.Email == "seller@darcom.local"))
        {
            db.Users.Add(new User
            {
                FullName = "Demo Owner",
                Email = "seller@darcom.local",
                PasswordHash = PasswordHasher.Hash("Seller123!"),
                RoleId = 3,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        if (!await db.Users.AnyAsync(u => u.Email == "broker@darcom.local"))
        {
            var brokerUser = new User
            {
                FullName = "Demo Broker",
                Email = "broker@darcom.local",
                PasswordHash = PasswordHasher.Hash("Broker123!"),
                RoleId = 5,
                IsActive = true
            };
            db.Users.Add(brokerUser);
            await db.SaveChangesAsync();

            db.BrokerProfiles.Add(new BrokerProfile
            {
                UserId = brokerUser.Id,
                AgencyName = "North Coast Premier Realty",
                LicenseNumber = "EG-NC-9872",
                NationalId = "29001011234567",
                DocumentUrl = "https://example.com/docs/broker-license.pdf",
                Status = BrokerStatus.Approved,
                ApprovedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        if (!await db.Villages.AnyAsync())
        {
            var marassi = new Village { Name = "Marassi", Slug = "marassi", IsActive = true };
            marassi.Zones.Add(new Zone { Name = "Marina", Slug = "marina", IsActive = true });
            marassi.Zones.Add(new Zone { Name = "Blanca", Slug = "blanca", IsActive = true });
            marassi.Zones.Add(new Zone { Name = "Greek Village", Slug = "greek-village", IsActive = true });
            marassi.Zones.Add(new Zone { Name = "Arezzo", Slug = "arezzo", IsActive = true });

            var hacienda = new Village { Name = "Hacienda Bay", Slug = "hacienda-bay", IsActive = true };
            hacienda.Zones.Add(new Zone { Name = "Water Villas", Slug = "water-villas", IsActive = true });
            hacienda.Zones.Add(new Zone { Name = "Golf Residences", Slug = "golf-residences", IsActive = true });
            hacienda.Zones.Add(new Zone { Name = "Bay", Slug = "bay", IsActive = true });
            hacienda.Zones.Add(new Zone { Name = "Lagoon", Slug = "lagoon", IsActive = true });

            var telal = new Village { Name = "Telal", Slug = "telal", IsActive = true };
            telal.Zones.Add(new Zone { Name = "First Row", Slug = "first-row", IsActive = true });
            telal.Zones.Add(new Zone { Name = "Aqua", Slug = "aqua", IsActive = true });
            telal.Zones.Add(new Zone { Name = "Walk", Slug = "walk", IsActive = true });

            var amwaj = new Village { Name = "Amwaj", Slug = "amwaj", IsActive = true };
            amwaj.Zones.Add(new Zone { Name = "Beachfront", Slug = "beachfront", IsActive = true });
            amwaj.Zones.Add(new Zone { Name = "Central", Slug = "central", IsActive = true });
            amwaj.Zones.Add(new Zone { Name = "Lake View", Slug = "lake-view", IsActive = true });

            var mountainView = new Village { Name = "Mountain View Ras El Hekma", Slug = "mountain-view-ras-el-hekma", IsActive = true };
            mountainView.Zones.Add(new Zone { Name = "Paros", Slug = "paros", IsActive = true });
            mountainView.Zones.Add(new Zone { Name = "Rhodes", Slug = "rhodes", IsActive = true });
            mountainView.Zones.Add(new Zone { Name = "Santorini", Slug = "santorini", IsActive = true });

            var silversands = new Village { Name = "Silversands", Slug = "silversands", IsActive = true };
            silversands.Zones.Add(new Zone { Name = "Beachfront", Slug = "beachfront", IsActive = true });
            silversands.Zones.Add(new Zone { Name = "Island", Slug = "island", IsActive = true });

            db.Villages.AddRange(marassi, hacienda, telal, amwaj, mountainView, silversands);
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded North Coast Villages and Zones.");
        }

        if (!await db.SiteContents.AnyAsync())
        {
            db.SiteContents.AddRange(
                new SiteContent
                {
                    ContentKey = "hero.slides",
                    Description = "Hero carousel slides and background images",
                    ContentValue = """
                    [
                      {"id":1,"key":"sokhna","image":"https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=80","fallback":"https://picsum.photos/seed/darcom-sokhna/1920/1080","defaultKicker":"Ain Sokhna · Red Sea","defaultBadge":"Porto Sokhna & Galala","defaultTagline":"Waterfront chalets with private beach access & year-round sun","tint":"20, 110, 120"},
                      {"id":2,"key":"sahel","image":"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80","fallback":"https://picsum.photos/seed/darcom-sahel/1920/1080","defaultKicker":"North Coast · Mediterranean","defaultBadge":"Ras El Hekma & Marassi","defaultTagline":"Signature villas with private infinity pools & turquoise waters","tint":"18, 90, 145"},
                      {"id":3,"key":"gouna","image":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80","fallback":"https://picsum.photos/seed/darcom-gouna/1920/1080","defaultKicker":"El Gouna · Red Sea Riviera","defaultBadge":"Abu Tig Marina & Fanadir","defaultTagline":"Lagoon-side residences with private yacht berths & resort lifestyle","tint":"15, 120, 110"},
                      {"id":4,"key":"cairo","image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80","fallback":"https://picsum.photos/seed/darcom-cairo/1920/1080","defaultKicker":"New Cairo · Prime Compounds","defaultBadge":"Golden Square & Palm Hills","defaultTagline":"Ultra-luxury sky penthouses with panoramic private rooftop terraces","tint":"120, 95, 40"}
                    ]
                    """
                },
                new SiteContent
                {
                    ContentKey = "home.cities",
                    Description = "Homepage featured cities and destination mosaic",
                    ContentValue = """
                    [
                      {"name":"Ain Sokhna","slug":"ain-sokhna","blurb":"Red Sea weekends, 1h from Cairo","img":"https://picsum.photos/seed/darcom-sokhna/900/700"},
                      {"name":"New Cairo","slug":"new-cairo","blurb":"Family living, schools & clubs","img":"https://picsum.photos/seed/darcom-cairo/800/600"},
                      {"name":"North Coast","slug":"north-coast","blurb":"Summer capital of the Med","img":"https://picsum.photos/seed/darcom-sahel/800/600"},
                      {"name":"Hurghada","slug":"hurghada","blurb":"Year-round sun & diving","img":"https://picsum.photos/seed/darcom-hurghada/800/600"},
                      {"name":"El Gouna","slug":"el-gouna","blurb":"Lagoon town, marina life","img":"https://picsum.photos/seed/darcom-gouna/800/600"}
                    ]
                    """
                },
                new SiteContent
                {
                    ContentKey = "home.types",
                    Description = "Architectural property types metadata and cards",
                    ContentValue = """
                    {
                      "chalet":{"image":"https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-chalet/800/600","icon":"bi-water","accentTag":"Beachfront Living","accentTagAr":"شواطئ خاصة","defaultTagline":"Direct beachfront living & private coastal escapes","arTagline":"إطلالات بحرية مباشرة وملاذات شاطئية خاصة"},
                      "villa":{"image":"https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-villa/800/600","icon":"bi-house-heart-fill","accentTag":"Private Estates","accentTagAr":"حمامات سباحة","defaultTagline":"Private infinity pools & expansive estate grounds","arTagline":"حمامات سباحة خاصة وحدائق واسعة راقية"},
                      "penthouse":{"image":"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-penthouse/800/600","icon":"bi-building","accentTag":"Sky Penthouses","accentTagAr":"تراس وبانوراما","defaultTagline":"Panoramic private rooftop sky terraces","arTagline":"تراسات بانورامية وإطلالات سحابية واسعة"},
                      "townhouse":{"image":"https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-townhouse/800/600","icon":"bi-houses-fill","accentTag":"Gated Compounds","accentTagAr":"مجتمعات راقية","defaultTagline":"Contemporary family residences in gated compounds","arTagline":"خصوصية عائلية عصرية داخل أرقى الكمبوندات"},
                      "duplex":{"image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-duplex/800/600","icon":"bi-layers-fill","accentTag":"Multi-level Space","accentTagAr":"طابقان فخمان","defaultTagline":"Two-level open-concept architectural residences","arTagline":"طابقان بتصميم عصري وأسقف مرتفعة فخمة"},
                      "apartment":{"image":"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-apartment/800/600","icon":"bi-building-check","accentTag":"Prime Addresses","accentTagAr":"مواقع استراتيجية","defaultTagline":"Serviced luxury homes & prime urban addresses","arTagline":"شقق فندقية راقية بمواقع حيوية متميزة"},
                      "studio":{"image":"https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80","fallback":"https://picsum.photos/seed/darcom-studio/800/600","icon":"bi-box-seam","accentTag":"Smart Investment","accentTagAr":"عوائد استثمارية","defaultTagline":"Smart luxury pieds-à-terre & high-yield retreats","arTagline":"استوديوهات ذكية وعوائد استثمارية مرتفعة"}
                    }
                    """
                },
                new SiteContent
                {
                    ContentKey = "home.premium",
                    Description = "Homepage premium dark split section content",
                    ContentValue = """
                    {
                      "kicker":"Exclusive",
                      "kickerAr":"حصري ومميز",
                      "title":"The premium collection",
                      "titleAr":"المجموعة الحصرية الاستثنائية",
                      "subtitle":"Sea-facing villas, private beaches and architect-designed penthouses — inspected, verified and presented with full documentation.",
                      "subtitleAr":"فلل شاطئية وبنتهاوس بتصميمات معمارية خاصة — مفحوصة وموثقة بالكامل.",
                      "image":"https://picsum.photos/seed/darcom-premium-villa/1000/900",
                      "points":[
                        {"icon":"bi-patch-check","text":"Verified ownership & papers","textAr":"ملكية وأوراق قانونية موثقة"},
                        {"icon":"bi-camera-video","text":"Direct developer terms","textAr":"عقود مباشرة مع كبار المطورين"},
                        {"icon":"bi-person-badge","text":"Dedicated senior advisor","textAr":"مستشار عقاري خاص ومخصص لك"}
                      ]
                    }
                    """
                },
                new SiteContent
                {
                    ContentKey = "home.whyus",
                    Description = "Homepage Why Darcom editorial points",
                    ContentValue = """
                    [
                      {"num":"01","title":"Verified before published","titleAr":"فحص وتدقيق قبل النشر","desc":"Ownership, papers and availability are checked by our team. Rejected listings never go public.","descAr":"يتم التحقق من الملكية والأوراق والجاهزية بواسطة فريقنا القانوني. القوائم غير المطابقة تُستبعد فوراً."},
                      {"num":"02","title":"One dedicated advisor","titleAr":"مستشار عقاري خاص بك","desc":"From initial search to contract signing and keys handover.","descAr":"يرافقك خبير استشاري متخصص من أول جولة استكشاف وحتى توقيع العقد واستلام المفاتيح."},
                      {"num":"03","title":"Direct developer terms","titleAr":"أفضل خطط سداد مباشرة","desc":"Exclusive payment schedules and official launch allocations.","descAr":"خطط دفع حصرية وتخصيصات مباشرة في مراحل الطرح الأولى دون وسطاء إضافيين."}
                    ]
                    """
                },
                new SiteContent
                {
                    ContentKey = "home.seller",
                    Description = "Private residence seller advisory section",
                    ContentValue = """
                    {
                      "headline":"هل تمتلك عقاراً فاخراً ترغب في بيعه بمصر؟",
                      "headlineEn":"Do you own a luxury property you want to sell in Egypt?",
                      "lead":"نمنح عقارك الحضور الذي يستحقه أمام دائرة مغلقة من المستثمرين الجادين ونخبة المشترين، مع عناية استشارية متكاملة وفحص دقيق خلال 48 ساعة.",
                      "leadEn":"We give your property the presence it deserves before an exclusive circle of serious investors and buyers.",
                      "stats":[
                        {"value":"48h","label":"فحص وتقييم عقاري فوري","labelEn":"Instant Valuation"},
                        {"value":"94%","label":"نسبة إتمام الصفقات بالسعر العادل","labelEn":"Fair-price closing rate"},
                        {"value":"1-on-1","label":"مستشار بيع خاص لكل مالك","labelEn":"Dedicated Sales Director"}
                      ]
                    }
                    """
                },
                new SiteContent
                {
                    ContentKey = "site.settings",
                    Description = "Global website contact details and social links",
                    ContentValue = """
                    {
                      "siteName":"Darcom",
                      "phone":"+20 100 000 0000",
                      "email":"concierge@darcom.eg",
                      "address":"التجمع الخامس، القاهرة الجديدة",
                      "addressEn":"Fifth Settlement, New Cairo, Egypt",
                      "whatsapp":"+201000000000",
                      "socials":{
                        "facebook":"https://facebook.com",
                        "instagram":"https://instagram.com",
                        "linkedin":"https://linkedin.com",
                        "youtube":"https://youtube.com",
                        "twitter":"https://twitter.com"
                      }
                    }
                    """
                },
                new SiteContent
                {
                    ContentKey = "footer.content",
                    Description = "Footer branding, about blurbs and badges",
                    ContentValue = """
                    {
                      "aboutAr":"المنصة العقارية الرقمية الرائدة في مصر للمصايف والفلل المستقلة والبنتهاوس الفاخر على سواحل البحر الأحمر والمتوسط وكمبوندات القاهرة الجديدة.",
                      "aboutEn":"Egypt's premier real estate platform for luxury second homes, beachfront chalets, private villas and sky penthouses.",
                      "verifiedBadgeAr":"وساطة واستشارات عقارية مرخصة رسمياً",
                      "verifiedBadgeEn":"Officially Licensed Advisory & Brokerage",
                      "copyright":"© 2026 Darcom Real Estate. All rights reserved."
                    }
                    """
                }
            );
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded initial CMS SiteContent.");
        }

        if (!await db.SiteContents.AnyAsync(s => s.ContentKey == "site.seo"))
        {
            db.SiteContents.Add(new SiteContent
            {
                ContentKey = "site.seo",
                Description = "Global CMS SEO overrides",
                ContentValue = """
                {
                  "home": {
                    "title": "Darcom | Luxury Real Estate & Summer Chalets in North Coast Egypt",
                    "description": "Discover beachfront chalets, luxury villas, and exclusive coastal residences in North Coast Egypt."
                  },
                  "properties": {
                    "title": "Properties for Sale & Rent in North Coast | Darcom",
                    "description": "Browse premium chalets, villas and apartments in Marassi, Hacienda, Telal and prime Sahel destinations."
                  },
                  "rent": {
                    "title": "Summer Chalets for Rent in North Coast | Darcom",
                    "description": "Book luxury summer chalets and villas for rent across North Coast Egypt."
                  },
                  "sell": {
                    "title": "List Your North Coast Property with Darcom",
                    "description": "Sell or rent your chalet or villa in North Coast Egypt through our verified advisory."
                  }
                }
                """
            });
            await db.SaveChangesAsync();
        }

        if (await db.Properties.AnyAsync()) return;

        var villages = await db.Villages.Include(v => v.Zones).ToListAsync();
        var defaultVillage = villages.First();
        var demoSeller = await db.Users.FirstOrDefaultAsync(u => u.Email == "seller@darcom.local");
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);

        var P = SeedCatalog.All;
        var refNo = 1000;
        foreach (var s in P)
        {
            var assignedVillage = villages[(refNo - 1000) % villages.Count];
            var assignedZone = assignedVillage.Zones.FirstOrDefault();

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
                VillageId = assignedVillage.Id,
                ZoneId = assignedZone?.Id,
                BuildingNumber = $"B-{(refNo % 25 + 1):D2}",
                OwnerId = demoSeller?.Id,
                CreatedByUserId = adminUser?.Id,
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
