# MASTER PROMPT — PREMIUM REAL ESTATE MARKETPLACE

You are a senior full-stack architect, senior React engineer, senior ASP.NET Core engineer, UI/UX designer, database architect, and product designer.

Your task is to BUILD a complete, production-ready real estate marketplace for buying and selling/renting premium properties, especially chalets, apartments, villas, and vacation properties.

The website must feel like a serious commercial real-estate platform built by a professional software/product team.

DO NOT make it look AI-generated.
DO NOT use generic AI dashboard aesthetics.
DO NOT use excessive gradients.
DO NOT use random colors.
DO NOT use unnecessary glassmorphism.
DO NOT use excessive rounded cards.
DO NOT make every section look identical.
DO NOT use template-like layouts.

The final result must look intentional, premium, trustworthy, modern, and commercially usable.

---

# 1. TECHNOLOGY STACK

## Frontend

Use:

* React
* Vite
* JavaScript or TypeScript
* Bootstrap 5
* React Router
* Axios
* Bootstrap Icons or another professional icon library
* Swiper.js for image/video galleries and carousels where appropriate

Do NOT use Tailwind CSS.

Do NOT create one giant CSS file.

Every page/major feature must have its own CSS file.

Example:

src/
├── pages/
│   ├── Home/
│   │   ├── Home.jsx
│   │   └── Home.css
│   ├── Properties/
│   │   ├── Properties.jsx
│   │   └── Properties.css
│   ├── PropertyDetails/
│   │   ├── PropertyDetails.jsx
│   │   └── PropertyDetails.css
│   ├── Contact/
│   │   ├── Contact.jsx
│   │   └── Contact.css
│   └── Checkout/
│       ├── Checkout.jsx
│       └── Checkout.css
│
├── components/
│   ├── Navbar/
│   ├── Footer/
│   ├── PropertyCard/
│   ├── SearchBar/
│   ├── FilterSidebar/
│   ├── PropertyGallery/
│   ├── PropertyFeatures/
│   ├── PropertyLocation/
│   ├── AgentCard/
│   └── ...
│
└── services/
└── api.js

Keep component styles scoped to their responsibility.

---

# 2. BACKEND

Use:

* ASP.NET Core Web API
* .NET 10
* Entity Framework Core
* SQL Server
* JWT Authentication
* Role-based authorization
* FluentValidation if appropriate
* Swagger/OpenAPI
* Clean Architecture

Recommended architecture:

Backend/
├── Domain/
├── Application/
├── Infrastructure/
└── API/

Do not put business logic directly inside controllers.

Controllers should remain thin.

Use:

* Entities
* DTOs
* Services
* Repositories where justified
* Validators
* Mapping
* Authentication service
* Authorization
* Exception handling
* Logging
* Pagination
* Filtering
* Sorting

---

# 3. DATABASE DESIGN

Design a professional relational SQL Server database.

At minimum consider:

Users
Roles
Properties
PropertyTypes
PropertyImages
PropertyVideos
PropertyFeatures
Amenities
PropertyAmenities
Locations
Cities
Areas
Agents
Favorites
PropertyInquiries
PurchaseRequests
BookingRequests
Payments
Documents
Notifications
Reviews
ContactMessages
PropertyViews
SearchHistory
AuditLogs

A Property should support:

* ID
* Title
* Slug
* Description
* Property Type
* Status
* Purpose
* Price
* Currency
* Area
* Bedrooms
* Bathrooms
* Floor
* Total Floors
* Built Year
* Delivery Date
* Furnished status
* Finishing status
* Parking
* Garden
* Pool
* Sea View
* Beach Access
* Location
* Address
* Latitude
* Longitude
* Developer/Owner
* Agent
* CreatedAt
* UpdatedAt

Do NOT duplicate unnecessary data.

Use proper:

* Primary Keys
* Foreign Keys
* Indexes
* Unique constraints
* Nullable fields
* Decimal precision
* Cascade/restrict rules
* Audit fields

Use SQL Server Decimal correctly for prices.

---

# 4. PROPERTY TYPES

The system must support multiple property types:

* Chalet
* Apartment
* Villa
* Townhouse
* Duplex
* Penthouse
* Studio
* Twin House
* Standalone Villa
* Commercial Property
* Land

The architecture must allow adding new property types later without rewriting the system.

---

# 5. PROPERTY PURPOSE

Support:

