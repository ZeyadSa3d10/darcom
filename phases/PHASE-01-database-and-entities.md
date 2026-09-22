# PHASE-01 — Database Design, Entities & Migrations

> Source: website.md sections #3, #4, #5, #25, #56 (plan), #60
> Depends on: PHASE-00

## Goal
Design and implement the professional relational SQL Server database with EF Core entities, configurations, migrations, and base seed data.

## Tables (minimum)
Users, Roles, Properties, PropertyTypes, PropertyImages, PropertyVideos, PropertyFeatures, Amenities, PropertyAmenities, Locations, Cities, Areas, Agents, Favorites, PropertyInquiries, PurchaseRequests, BookingRequests, Payments, Documents, Notifications, Reviews, ContactMessages, PropertyViews, SearchHistory, AuditLogs.

## Property Fields (minimum)
ID, Title, Slug (unique), Description, PropertyTypeId, Status, Purpose (Sale/Rent/Investment), Price (decimal(18,2)), Currency, Area, Bedrooms, Bathrooms, Floor, TotalFloors, BuiltYear, DeliveryDate, FurnishedStatus, FinishingStatus, Parking, Garden, Pool, SeaView, BeachAccess, LocationId, Address, Latitude, Longitude, Developer/Owner, AgentId, CreatedAt, UpdatedAt.

## Property Types (extensible architecture)
Chalet, Apartment, Villa, Townhouse, Duplex, Penthouse, Studio, Twin House, Standalone Villa, Commercial Property, Land. Adding a new type later must NOT require rewriting the system (lookup table `PropertyTypes`, not enums hard-coded in UI).

## Property Status (locked set)
Draft, Pending Review, Published, Featured, Reserved, Sold, Rented, Archived, Rejected. UI + API must clearly communicate status (enforced in PHASE-03/04, defined here).

## DB Rules
- Proper PKs, FKs, indexes (Slug, LocationId, PropertyTypeId, Status, Purpose, Price), unique constraints (Slug; UserId+PropertyId on Favorites), nullable fields where correct, decimal precision for prices, cascade/restrict rules, audit fields.
- Never store large videos inside SQL Server — store URL/type/order/isPrimary/altText/createdAt references only (storage providers wired in PHASE-04).

## Deliverables
- `Backend/Domain/Entities/*.cs` + `Backend/Infrastructure/Persistence/Configurations/*.cs` + `DbContext`.
- EF Core migration(s) + migration run instructions.
- Seed: roles (Admin, Agent, Seller, Buyer) + admin account via configuration/setup (NEVER hard-coded production credentials) + at least 20+ realistic properties across types/locations/prices/amenities/statuses (no "Property 1", "Test Villa").
- Realistic content structure, e.g. "Luxury 2-bedroom chalet overlooking the Red Sea..." — easy to replace later; media comes from API data, never hard-coded URLs in components.

## Out of Scope
No auth logic, no API controllers beyond health check, no frontend.

## Acceptance Criteria
1. `dotnet ef migrations add InitialCreate` + `dotnet ef database update` succeed against SQL Server.
2. All FKs/indexes/unique constraints verified in SSMS or script.
3. Seed produces 20+ properties with varied types and valid slugs (e.g. `/properties/sea-view-chalet-ain-sokhna`).

## Verification
1. Run migrations on a clean database.
2. Query row counts per table.
3. Confirm duplicate Slug and duplicate Favorite are rejected by constraints.
