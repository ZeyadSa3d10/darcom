# PHASE-08 — Property Details Page (Gallery, Info, Amenities, Location, Agent)

> Source: website.md sections #12, #13, #14, #15, #16, #17, #18, #53, #54
> Depends on: PHASE-03, PHASE-05, PHASE-07

## Goal
Build the most important page — a premium, immersive property presentation at `/properties/:slug` where a buyer understands the property within seconds.

## Above the Fold (instant comprehension)
Property title, location, price, purpose + type + reference number + availability + verification status, main media, core stats (bedrooms, bathrooms, area, floor, parking, year built with clean icon+text), primary action button (label adapts: Sale → "Buy Now", Rent → "Request Rental", Investment → "Request Investment Details"). Primary action always easy to find; on mobile use sticky bottom bar (Call / WhatsApp / Request).

## Media Gallery (major part of page — never tiny)
Swiper.js: main large image + thumbnails, fullscreen + lightbox, video playback, virtual tour + floor plans slots, keyboard navigation, mobile swipe. Lazy-load; poster fallbacks; meaningful alt text.

## Progressive Reveal
1. Description (Overview / Interior / Exterior / Views / Finishing / Location / Lifestyle) with "Read More" for long text.
2. Amenities organized grid (pool, garden, sea view, beach access, parking, security, elevator, AC, furnished, kitchen, balcony, terrace, gym, clubhouse, kids area, smart home, BBQ) — consistent hierarchy, not random text.
3. Location: address, area, city, nearby landmarks, distance to beach/airport/key places + map integration architecture. NEVER expose sensitive private owner info.
4. Agent: photo, name, role, agency, phone, email, verified status + Call / WhatsApp / Send Inquiry (no unnecessary private data).
5. Similar Properties ("Similar Properties" — same type + location + similar price/area; architecture ready for future recommendation engine).

## Deliverables
- `pages/PropertyDetails/PropertyDetails.jsx + PropertyDetails.css` + `components/{PropertyGallery,PropertyHeader,PropertyStats,PropertyAmenities,PropertyDescription,PropertyLocation,AgentCard,InquiryForm}/`.
- Consumes `GET /api/properties/slug/{slug}` + related endpoint; media from API data only (placeholder architecture makes swapping to real media trivial).

## Out of Scope
Checkout submission (PHASE-09), admin editing (PHASE-10).

## Acceptance Criteria
1. Opening `/properties/sea-view-chalet-ain-sokhna` shows gallery + price + stats + CTA without scrolling on desktop.
2. Gallery supports images + video + fullscreen + keyboard + swipe with no layout shift.
3. Purpose label/CTA changes correctly across sale/rent/investment properties.

## Verification
1. Test with sale, rent, and investment properties.
2. Test gallery with 1 image vs 15 images + video.
3. Test mobile sticky action bar; test RTL mirroring of gallery/breadcrumbs.