* For Sale
* For Rent
* For Investment

The UI must dynamically adapt depending on the purpose.

Example:

Sale:

"Buy Now"

Rent:

"Request Rental"

Investment:

"Request Investment Details"

---

# 6. HOME PAGE

Create a premium real-estate homepage.

The Home page must contain:

## HERO SECTION

This is extremely important.

Use a full-screen or near full-screen hero.

The hero supports:

* Background image
* Background video
* Poster image
* Overlay
* Elegant typography
* Search interface

The background must visually communicate:

* Luxury
* Property
* Beach
* Architecture
* Lifestyle

Do NOT put too many elements over the hero.

The Hero should have:

Headline

Example concept:

"Find a Place Worth Calling Home."

Subheading.

Then a premium property search interface.

Search controls:

* Buy / Rent
* Property Type
* Location
* Min Price
* Max Price
* Bedrooms
* Search button

The search component should look like an actual product, not a Bootstrap demo.

---

# 7. HERO VIDEO

Support background video.

Requirements:

* muted
* autoplay
* loop
* playsInline
* fallback poster image
* lazy loading where appropriate
* dark overlay
* readable typography
* mobile fallback image

Do not allow the video to hurt performance.

Use optimized media.

---

# 8. HOME SECTIONS

Create carefully designed sections:

1. Hero
2. Featured Properties
3. Browse By Property Type
4. Popular Locations
5. Premium / Exclusive Properties
6. Why Choose Us
7. Investment Opportunities
8. Lifestyle / Destination section
9. Customer testimonials
10. Call To Action
11. Footer

Do not make every section look the same.

Create visual rhythm.

Some sections should be:

* image-focused
* card-focused
* typography-focused
* split-layout
* editorial
* full-width

---

# 9. PROPERTY CARDS

Create a premium PropertyCard component.

Each card should include:

* Large image
* Property type
* Sale/Rent badge
* Favorite button
* Price
* Property title
* Location
* Bedrooms
* Bathrooms
* Area
* Short description
* View Details button

Optional:

* Featured badge
* New badge
* Verified badge
* Sea View
* Pool
* Beach Access

The image should have proper aspect ratio.

Use subtle hover interactions.

Do NOT over-animate.

Cards must feel premium.

---

# 10. PROPERTIES LISTING PAGE

Create:

/properties

Features:

* Search
* Filters
* Sorting
* Pagination
* Grid/List mode
* Results count

Filters:

* Purpose
* Property type
* Location
* Price range
* Bedrooms
* Bathrooms
* Area
* Furnished
* Pool
* Sea view
* Beach access
* Parking
* Featured

Use URL query parameters.

Example:

/properties?purpose=sale&type=chalet&location=ain-sokhna&minPrice=...

This allows:

* shareable searches
* browser navigation
* SEO-friendly URLs

---

# 11. FILTER EXPERIENCE

Desktop:

Professional sidebar/filter panel.

Mobile:

Bottom sheet or offcanvas filter panel.

Do not make mobile users scroll through an enormous filter sidebar.

Add:

Clear Filters

Apply Filters

Active filter chips.

---

# 12. PROPERTY DETAILS PAGE

This is one of the most important pages.

Route:

/properties/:slug

The page should feel like a premium property presentation.

---

# 13. PROPERTY DETAILS MEDIA GALLERY

At the top of the details page:

Large gallery.

Support:

* Images
* Videos
* Virtual tour
* Floor plans

Use:

Swiper.js

Features:

* Main large image
* Thumbnail navigation
* Fullscreen
* Lightbox
* Video playback
* Keyboard navigation
* Mobile swipe

Do not make the gallery tiny.

Media should be a major part of the page.

---

# 14. PROPERTY INFORMATION

Immediately below/around gallery:

Show:

* Property title
* Location
* Price
* Purpose
* Property type
* Reference number
* Availability
* Verification status

Then property statistics:

Bedrooms
Bathrooms
Area
Floor
Parking
Year Built

Use clean icon + text combinations.

---

# 15. PROPERTY DESCRIPTION

Create a professional description section.

Support long descriptions.

Include:

* Overview
* Interior
* Exterior
* Views
* Finishing
* Location
* Lifestyle

Use "Read More" when description is long.

---

# 16. AMENITIES

Create an organized amenities grid.

Examples:

