# PHASE-03 — Property Core APIs, Search, Statuses & Business Rules

> Source: website.md sections #25, #27, #28 (property APIs), #46, #55
> Depends on: PHASE-01, PHASE-02

## Goal
Build the core property catalog APIs with server-side search, filtering, sorting, pagination, slug routing, and strict business-rule enforcement.

## APIs
```
GET /api/properties?purpose=sale&type=chalet&location=ain-sokhna&minPrice=&maxPrice=&bedrooms=&bathrooms=&area=&furnished=&pool=&seaView=&beachAccess=&parking=&featured=&sort=&page=1&pageSize=12
GET /api/properties/{id}
GET /api/properties/slug/{slug}
GET /api/properties/featured
GET /api/properties/search?q=
POST /api/properties               (Seller/Agent/Admin)
PUT /api/properties/{id}           (owner or Admin)
DELETE /api/properties/{id}        (owner or Admin, soft/archive preferred)
```
Search by title, location, property type, description (where appropriate). NEVER return thousands of records — server-side pagination mandatory (`page`, `pageSize`, default 12, max cap).

## Business Rules (enforced server-side, re-checked on every write)
- SOLD property cannot accept new purchase requests.
- RENTED property cannot accept new rental requests.
- Rejected property is never publicly visible.
- Only Approved/Published properties are publicly listed.
- Only authorized users can edit their own properties; Admins manage everything.
- Purchase/request operations are transactional: prevent duplicate requests, invalid states, purchasing unavailable properties. Server re-checks availability — NEVER trust frontend state.

## Status Flow
Draft → Pending Review → Published / Featured / Reserved / Sold / Rented / Archived / Rejected. API must expose status clearly; public list endpoints return only Published/Featured/Reserved (+ Sold/Rented flagged read-only where needed).

## Deliverables
- `PropertiesController` (thin) + `PropertyService` + `PropertyRepository` + DTOs (list, details, create, update) + validators + mapping + pagination envelope `{ data, page, pageSize, totalCount, totalPages }`.
- Indexes verified for filter columns; EF queries use `AsNoTracking` for reads, projection to DTOs.
- Tests: property creation, approval gating, publishing visibility, sold-property protection, pagination correctness, invalid-filter handling.

## Out of Scope
No media upload logic (PHASE-04), no frontend (PHASE-05+).

## Acceptance Criteria
1. Public list returns paginated DTOs; `page=1&pageSize=12` works; requesting page 999 returns empty data with correct totals, not an error.
2. Unpublished/rejected properties are invisible to anonymous callers.
3. Attempting a purchase write against a SOLD property fails server-side even if the client bypasses UI checks.

## Verification
1. Seed 20+ properties, page through all filters/sorts via Swagger.
2. Run business-rule tests green.
3. Profile one filtered query — confirm index usage, no full-table scan on large sets.
