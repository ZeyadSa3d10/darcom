# PHASE-04 — Media, Favorites, Purchase/Rental Requests, Seller Flow, Notifications, Audit

> Source: website.md sections #19, #21, #22, #26, #44, #45
> Depends on: PHASE-02, PHASE-03

## Goal
Implement all transactional backend features around the property: media references, favorites, multi-step purchase/rental request lifecycle, seller submission pipeline, notifications, and audit logging.

## 1. Media Management (references only)
Tables: PropertyImages, PropertyVideos, PropertyDocuments — each stores URL, type, order, isPrimary, altText, createdAt.
- NEVER store large videos in SQL Server. Store in object/cloud storage; DB holds URLs.
- Architecture must allow swapping Cloudinary / Azure Blob / AWS S3 / Local-dev WITHOUT rewriting business logic (`IStorageProvider` interface + per-env implementation, configured via env vars).

## 2. Favorites
```
POST /api/favorites { propertyId }
DELETE /api/favorites/{propertyId}
GET /api/favorites/my
```
DB unique constraint (UserId + PropertyId) prevents duplicates (return idempotent success or 409 — document choice).

## 3. Purchase / Rental Request Flow (backend state machine)
```
POST /api/purchase-requests
GET /api/purchase-requests/my
GET /api/admin/purchase-requests
PUT /api/admin/purchase-requests/{id}/status
POST /api/booking-requests        (rentals)
GET /api/booking-requests/my
```
Steps captured: (1) property confirmation (property, price, reference, location), (2) customer info (fullName, email, phone, country, city, nationalID/passport where legally required, preferred contact, address, notes), (3) purchase info (payment method, financing required?, preferred appointment, timeline), (4) review, (5) submit → returns Request Number + date + property + status.
Statuses: Pending, Under Review, Contacted, Negotiation, Approved, Rejected, Completed, Cancelled. Submitting a request NEVER means legal purchase — response copy must say "Your request has been submitted."

## 4. Seller Submission Pipeline
`POST /api/seller/properties` (title, description, type, purpose, price, location, features, amenities, image/video/floor-plan refs, contact info) → Draft → Pending Review → Published / Rejected / Archived. Admin approval required before publication when moderation is enabled.

## 5. Notifications (DB-persisted)
Events: new purchase request, request status changed, property approved/rejected, new inquiry. Schema supports user targeting + read/unread + future push.

## 6. Audit Logging
Log: user, action, entity, entityId, timestamp, IP (where appropriate), oldValue, newValue. Cover: property approved/edited/deleted, user role changed.

## Deliverables
- Controllers (thin) + services + DTOs + validators for each area above; storage provider abstraction + local-dev implementation.
- Tests: favorite duplication blocked, duplicate purchase request blocked, sold-property request rejected, seller cannot publish without approval, audit row written on admin approve.

## Out of Scope
No frontend for these flows (PHASE-09/10), no admin UI (PHASE-10).

## Acceptance Criteria
1. Favorite same property twice → constraint enforced, no duplicates.
2. Full request lifecycle (Pending → Approved/Rejected) transitions correctly with notification + audit rows.
3. Swapping `Storage:Provider` from Local to another implementation requires config change only.

## Verification
1. Run all transactional tests green.
2. Manually walk seller Draft → Pending → Published via Swagger as seller + admin roles.