* Swimming Pool
* Private Garden
* Sea View
* Beach Access
* Parking
* Security
* Elevator
* Air Conditioning
* Fully Furnished
* Kitchen
* Balcony
* Terrace
* Gym
* Clubhouse
* Kids Area
* Smart Home
* BBQ Area

Do not display amenities as random text.

Use consistent visual hierarchy.

---

# 17. LOCATION SECTION

Display:

* Address
* Area
* City
* Nearby landmarks
* Distance to beach
* Distance to airport
* Distance to important locations

Add map integration architecture.

Do not expose sensitive private owner information.

---

# 18. PROPERTY AGENT

Create an Agent section.

Display:

* Agent photo
* Name
* Role
* Agency
* Phone
* Email
* Verified status

Buttons:

Call
WhatsApp
Send Inquiry

Do not expose unnecessary private information.

---

# 19. BUY / PURCHASE FLOW

When the user clicks:

"Buy This Property"

Do NOT immediately process the purchase.

First create a professional purchase request flow.

Step 1:

Property confirmation.

Show:

Property
Price
Reference
Location

Step 2:

Customer information.

Collect:

* Full Name
* Email
* Phone
* Country
* City
* National ID / Passport number when legally required
* Preferred contact method
* Address when required
* Notes

Step 3:

Purchase information:

* Payment method
* Financing required?
* Preferred appointment
* Expected purchase timeline

Step 4:

Review information.

Step 5:

Submit purchase request.

Then display:

"Your request has been submitted."

Generate:

* Request Number
* Date
* Property
* Status

Statuses:

Pending
Under Review
Contacted
Negotiation
Approved
Rejected
Completed
Cancelled

Do not pretend that submitting a request means the property has legally been purchased.

---

# 20. USER ACCOUNT

Create authentication.

Users should be able to:

* Register
* Login
* Logout
* Forgot Password
* Reset Password
* Edit Profile
* Change Password

Dashboard:

* My Requests
* Favorites
* Viewed Properties
* Notifications
* Profile
* Documents where applicable

---

# 21. SELLER FLOW

Users with seller permissions should be able to:

Add Property

Fields:

* Title
* Description
* Type
* Purpose
* Price
* Location
* Property features
* Amenities
* Images
* Videos
* Floor plans
* Contact information

Property submission should go through:

Draft
Pending Review
Published
Rejected
Archived

Admin approval should be required before publication if the business model needs moderation.

---

# 22. PROPERTY MEDIA MANAGEMENT

Backend should support:

PropertyImages

PropertyVideos

PropertyDocuments

Store:

* URL
* Type
* Order
* IsPrimary
* AltText
* CreatedAt

Do NOT store large videos directly inside SQL Server.

Store media in proper object/cloud storage and save references/URLs in SQL Server.

The architecture must allow:

* Cloudinary
* Azure Blob Storage
* AWS S3
* Local storage for development

without rewriting business logic.

---

# 23. ADMIN DASHBOARD

Create a separate professional admin interface.

Dashboard:

* Total Properties
* Active Properties
* Pending Properties
* Total Users
* Purchase Requests
* Rental Requests
* Revenue / transaction metrics where applicable
* Property Views
* Inquiries

Management:

Properties
Users
Agents
Locations
Amenities
Property Types
Purchase Requests
Booking Requests
Messages
Reviews
Media
Settings
Audit Logs

---

# 24. ADMIN PROPERTY MANAGEMENT

Admin should be able to:

* Create
* Edit
* Delete
* Archive
* Publish
* Unpublish
* Approve
* Reject
* Feature
* Mark as Sold
* Mark as Rented

Use confirmation dialogs for destructive operations.

---

# 25. PROPERTY STATUS

Support:

Draft
Pending Review
Published
Featured
Reserved
Sold
Rented
Archived
Rejected

The UI must clearly communicate status.

---

# 26. FAVORITES

Authenticated users can:

* Add property to favorites
* Remove property
* View favorites

Prevent duplicates.

Use a database constraint for:

UserId + PropertyId

---

# 27. PROPERTY SEARCH

Backend must support efficient search.

Search by:

* Title
* Location
* Property type
* Description where appropriate

Use:

Filtering
Sorting
Pagination

Never return thousands of records unnecessarily.

Use server-side pagination.

Example:

?page=1&pageSize=12

---

# 28. API DESIGN

Create RESTful APIs.

Examples:

GET /api/properties
GET /api/properties/{id}
GET /api/properties/slug/{slug}

