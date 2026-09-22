# PHASE-02 — Auth, Users, Security, Validation & Error Handling

> Source: website.md sections #20 (auth part), #28 (auth APIs), #29, #30, #31 (backend part)
> Depends on: PHASE-00, PHASE-01

## Goal
Implement complete JWT authentication, user management, role-based authorization, input validation, and global error handling.

## APIs (RESTful, DTOs only — NEVER expose EF entities)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/users/me            (authorized)
PUT  /api/users/me            (edit profile)
POST /api/users/change-password
```
Use DTOs + FluentValidation + AutoMapper (or manual mapping). Return professional validation responses.

## Auth Rules
- Register, Login, Logout (client token clear + server refresh-token revoke), Forgot/Reset Password, Edit Profile, Change Password.
- Password hashing (ASP.NET Identity or BCrypt), refresh-token rotation, short-lived access tokens.
- Roles: Admin, Agent, Seller, Buyer. NEVER trust role/user IDs sent from frontend — always validate permissions server-side + ownership validation (users can only edit their own properties unless Admin).
- JWT auth + CORS (allowed origins from config) + secure headers + rate limiting on auth endpoints + SQL injection protection via EF Core (no raw SQL concatenation).

## Validation (frontend AND backend — never frontend-only)
Email, phone, price, area, required fields, file types/sizes. Backend returns structured errors; frontend (later) must render them per-field.

## Global Error Handling
Backend middleware returns consistent shape, never raw exceptions:
```json
{ "success": false, "message": "Something went wrong.", "errors": [] }
```
Log exceptions with correlation IDs. Frontend contract (for later phases): loading / empty / error / retry / skeleton states — never blank screens.

## Deliverables
- `Application/` services: `AuthService`, `UserService`, `TokenService`; `API/Controllers/AuthController`, `UsersController`; validators; exception-handling middleware.
- Swagger documents all auth endpoints with 401/403/422 examples.
- Tests: authentication, wrong-password rejection, refresh flow, authorization (buyer cannot access admin route), validation failures.

## Out of Scope
No property APIs (PHASE-03), no frontend pages (PHASE-05+).

## Acceptance Criteria
1. Register → login → access `/users/me` with Bearer token → refresh → logout works end-to-end.
2. Buyer token calling an Admin-only endpoint returns 403.
3. Invalid payloads return 400/422 with structured `errors` array, not stack traces.

## Verification
1. Exercise all auth endpoints via Swagger/Postman.
2. Run backend auth tests green.
3. Confirm JWT secret/connection string come from env, not code.
