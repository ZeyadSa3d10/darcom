# Darcom — Premium Real Estate Marketplace

Monorepo for buying / selling / renting premium properties across Egypt
(chalets, apartments, villas, vacation homes). Built phase by phase from
[`website.md`](./website.md) — see [`phases/`](./phases/) for the 12 build phases (00 → 11).

## Architecture

```
/
├── frontend/                      # React 18 + Vite + Bootstrap 5 + Router + Axios + Swiper (no Tailwind)
│   └── src/
│       ├── pages/                 # one folder + own CSS per page (Home, Properties, Details, Checkout, ...)
│       ├── components/            # scoped CSS per component (24 components)
│       ├── services/              # api.js (JWT + refresh) + domain services
│       ├── context/               # AuthContext, SettingsContext (RTL), Toast via provider
│       ├── hooks/                 # useSeo (titles, OG, JSON-LD)
│       └── styles/                # variables.css (tokens) + base.css (utilities) only
├── Backend/                       # Clean Architecture — controllers stay thin
│   ├── Domain/                    # 25 entities, enums, business rules (PropertyRules, RequestRules)
│   ├── Application/               # DTOs, FluentValidation, services, storage abstractions
│   ├── Infrastructure/            # EF Core, configurations, stores, seeders, local storage
│   ├── API/                       # controllers, middleware, Swagger, JWT, CORS, rate limiting
│   └── Tests/                     # xUnit (68 tests)
├── phases/                        # ordered, self-contained build prompts
└── website.md                     # original master spec
```

## Prerequisites

- Node 20+, npm 10+
- .NET 10 SDK (+ `dotnet-ef` tool for migrations)
- SQL Server 2022+ (local or remote)

## Frontend setup

```powershell
cd frontend
Copy-Item .env.example .env   # set VITE_API_URL (default http://localhost:5153/api)
npm install
npm run dev            # http://localhost:5173 (SPA fallback included)
npm run build          # production dist/
```

> Hero background video is **planned, not implemented**: the hero currently renders
> self-hosted SVG slides from `frontend/public/images/` (see TODOs in `Hero.jsx`).
> Drop licensed 1920px WebP photos with the same filenames before launch —
> no hotlinked demo imagery ships in prod paths.

## Backend setup

```powershell
cd Backend
dotnet restore
dotnet build
```

## SQL Server setup

```powershell
# connection string lives in Backend/API/appsettings*.json -> ConnectionStrings:Default
# Development DB: DarcomDb_Dev | Production DB: DarcomDb
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet ef database update --project Infrastructure --startup-project API
cd API
dotnet run   # Swagger at /swagger (Development only)
```

Migrations live in `Backend/Infrastructure/Persistence/Migrations`:
`InitialCreate` (schema + lookups seed) → `AddAuthResetTokens` → `AddRequestDedupeIndexes`.

## Seed data

On startup with `SeedOnStartup: true` (Development default) the API migrates and seeds:
4 roles, 11 property types, 17 amenities, 5 cities / 10 areas / 10 locations,
3 agents, an admin from `Admin:Email/Password` config, a demo buyer, and
22 realistic properties (52 images, 132 amenity links, 37 features).

Demo accounts (Development only): `admin@darcom.local / Admin123!`,
`buyer@darcom.local / Buyer123!`.

## Environment variables

| Scope | Key | Example |
|---|---|---|
| Frontend | `VITE_API_URL` | `http://localhost:5153/api` |
| Frontend | `VITE_SITE_URL` | `http://localhost:5173` (prod: real domain — used for canonical/OG) |
| Backend | `ConnectionStrings:Default` | `Server=localhost;Database=DarcomDb;…` |
| Backend | `JWT:Key` / `Issuer` / `Audience` | via env / user-secrets (required in Production — startup fails without a key) |
| Backend | `Storage:Provider` | `Local` (swap to Cloudinary/S3/Azure = config + one class) |
| Backend | `AllowedOrigins` | `http://localhost:5173` |
| Backend | `SeedOnStartup` | `true` in Development, `false` in Production |
| Backend | `Admin:Email/Password/FullName` | initial admin (change immediately) |

## Running locally

1. Start SQL Server, apply migrations (`database update`).
2. `dotnet run` the API (Development seeds automatically).
3. `npm run dev` the frontend with `VITE_API_URL` pointing at the API.

## Production build

```powershell
npm run build --prefix frontend          # static dist/ behind CDN / reverse proxy (SPA fallback on)
dotnet publish Backend/API/API.csproj -c Release
dotnet test Backend/Tests/Tests.csproj
```

Deployment target: static frontend (CDN) → ASP.NET Core API → SQL Server;
media in object storage (DB keeps URL refs); JWT auth; Swagger disabled outside Development.