POST /api/properties
PUT /api/properties/{id}
DELETE /api/properties/{id}

GET /api/properties/featured
GET /api/properties/search

POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

POST /api/favorites
DELETE /api/favorites/{propertyId}

POST /api/purchase-requests
GET /api/purchase-requests/my

GET /api/admin/properties
PUT /api/admin/properties/{id}/approve

Use DTOs.

Never expose EF Core entities directly from public APIs.

---

# 29. SECURITY

Implement:

* JWT authentication
* Role-based authorization
* Password hashing
* Refresh tokens
* Input validation
* Rate limiting where appropriate
* CORS
* Secure headers
* SQL injection protection through EF Core
* Authorization checks
* Ownership validation

Roles:

Admin
Agent
Seller
Buyer

Never trust role/user IDs sent from frontend.

Always validate permissions server-side.

---

# 30. VALIDATION

Frontend validation AND backend validation.

Never rely only on frontend validation.

Examples:

Email
Phone
Price
Area
Required fields
File types
File sizes

Return professional API validation responses.

---

# 31. ERROR HANDLING

Create global backend exception handling.

Do not return raw exceptions to users.

Return structured responses.

Example:

{
"success": false,
"message": "Something went wrong.",
"errors": []
}

Frontend should have:

* Loading states
* Empty states
* Error states
* Retry states
* Skeleton loading

Do not leave blank screens.

---

# 32. RESPONSIVE DESIGN

Must work professionally on:

Desktop
Laptop
Tablet
Mobile

Breakpoints should be intentional.

Do not simply shrink desktop UI.

Mobile navigation should be redesigned properly.

---

# 33. NAVBAR

Professional navbar.

Desktop:

Logo
Properties
Buy
Rent
Sell
Locations
About
Contact

Actions:

Favorites
Login / Account

Mobile:

Clean hamburger menu.

Sticky navbar where appropriate.

Navbar should transition properly over the Hero.

---

# 34. FOOTER

Professional footer.

Sections:

Company
Properties
Locations
Resources
Support
Legal
Social

Include:

Privacy Policy
Terms
Cookies
Contact

---

# 35. VISUAL DESIGN SYSTEM

Create a consistent design system.

Use:

* One primary brand color
* Neutral backgrounds
* Strong typography
* Proper spacing
* Consistent borders
* Controlled shadows
* Professional iconography

Avoid:

* Rainbow colors
* excessive gradients
* glowing effects
* neon
* excessive glass effects
* huge rounded containers
* random animations
* excessive shadows

The website should resemble a real premium real-estate company.

---

# 36. TYPOGRAPHY

Typography must create hierarchy.

Use:

* Strong display typography for Hero
* Clean headings
* Comfortable body text
* Small metadata typography

Arabic support must be considered if the website is Arabic.

The architecture should support:

Arabic
English

Use RTL/LTR correctly.

---

# 37. RTL SUPPORT

If Arabic is enabled:

Use:

dir="rtl"

Layouts must correctly handle:

* Navigation
* Cards
* Icons
* Forms
* Gallery
* Breadcrumbs
* Filters
* Tables
* Dashboard

Do not simply reverse text direction.

The whole layout must respect RTL.

---

# 38. ANIMATIONS

Animations should be subtle and purposeful.

Use:

* fade
* slide
* scale
* hover
* image zoom
* smooth transitions

Do not animate everything.

No excessive motion.

Respect:

prefers-reduced-motion

---

# 39. PERFORMANCE

Optimize:

* Images
* Videos
* API requests
* Lazy loading
* Pagination
* Caching
* Bundle size

Use:

WebP/AVIF when possible.

Lazy-load below-the-fold images.

Do not load every property image on initial page load.

Videos should be optimized.

---

# 40. SEO

Implement:

* Semantic HTML
* Meta title
* Meta description
* Open Graph
* Canonical URLs
* SEO-friendly property slugs
* Structured data architecture

Property page should have unique metadata.

Example:

/properties/sea-view-chalet-ain-sokhna

---

# 41. ACCESSIBILITY

Follow accessibility principles.

Include:

* Proper labels
* Keyboard navigation
* Alt text
* Focus states
* Contrast
* ARIA only where necessary
* Accessible buttons

Images must have meaningful alt text.

---

# 42. LOADING STATES

Create reusable:

SkeletonCard
SkeletonDetails
SkeletonGallery
SkeletonText

Never show a blank page while data loads.

