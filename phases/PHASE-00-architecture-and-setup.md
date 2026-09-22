# PHASE-00 — Architecture & Project Setup

> Source: website.md sections #1, #2, #48, #49, #50, #51, #59, #60 (intro), #61, #62 (order), #65, #66, #68
> Prerequisite: None. This phase must be completed before all others.

## Goal
Scaffold a clean, production-ready monorepo skeleton for a premium real estate marketplace (React + Vite frontend, ASP.NET Core .NET 10 backend, SQL Server) with zero business logic — only architecture, tooling, env contracts, and design tokens.

## Tech Stack (locked)
**Frontend:** React + Vite + JavaScript or TypeScript + Bootstrap 5 + React Router + Axios + Bootstrap Icons + Swiper.js. NO Tailwind CSS.
**Backend:** ASP.NET Core Web API (.NET 10) + EF Core + SQL Server + JWT + RBAC + FluentValidation + Swagger/OpenAPI + Clean Architecture (`Backend/Domain`, `Backend/Application`, `Backend/Infrastructure`, `Backend/API`).
Controllers must be thin — no business logic inside controllers (use Entities, DTOs, Services, Repositories, Validators, Mapping, Auth service, Exception handling, Logging, Pagination/Filtering/Sorting helpers).

## Deliverables
```
/
├── frontend/
│   ├── src/
│   │   ├── pages/            # empty placeholders only
│   │   ├── components/       # empty placeholders only
│   │   ├── services/api.js   # axios instance skeleton (baseURL from env)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles/variables.css  # design tokens ONLY
│   ├── .env.example          # VITE_API_URL=
│   └── package.json
├── Backend/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── API/                  # Program.cs, appsettings.json, Swagger wired
├── phases/                   # this folder (already exists)
├── .gitignore
└── README.md                 # skeleton: architecture diagram, setup steps, env table, run instructions
```

## Design-System Contract (tokens only, no pages yet)
Define in `variables.css`:
- ONE primary brand color + neutrals (no rainbow, no neon, no glow).
- Typography scale: display / heading / body / metadata.
- Spacing scale, border style, controlled shadows.
- Must support Arabic + English later (RTL/LTR architecture ready, `dir` handling planned).

## CSS Architecture Rule (enforced from now on)
- NEVER one giant CSS file. Every page/major feature gets its own CSS file (e.g. `Home/Home.css`, `Properties/Properties.css`).
- Components get scoped CSS. Global CSS only for variables/typography/spacing/colors/utilities.
- No glassmorphism everywhere, no excessive rounded cards, no generic purple/blue gradients.

## Environment Variables
- Frontend: `VITE_API_URL` via `.env` (never hard-code URLs).
- Backend: `ConnectionStrings:Default`, `JWT:*`, `Storage:*`, `AllowedOrigins` via user-secrets / env (never hard-code secrets, connection strings, API keys).

## Out of Scope (DO NOT build in this phase)
No entities, no migrations, no auth, no pages, no PropertyCard, no admin UI.

## Acceptance Criteria
1. `npm run dev` (frontend) compiles with empty router shell.
2. `dotnet build` (backend) succeeds and Swagger opens.
3. No Tailwind dependency present.
4. README contains: architecture, frontend setup, backend setup, SQL Server setup, env vars, how to run locally.

## Verification
1. Run frontend build, run backend build.
2. Confirm Swagger endpoint responds.
3. Confirm `VITE_API_URL` switches environments correctly.