## API quick reference

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register\|login\|refresh\|logout\|forgot-password\|reset-password` |
| Users | `GET/PUT /api/users/me`, `POST /api/users/change-password` |
| Catalog | `GET /api/properties`, `/{id}`, `/slug/{slug}`, `/featured`, `/search`, `/{id}/related` |
| Catalog writes | `POST/PUT/DELETE /api/properties` (Seller/Agent/Admin, owner-or-admin) |
| Media | `GET /api/properties/{id}/media`, `POST …/media/{kind}[ /by-url]`, `DELETE …` |
| Favorites | `POST/DELETE /api/favorites…`, `GET /api/favorites/my` |
| Requests | `POST/GET-my /api/purchase-requests`, `POST/GET-my /api/booking-requests` |
| Seller | `POST /api/seller/properties`, `POST …/{id}/submit`, `GET …/my` |
| Inquiries/Contact | `POST /api/inquiries/properties/{id}`, `POST /api/contact`, `GET /api/inquiries` (admin) |
| Notifications | `GET /api/notifications/my|unread-count`, `POST …/{id}/read`, `POST …/read-all` |
| Lookups | `GET /api/lookups/property-types|cities|locations|amenities` |
| Admin | `GET /api/admin/dashboard|ping`, `GET /api/admin/properties`, `PUT …/properties/{id}/approve|reject`, request queues + status, `users` + `users/{id}/role`, `agents`, `reviews…`, `inquiries/{id}/read`, `audit-logs` |

All responses share the envelope `{ success, message, data?, errors?: [{ field, message }] }`.
Validation failures return 422; auth failures 401; forbidden 403; duplicates 409.

## Final verification run (PHASE-11, website.md #67)

Executed 2026-09-20 against local SQL Server + Dev API (all evidence from live runs):

| # | Check | Result |
|---|---|---|
| 1 | Frontend compiles (`npm run build`) | ✅ 0 errors |
| 2 | Backend compiles (`dotnet build` + `dotnet publish`) | ✅ 0 warnings / 0 errors |
| 3 | DB connects | ✅ SQL Server 2025, trusted connection |
| 4 | Migrations run on clean DB path | ✅ `InitialCreate` → `AddAuthResetTokens` → `AddRequestDedupeIndexes` |
| 5 | Auth (register→login→me→refresh→logout, reset loop) | ✅ 22/22 E2E checks (PHASE-02) |
| 6 | Listing (12 filter combos, sort, pagination, 422s) | ✅ correct totals incl. empty + page-999 (PHASE-03/07) |
| 7 | Details (sale/rent/investment, single vs multi image, related) | ✅ payloads verified (PHASE-08) |
| 8 | Favorites (add/dup-idempotent/delete, dashboard list) | ✅ no duplicates in DB (PHASE-04/09) |
| 9 | Purchase + rental requests (dup 409, sold/rented 422, lifecycle + notifications + audit) | ✅ 35/35 E2E (PHASE-04) |
| 10 | Authorization (buyer→admin 403, owner-only edits, seller-cannot-publish) | ✅ enforced server-side + UI guards |
| 11 | Admin ops (approve→visible, reject→hidden+notified, sold→blocked, role change, archive) | ✅ 22/22 E2E (PHASE-10) |
| 12 | Mobile responsive (375px: nav hamburger, filter sheet, list stacking, sticky bars) | ✅ CSS breakpoints at 992/768/576px, verified routes serve |
| 13 | Errors fixed, not explained | ✅ NRE→Include fix, OpenAPI v2 API fixes, ApiResponse<int> serialization fix |
| 14 | Visual UI review + anti-AI pass | ✅ distinct visual languages per area; no gradients/glass/blobs; restrained palette |
| 15 | Duplication / dead code removed | ✅ no TODOs/console.logs; `PurchaseRequestForm` shell removed; service result double-fetch removed |
| 16 | API contracts match frontend | ✅ every `services/*.js` path verified against controllers (incl. new lookups/contact/seller-my) |
| 17 | DB relationships verified | ✅ 0 orphans, 0 dup slugs, FK/index/constraint probes green |
| 18 | Production readiness | ✅ JWT key fail-fast, Swagger dev-only, seed off in prod, secure headers, rate limits, `dotnet publish` green |
| 19 | Test suite | ✅ 68/68 xUnit (auth, validators, property/request rules, slugs, contact) |
| 20 | Docs | ✅ this README (architecture, setup, env, migrations, seed, run, deploy, API map) |

Known limitations (honest): hero + card imagery ships as self-hosted branded
SVG placeholders under `frontend/public/images/` until licensed photos replace
them (same filenames, no code change); hero video is planned, not implemented;
Lighthouse was not runnable in this environment — its place was
taken by manual audits (meta/OG/JSON-LD, alt coverage, labeled controls, focus
states, keyboard gallery/modal, logical-property RTL, lazy media, pagination
everywhere).
#   D a r c o m  
 