---

# 43. EMPTY STATES

Examples:

No properties found.

No favorites yet.

No purchase requests yet.

No search results.

Each should have:

Icon
Message
Useful action

---

# 44. NOTIFICATIONS

Implement notification architecture.

Examples:

New purchase request
Request status changed
Property approved
Property rejected
New inquiry

Use database persistence.

---

# 45. AUDIT LOGGING

Admin actions should be logged.

Example:

User
Action
Entity
EntityId
Timestamp
IP where appropriate
Old value
New value

Examples:

Property approved
Property edited
User role changed
Property deleted

---

# 46. TRANSACTION SAFETY

Purchase/request operations must be transactional.

Prevent:

Duplicate requests
Invalid property states
Purchasing unavailable properties

Server must re-check property availability before accepting requests.

Never trust frontend state.

---

# 47. UI QUALITY RULES

IMPORTANT:

Every page must look designed specifically for this platform.

Do NOT repeat the same card/container pattern everywhere.

Do NOT make the whole site look like an admin dashboard.

Marketing pages should feel editorial and premium.

Listing pages should feel practical and searchable.

Details pages should feel immersive.

Checkout/request pages should feel trustworthy.

Admin pages should feel operational.

Each part has its own visual language while maintaining the same design system.

---

# 48. CSS ARCHITECTURE

Each page gets its own CSS.

Example:

Home.css
Properties.css
PropertyDetails.css
Checkout.css
Login.css
Register.css
Profile.css
Favorites.css
AdminDashboard.css

Components also have their own CSS when needed.

Avoid:

App.css containing the entire application design.

Do not put 3000 lines into one CSS file.

Create reusable global variables only for:

* typography
* spacing
* colors
* common utility rules

---

# 49. COMPONENT ARCHITECTURE

Build reusable components.

Examples:

Navbar
Footer
PropertyCard
PropertyGrid
SearchBar
PropertyFilters
PropertyGallery
PropertyHeader
PropertyStats
PropertyAmenities
PropertyDescription
PropertyLocation
AgentCard
FavoriteButton
InquiryForm
PurchaseRequestForm
Modal
Toast
Pagination
Breadcrumbs
LoadingSkeleton

Avoid duplicated JSX.

---

# 50. API SERVICE ARCHITECTURE

Create a central Axios client.

Handle:

* Base URL
* Authorization token
* Refresh token
* Errors
* Timeouts

Organize API services:

authService
propertyService
favoriteService
userService
purchaseService
adminService
locationService

---

# 51. STATE MANAGEMENT

Do not put everything into global state.

Use local state for:

* Forms
* UI toggles
* Gallery

Use appropriate shared state for:

* Authentication
* User session
* Favorites where necessary
* Global settings

Keep architecture simple.

---

# 52. FORMS

Forms must be professional.

Use:

* Clear labels
* Required indicators
* Validation
* Error messages
* Loading state
* Success state

Never rely only on placeholder text.

---

# 53. PROPERTY DETAILS UX

The user should be able to understand a property within seconds.

At the top show:

Property title
Location
Price
Main media
Core statistics
Primary action

Then progressively reveal:

Description
Features
Amenities
Location
Agent
Related properties

The primary action should remain easy to find.

On mobile consider a sticky bottom action bar:

Call
WhatsApp
Request Purchase

---

# 54. RELATED PROPERTIES

At the bottom of details page:

"Similar Properties"

Algorithm can initially use:

* Same property type
* Same location
* Similar price
* Similar area

Later architecture can support a recommendation engine.

---

# 55. BUSINESS RULES

Important:

A property marked SOLD cannot accept a new purchase request.

A property marked RENTED cannot accept rental requests.

A rejected property cannot be publicly visible.

Only approved properties can be published.

Only authorized users can edit their own properties.

Admins can manage everything.

---

# 56. DATA SEEDING

Create realistic seed data.

At least:

20+ properties

Different:

* Types
* Locations
* Prices
* Amenities
* Images
* Statuses

Do not use:

Property 1
Property 2
Test Villa

Use realistic data.

---

# 57. REALISTIC PROPERTY CONTENT

Generate realistic content structure.

Example:

"Luxury 2-bedroom chalet overlooking the Red Sea..."

But keep content easy to replace later.

---

# 58. IMAGE / VIDEO PLACEHOLDERS

During development, support placeholder media.

But architecture must make replacing them with real images/videos trivial.

