# PHASE-09 — User Accounts, Favorites, Purchase Flow & Seller Flow (Frontend)

> Source: website.md sections #19, #20, #21 (frontend), #26, #52
> Depends on: PHASE-02, PHASE-04, PHASE-05, PHASE-08

## Goal
Build all authenticated user-facing flows: auth pages, dashboard, favorites, trustworthy multi-step purchase/rental requests, and seller property submission.

## 1. Auth Pages & Dashboard
Pages: Register, Login, Forgot/Reset Password, Profile (edit + change password) — each with own CSS, professional labels/validation/loading/success states.
Dashboard (`/account`): My Requests, Favorites, Viewed Properties, Notifications, Profile, Documents (where applicable). Empty states designed: "No favorites yet.", "No purchase requests yet." (icon + message + action).

## 2. Favorites
Add/remove/view favorites (authenticated). Button state syncs with `favoriteService`; list page uses grid of PropertyCards. Duplicate prevention handled server-side (PHASE-04); UI is idempotent and optimistic-safe.

## 3. Buy / Purchase Flow (NEVER immediate purchase)
Clicking "Buy This Property" opens a trustworthy stepped flow (`/checkout/:slug` or modal wizard):
1. Property confirmation (property, price, reference, location).
2. Customer info (fullName, email, phone, country, city, nationalID/passport when legally required, preferred contact, address, notes).
3. Purchase info (payment method, financing required?, preferred appointment, expected timeline).
4. Review.
5. Submit → success screen: "Your request has been submitted." + Request Number + date + property + status (Pending...). Copy must NEVER claim legal purchase occurred.

## 4. Seller Flow
`Sell` page (seller permission): Add Property form (title, description, type, purpose, price, location, features, amenities, images/videos/floor-plan uploads via storage provider, contact info) → submits as Draft/Pending Review; status tracker (Draft / Pending Review / Published / Rejected / Archived); admin approval required before publication.

## Deliverables
- `pages/{Login,Register,Profile,Favorites,Checkout,Sell}/` + `components/{FavoriteButton,PurchaseRequestForm,InquiryForm}/` + `purchaseService`, `favoriteService`, `userService` wired.
- Guards: SOLD blocks purchase CTA, RENTED blocks rental CTA (both UI + server re-check).

## Out of Scope
Admin dashboard (PHASE-10).

## Acceptance Criteria
1. Full buyer journey works: register → favorite → start purchase → submit → see request in dashboard with Request Number.
2. Seller journey works: submit property → sees Pending Review → (admin approves in PHASE-10) → Published visible.
3. All forms show backend validation errors per-field; no placeholder-only inputs.

## Verification
1. Walk buy, rent, and investment flows end-to-end.
2. Attempt purchase on SOLD property — blocked with clear message.
3. Test auth edge cases: expired token, password reset, profile update.
