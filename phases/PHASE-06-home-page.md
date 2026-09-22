# PHASE-06 — Home Page (Hero + Sections)

> Source: website.md sections #6, #7, #8, #9 (card v1)
> Depends on: PHASE-05 (shell), PHASE-03 (property APIs for featured lists)

## Goal
Build a premium, trustworthy, commercially-usable homepage that does NOT look AI-generated or template-like.

## Hero Section (most important)
- Full-screen or near-full-screen hero supporting background image AND background video + poster fallback.
- Video requirements: muted, autoplay, loop, playsInline, dark overlay, readable typography, lazy loading, optimized media, mobile fallback image (never hurt performance).
- Visual message: luxury, property, beach, architecture, lifestyle. Do NOT overload hero with elements.
- Headline concept: "Find a Place Worth Calling Home." + subheading.
- Premium search interface (must look like a real product, not a Bootstrap demo) with: Buy/Rent toggle, Property Type, Location, Min Price, Max Price, Bedrooms, Search button → navigates to `/properties?purpose=...&type=...&...`.

## Home Sections (visual rhythm — NEVER identical cards everywhere)
1. Hero, 2. Featured Properties, 3. Browse By Property Type, 4. Popular Locations, 5. Premium/Exclusive Properties, 6. Why Choose Us, 7. Investment Opportunities, 8. Lifestyle/Destination (editorial/full-width), 9. Testimonials, 10. CTA, 11. Footer.
- Mix layouts: image-focused, card-focused, typography-focused, split-layout, editorial, full-width. Use asymmetry + whitespace intelligently; restrained colors; strong typography; large photography.

## PropertyCard v1 (reused in later phases)
Large image (correct aspect ratio), type, sale/rent badge, favorite button, price, title, location, bedrooms/bathrooms/area, short description, View Details button. Optional: Featured/New/Verified/SeaView/Pool/BeachAccess badges. Subtle hover only — no over-animation. Must feel premium.

## Deliverables
- `pages/Home/Home.jsx + Home.css`, `components/SearchBar/`, `components/PropertyCard/` finalized, hero video/image assets optimized (WebP/AVIF, lazy below-fold).
- Search wires query params to listing page; featured sections consume `GET /api/properties/featured`.

## Out of Scope
Full listing filters (PHASE-07), details page (PHASE-08).

## Acceptance Criteria
1. Hero video plays muted/looped on desktop, shows poster image on mobile; Lighthouse media weight reasonable.
2. Search with any combination lands on `/properties` with correct query params and results.
3. No two consecutive sections share the same layout/background; page passes "anti-AI" review (no gradients-everywhere, no floating blobs, no centered-everything).

## Verification
1. Test hero on desktop + mobile + slow-3G.
2. Click every home CTA — all navigate to valid routes, none dead.
3. Visual review at 1440px / 768px / 375px.