Do not hard-code image URLs throughout components.

Media should come from API data.

---

# 59. ENVIRONMENT VARIABLES

Use:

.env

Frontend:

VITE_API_URL

Backend:

ConnectionStrings
JWT settings
Storage settings
Allowed origins

Never hard-code:

Passwords
JWT secrets
Connection strings
API keys

---

# 60. DATABASE MIGRATIONS

Create EF Core migrations.

Provide:

Database migration instructions.

Seed initial roles.

Seed admin account securely through configuration/setup rather than hard-coded production credentials.

---

# 61. DOCUMENTATION

Create:

README.md

Include:

* Architecture
* Installation
* Frontend setup
* Backend setup
* SQL Server setup
* Environment variables
* Migrations
* Seed data
* Running locally
* Production build
* Deployment architecture

---

# 62. DEVELOPMENT ORDER

Do NOT randomly build pages.

Follow this order:

PHASE 1
Architecture

PHASE 2
Database

PHASE 3
Backend entities

PHASE 4
Authentication

PHASE 5
Property APIs

PHASE 6
Frontend design system

PHASE 7
Navbar/Footer

PHASE 8
Home

PHASE 9
Property listing

PHASE 10
Property details

PHASE 11
Favorites

PHASE 12
Purchase request flow

PHASE 13
Seller flow

PHASE 14
Admin dashboard

PHASE 15
Validation/security

PHASE 16
Responsive design

PHASE 17
Performance

PHASE 18
SEO/accessibility

PHASE 19
Testing

PHASE 20
Final polish

---

# 63. TESTING

Create tests for critical business logic.

At minimum test:

Authentication
Property creation
Property approval
Property publishing
Favorite duplication
Purchase request
Sold property protection
Authorization
Validation

Also test API endpoints.

---

# 64. FINAL UI AUDIT

Before declaring the project complete, inspect EVERY page.

Check:

* Alignment
* Typography
* Spacing
* Responsive behavior
* Loading states
* Empty states
* Error states
* Hover states
* Buttons
* Forms
* Cards
* Images
* Mobile navigation
* RTL if enabled

Fix inconsistencies.

---

# 65. FINAL "ANTI-AI DESIGN" RULE

This is extremely important.

The website must NOT look like it was generated from a generic AI website prompt.

Avoid:

* Generic purple/blue gradients
* Glassmorphism everywhere
* Excessive rounded rectangles
* Huge text everywhere
* Random floating blobs
* Excessive shadows
* Fake futuristic UI
* Repetitive cards
* Every section centered
* Every section having the same background
* Generic SaaS dashboard design
* Random decorative shapes
* Excessive animations
* Unnecessary badges

Instead:

Use intentional composition.

Use real-estate editorial layouts.

Use large photography.

Use whitespace intelligently.

Use strong typography.

Use asymmetry when appropriate.

Use realistic content hierarchy.

Use restrained colors.

Use professional spacing.

The design should look like a company hired a senior product designer.

---

# 66. PROFESSIONAL REAL ESTATE EXPERIENCE

Think of the product as a combination of:

Luxury property marketplace
+
Real estate listing platform
+
Property discovery experience
+
Lead generation platform
+
Purchase request management system

The user experience should communicate:

Trust
Quality
Transparency
Professionalism
Property value

---

# 67. IMPORTANT IMPLEMENTATION RULE

Do NOT simply generate all files and stop.

After implementation:

1. Run the project.
2. Check frontend compilation.
3. Check backend compilation.
4. Check database connection.
5. Run migrations.
6. Test authentication.
7. Test property listing.
8. Test property details.
9. Test favorites.
10. Test purchase request.
11. Test authorization.
12. Test admin operations.
13. Test mobile responsiveness.
14. Fix all errors.
15. Review the UI visually.
16. Refactor duplicated code.
17. Remove unused code.
18. Verify API contracts.
19. Verify database relationships.
20. Perform final production-readiness audit.

If something is broken, FIX IT instead of explaining that it is broken.

---

# 68. FINAL RESULT

The final application should feel like a real commercial product.

Not:

"AI-generated React website"

But:

"Professional real-estate marketplace built by an experienced software/product team."

Prioritize:

1. UX
2. Visual quality
3. Architecture
4. Security
5. Performance
6. Maintainability
7. Scalability
8. Realistic business logic

Build the system with production-quality standards from the beginning.
