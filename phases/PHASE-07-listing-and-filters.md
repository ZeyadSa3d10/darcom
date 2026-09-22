# PHASE-07 — Properties Listing, Filters & Search Experience

> Source: website.md sections #9 (final), #10, #11, #42 + #43 (listing states)
> Depends on: PHASE-05, PHASE-06 (card), PHASE-03 (listing APIs)

## Goal
Build the practical, searchable `/properties` listing experience with shareable URLs, professional filtering, and solid loading/empty states.

## Route & Features
`/properties` with: search, filters, sorting, pagination, grid/list mode toggle, results count.
Filters: purpose, property type, location, price range, bedrooms, bathrooms, area, furnished, pool, sea view, beach access, parking, featured.

## URL Contract (SEO-friendly + shareable + back-button safe)
```
/properties?purpose=sale&type=chalet&location=ain-sokhna&minPrice=..&maxPrice=..&beds=..&page=1
```
Every filter/sort/page change syncs to URL; loading from URL restores state.

## Filter Experience
- Desktop: professional sidebar/filter panel.
- Mobile: bottom-sheet or offcanvas panel — NEVER force mobile users to scroll an enormous sidebar.
- Clear Filters + Apply Filters + active filter chips (removable). Sort control + pagination component.
- States: `SkeletonCard` grid while loading; empty state ("No properties found." + icon + useful action e.g. Clear Filters); error + retry; never blank.

## PropertyCard Final
As defined in PHASE-06, plus correct purpose-driven CTA label adaptation hook (Buy Now / Request Rental / Request Investment Details surfaced on card or details — see PHASE-08/09).

## Deliverables
- `pages/Properties/Properties.jsx + Properties.css`, `components/FilterSidebar/`, `components/PropertyGrid/`, `components/Pagination/`, filter-chips UI.
- `propertyService.listProperties(params)` wired to `GET /api/properties` with debounce on search input, server-side pagination only.

## Out of Scope
Details page (PHASE-08), favorites persistence UI beyond button state (PHASE-09).

## Acceptance Criteria
1. Copy-pasting a filtered URL reproduces identical results; browser back/forward restores filters.
2. Filtering by price/bedrooms/sea-view returns correct server-filtered subsets (verified against API), with accurate results count.
3. Mobile filter opens as sheet/offcanvas with Apply/Clear; desktop shows sidebar.

## Verification
1. Test 10+ filter combinations + sorting + pagination to last page.
2. Test empty-result query shows designed empty state.
3. Test at 375px width — no horizontal overflow, cards stack cleanly.
