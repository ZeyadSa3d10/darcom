# PHASE-10 — Admin Dashboard & Property Management

> Source: website.md sections #23, #24, #45 (UI)
> Depends on: PHASE-02, PHASE-03, PHASE-04

## Goal
Build a separate, operational (not marketing-styled) admin interface for managing the entire marketplace.

## Dashboard Metrics
Total Properties, Active Properties, Pending Properties, Total Users, Purchase Requests, Rental Requests, Revenue/transaction metrics (where applicable), Property Views, Inquiries. Cards link to filtered management tables.

## Management Sections
Properties, Users, Agents, Locations, Amenities, Property Types, Purchase Requests, Booking Requests, Messages, Reviews, Media, Settings, Audit Logs. Each: searchable/sortable/paginated table + detail drawer or page.

## Property Actions (with confirmation dialogs for destructive ops)
Create, Edit, Delete, Archive, Publish, Unpublish, Approve, Reject, Feature, Mark as Sold, Mark as Rented.
- Approval flow connects to PHASE-04 seller pipeline (Pending → Published/Rejected).
- Every admin action writes an Audit Log row (user, action, entity, entityId, timestamp, IP, old/new values) viewable in Audit Logs.

## Deliverables
```
frontend/src/pages/AdminDashboard/
├── AdminDashboard.jsx + AdminDashboard.css
├── components/AdminTables, AdminStats, ApprovalQueue, AuditViewer
└── adminService.js (GET /api/admin/properties, PUT /api/admin/properties/{id}/approve, ...)
```
Separate layout/sidebar from public site; operational density is fine here (but still clean — not a generic dashboard template).

## Out of Scope
Public-site polish (PHASE-11).

## Acceptance Criteria
1. Admin can approve a seller Pending property → it goes Published and appears publicly; reject → stays hidden with reason + notification to seller.
2. Mark as Sold/Rented immediately blocks new requests (verified with buyer-role attempt).
3. Delete/Archive require typed or modal confirmation; audit row exists for each action.

## Verification
1. Walk seller-submit → admin-approve → public-visible → mark-sold → buyer-blocked loop.
2. Review audit log after role change + property edit + delete.
3. Test all tables with 100+ rows: pagination/sort/search performant.
