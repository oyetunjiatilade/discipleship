# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-app monorepo (no root package.json — each app is managed independently):

- `dms-backend/` — Express + TypeScript + MongoDB (Mongoose) REST API
- `dms-frontend/` — React 18 + TypeScript + Vite SPA

Run all commands from inside the relevant app directory.

## What this is

DMS ("Discipleship Management System") is a backend + admin/mentor/convert web app for a church's
new-convert discipleship pipeline ("Team Barnabas"): tracking a convert's journey from first
contact through class completion, baptism, and membership transfer, with mentor shepherding,
cohorts/groups, live sessions, and re-engagement nudges. The platform is multi-branch (multi-tenant):
courses/lessons/quizzes are shared globally, but converts/mentors/admins/cohorts/sessions/reports
are isolated per church branch (see "Multi-branch" below). See `IMPLEMENTATION_NOTES.md` for the
full history of what's been built and what backend endpoints/frontend screens exist for each
feature — check it before assuming something is missing.

## Commands

### Backend (`dms-backend/`)
```bash
npm run dev             # tsx watch src/server.ts — dev server with hot reload
npm run build            # tsc -> dist/
npm start                # node dist/server.js (run build first)
npm run typecheck        # tsc --noEmit — run this after any backend change
npm test                 # vitest run
npm run test:watch       # vitest watch mode
npm test -- <pattern>    # run a single test file/pattern, e.g. npm test -- quiz-public-view
npm run lint / lint:fix  # eslint src/
npm run format           # prettier --write src/**/*.ts
npm run seed             # tsx scripts/seed.ts — creates the seed admin (forced password change)
```
Requires a running MongoDB (`docker-compose up -d mongodb` or a local instance) and a `.env` file
(copy from `.env.example`). Env vars are validated at startup via Zod (`src/config/env.ts`) — the
process refuses to boot if required vars are missing/invalid.

### Frontend (`dms-frontend/`)
```bash
npm run dev       # vite dev server on :3000, proxies /v1 and /socket.io to :4000
npm run build     # tsc -b && vite build — run this after any frontend change to typecheck
npm run lint      # eslint .
npm run preview   # preview the production build
```
There is no frontend test runner configured.

### Full local stack
Backend must be running on `:4000` before starting the frontend dev server (Vite proxies API/WS
calls to it). Typical order: `docker-compose up -d mongodb` (backend dir) → `npm run seed` (once)
→ `npm run dev` (backend) → `npm run dev` (frontend).

## Backend architecture (`dms-backend/src`)

**Module-per-domain, layered within each module.** Each feature lives under `src/modules/<name>/`
with (as applicable) `*.model.ts` (Mongoose schema), `*.service.ts` (business logic, DB access),
`*.controller.ts` (request/response glue, thin), `*.routes.ts` (route wiring), `*.validation.ts`
(Zod schemas for `validate()` middleware). Controllers call services; services never touch
`req`/`res`. Route registration and role-gating (`authenticate` + `authorize(...)`) happen
centrally in `src/app.ts`, not inside each module's routes file — check `app.ts` to see who can
hit what.

Path aliases (`tsconfig.json`): `@config/*`, `@modules/*`, `@middleware/*`, `@shared/*` all map
into `src/`.

**Roles** (`shared/constants/roles.ts`): `convert`, `admin`, `mentor`, `super_admin`. Auth is
JWT-based (`middleware/authenticate.ts` verifies the Bearer access token into `req.user`, which
carries `{ userId, role, branchId }`); the refresh token is a `Secure`/`httpOnly`/`SameSite`
cookie scoped to `/v1/auth` (never in the JSON body or localStorage) — see `modules/auth/`.
Route-level access control is `authorize(...roles)` (`middleware/authorize.ts`) — note that
`super_admin` implicitly satisfies any check that allows `'admin'`, so most `/v1/admin/*` mounts
don't list it explicitly; mentors are further restricted to *their own* assigned converts via
ownership checks in `modules/mentor/access.ts` (`assertMentorAccessToConvert`) — this, not the
separate `/mentor/login` page, is the actual security boundary for mentor data access.

**Multi-branch (multi-tenant)**: `modules/branch/` is a small CRUD module for church branches
(Lagos, Abuja, ...) — `GET /v1/branches` is public (feeds the registration dropdown);
`/v1/admin/branches` is `super_admin`-only. Every `admin`/`mentor`/`convert` has a required
`branchId`; `super_admin` has none and sees everything. The isolation boundary is
`shared/access/branch-scope.ts` (`branchFilter()` for list/aggregate queries,
`assertBranchAccess()` for single-document ownership checks) — the same "bypass role vs.
ownership-field comparison" shape as `assertMentorAccessToConvert`. When adding a new
branch-scoped query or a new admin-facing create/update endpoint, use these helpers rather than
inventing a new scoping pattern; when adding a *new* model that's per-branch data (not shared
course content), give it a `branchId` field and scope it the same way. `Course`/`Lesson`/`Quiz`
are deliberately global — never scope those.

