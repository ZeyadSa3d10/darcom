# PHASE-05 — Frontend Shell, Design System, Routing & API Layer

> Source: website.md sections #33, #34, #35, #36, #37 (base), #48, #49, #50, #51, #52
> Depends on: PHASE-00 (APIs assumed from PHASE-02/03/04, but this phase builds no pages beyond shell)

## Goal
Build the frontend application shell: routing, central API client, shared state, reusable components, Navbar/Footer, design-system implementation, and form standards — so PHASE-06+ pages can be built without rework.

## Deliverables
```
frontend/src/
├── pages/{Home,Properties,PropertyDetails,Contact,Checkout,Favorites,Login,Register,Profile,AdminDashboard}/  # shells + own .css each
├── components/{Navbar,Footer,PropertyCard,PropertyGrid,SearchBar,PropertyFilters,PropertyGallery,PropertyHeader,PropertyStats,PropertyAmenities,PropertyDescription,PropertyLocation,AgentCard,FavoriteButton,InquiryForm,PurchaseRequestForm,Modal,Toast,Pagination,Breadcrumbs,LoadingSkeleton}/  # each with own .jsx + .css
├── services/{api.js,authService,propertyService,favoriteService,userService,purchaseService,adminService,locationService}.js
├── context/{AuthContext,SettingsContext}.jsx   # auth/session/favorites-only shared state; forms/gallery/toggles stay local
├── styles/{variables.css,base.css}
└── App.jsx (router) + main.jsx
```

## Requirements
- **Axios client:** baseURL from `VITE_API_URL`, attaches JWT, handles refresh-token retry, timeouts, and structured-error normalization (`{success:false,message,errors}`).
- **Navbar (desktop):** Logo, Properties, Buy, Rent, Sell, Locations, About, Contact + Favorites + Login/Account. Mobile: clean hamburger. Sticky where appropriate; transitions properly over Hero (transparent → solid). Fully responsive, RTL-ready (`dir="rtl"` flips nav/cards/forms correctly — not just text).
- **Footer:** Company, Properties, Locations, Resources, Support, Legal, Social + Privacy, Terms, Cookies, Contact.
- **Design system:** ONE primary brand color, neutral backgrounds, strong typography (display/body/metadata hierarchy), proper spacing, consistent borders, controlled shadows, professional iconography (Bootstrap Icons). NO rainbow colors, NO purple/blue gradients, NO glass-everywhere, NO neon/glow, NO huge rounded containers, NO random animations.
- **Forms standard:** clear labels (never placeholder-only), required indicators, per-field validation messages from backend, loading + success states.
- **CSS rule:** each page/component owns its CSS; global holds only tokens/utilities. No 3000-line App.css.
- **Anti-AI rule:** shell must look like a real company product — intentional composition, whitespace, restrained color. Marketing vs listing vs details vs admin each get distinct visual language later; shell must allow that.

## Out of Scope
No Home content (PHASE-06), no listing logic (PHASE-07), no details content (PHASE-08).

## Acceptance Criteria
1. All routes render shell states (loading/skeleton/error/empty) with no blank screens; direct URL navigation works.
2. Auth context persists session across reload; 401 triggers refresh-or-logout correctly.
3. Navbar/Footer are pixel-consistent on desktop + mobile + RTL toggle.

## Verification
1. `npm run build` succeeds with no unusedato components warnings failing the build.
2. Toggle `dir="rtl"` — nav, cards, forms, breadcrumbs all mirror correctly.
3. Block API (offline) — shell shows error/retry states, not blank pages.