**Stage pipeline is the core domain model** (`shared/constants/stages.ts` +
`modules/stage/stage.transitions.ts`): a convert moves through `NEW_CONVERT → IN_CLASS →
CLASS_COMPLETED → BAPTIZED → MEMBER_TRANSFERRED`, with `HOLY_SPIRIT_FILLED` as a side-branch and
`isHolySpiritFilled` as an independent flag settable at any stage. `TRANSITION_RULES` in
`stage.transitions.ts` is the single source of truth for which transitions are valid and whether
they're `auto` (system-triggered, e.g. starting the first lesson, finishing all lessons/quizzes)
or `admin_manual` (via `POST /v1/admin/converts/:id/stage/transition`). When adding anything that
should move a convert forward in the pipeline, add/modify a rule here rather than mutating
`user.stage` directly elsewhere.

**Courses are multi-course aware but stage transitions are not.** `Course.isPrimary` marks the
one course (the Believers Class) that drives `IN_CLASS`/`CLASS_COMPLETED` auto-transitions;
supplementary courses (e.g. a follow-up "Growth Class") track their own progress via
`progress.service` but never move `user.stage`. Lessons/progress endpoints are course-scoped via
a `?courseId=` query param, defaulting to the primary course when omitted.

**Errors**: all domain errors extend `shared/errors/AppError` (`statusCode`, `code`,
`isOperational`); throw them from services/controllers and let `middleware/errorHandler.ts`
translate them into the standard envelope. Zod validation errors thrown by `validate()` are also
caught centrally. Responses always use `shared/utils/response.ts` (`sendSuccess`/`sendError`/
`sendCreated`/`sendNoContent`) for a consistent `{ success, data|error }` shape.

**Background jobs** (`src/jobs/`): `node-cron`-based scheduler (`scheduler.ts`, started from
`server.ts` unless `NODE_ENV=test`) runs the daily re-engagement job (`reengagement.job.ts`) that
nudges converts who've gone quiet, plus a per-minute notification-outbox retry
(`modules/notification/outbox.model.ts`) for notifications that failed to write. Toggle with
`ENABLE_SCHEDULER`.

**Realtime**: `src/realtime/socket.ts` runs Socket.IO on the same HTTP server (JWT-authenticated,
per-user rooms) for instant notification push; polling (`useUnreadCount` on the frontend) remains
a fallback if the socket drops.

**Messaging**: OTPs and nudges go through `shared/services/messaging.service.ts`
(SMS/WhatsApp via Termii, configurable per `SMS_PROVIDER`/`SMS_CHANNEL`). With
`SMS_PROVIDER=mock` (the dev default), no OTPs are actually sent, which blocks login flows that
depend on OTP — switch to a real provider or check logs for the mock output when testing auth.

**Tests** (`tests/`): Vitest. `tests/unit/` and `tests/integration/` are otherwise empty scaffolds
apart from one regression test (`quiz-public-view.test.ts`, guarding that quiz answers are never
leaked to clients via `toQuizPublicView`) — most modules currently have no test coverage.

## Frontend architecture (`dms-frontend/src`)

React Router v6 (`router/index.tsx`) with parallel authenticated areas gated by `RouteGuard
allowedRole="convert"|"admin"|"mentor"|"super_admin"` (or an array, e.g. `['admin',
'super_admin']` for the shared admin section), each with its own layout
(`ConvertLayout`/`AdminLayout`/`MentorLayout`) and login page
(`/login`, `/admin/login`, `/mentor/login` — `super_admin` also logs in at `/admin/login`, same
endpoint as `admin`). `PublicRoute` guards the logged-out routes. Most non-auth pages are
lazy-loaded (`React.lazy` + `Suspense`); only the three login pages and `NotFound` are eager.
`super_admin`-only pages (`/admin/branches`, `/admin/admins`) sit in their own route group with
`allowedRole="super_admin"`, sharing `AdminLayout`; `useAuthStore().isSuperAdmin()` gates their
sidebar links and the branch pickers that appear in creation forms (mentors, converts, cohorts,
sessions) when a super_admin — as opposed to a branch-scoped admin, whose branch is always
implicit — is the one creating the resource.

State: Zustand (`stores/authStore.ts`) holds the in-memory access token + user; the refresh token
lives only in the httpOnly cookie set by the backend. `api/client.ts` is a single Axios instance
with `withCredentials: true`; its response interceptor auto-retries a 401 once by calling
`/v1/auth/refresh` (queuing concurrent requests while a refresh is in flight) and logs out on
refresh failure. Feature API calls live in one file per domain under `src/api/`
(`courseApi.ts`, `mentorApi.ts`, etc.), mirroring the backend's module boundaries.

UI: Tailwind + shadcn/radix-derived primitives in `components/ui/` (configured via
`components.json`); path alias `@/*` → `src/*` (set in both `tsconfig` and `vite.config.ts`).

`@/constants/enums.ts` and `@/constants/departments.ts` and `@/types/*` should stay in sync with
the backend's `shared/constants/` and Mongoose model shapes — there's no shared/generated types
package, so cross-check manually when changing either side of an API contract.
