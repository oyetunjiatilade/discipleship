# DMS Upgrade — "Now" + "Next" Implementation Notes

This document records the changes made to execute the **Now** and **Next** improvement
lists from the product/engineering review. Backend is fully implemented; the frontend
auth layer is rewired for the new security model. The remaining feature **screens** are
listed at the end.

> ⚠️ **Automated `tsc`/tests could not be run in the authoring sandbox** — its npm was
> unstable on the mounted filesystem (atomic renames failed, installs stalled). All code
> was written to the existing patterns and statically checked (imports resolve, symbols
> line up). **Verify locally** with the commands in the "How to verify" section.

---

## NOW (security + unblocking)

### 1. SMS / WhatsApp delivery — DONE
- A Termii adapter already existed. Added a configurable **channel** so OTPs and nudges
  can be delivered over **WhatsApp** (`SMS_CHANNEL=whatsapp`) — the channel converts
  actually use.
- Files: `src/config/env.ts` (`SMS_CHANNEL`), `src/modules/auth/otp.service.ts`.
- **Action needed:** set real `SMS_PROVIDER=termii`, `SMS_API_KEY`, `SMS_SENDER_ID` in
  production. While `SMS_PROVIDER=mock`, **no OTPs are actually sent** (login is blocked).

### 2. Refresh token → httpOnly cookie — DONE (backend + frontend)
- Refresh token is now issued as a **`Secure`, `httpOnly`, `SameSite` cookie** scoped to
  `/v1/auth`, and is **no longer returned in the JSON body**. This removes the XSS
  token-theft surface (previously both tokens were persisted to `localStorage`).
- The access token stays in memory; on reload the 401 interceptor silently re-mints it
  from the cookie.
- Files: `src/app.ts` (cookie-parser), `src/modules/auth/auth.controller.ts`,
  `auth.validation.ts`; frontend `api/client.ts`, `stores/authStore.ts`, `api/authApi.ts`,
  `types/auth.ts`, and the logout handlers in the layouts/ProfilePage.
- **New dependency:** `cookie-parser` (+ `@types/cookie-parser`).

### 3. Admin password rotation + forced change — DONE (backend)
- Added `mustChangePassword` flag, `POST /v1/auth/admin/change-password` (revokes all
  sessions on change), and the **seed** now reads `SEED_ADMIN_PASSWORD` (or generates a
  strong random one, printed once) and forces a change on first login.
- **Action needed:** the documented default `Admin@2025` must be considered compromised —
  rotate it. Re-seed or change via the new endpoint.
- Files: `user.model.ts`, `user.types.ts`, `auth.service.ts`, `auth.controller.ts`,
  `auth.routes.ts`, `scripts/seed.ts`.
- **Remaining (frontend):** a forced change-password screen when `user.mustChangePassword`.

### 4. Manual stage-transition endpoint + admin UI — DONE (backend)
- The stage engine was previously unreachable over HTTP (Baptized / Member Transferred
  could not be set). Now exposed:
  - `GET  /v1/admin/converts/:convertId/stage` — current stage, valid next transitions, history
  - `POST /v1/admin/converts/:convertId/stage/transition` — `{ targetStage, reason? }`
  - `POST /v1/admin/converts/:convertId/holy-spirit` — `{ filled }`
- Files: `src/modules/admin/stage.{controller,routes,validation}.ts`, `app.ts`.
- **Remaining (frontend):** admin controls on the convert detail/list to trigger these.

### 5. `/me` profile editing — DONE (backend)
- `GET /v1/me` and `PATCH /v1/me` (first/last name, DOB, gender, address, profile image).
- Files: `src/modules/me/*`, `app.ts`.
- **Remaining (frontend):** an editable profile form.

### 6. Quiz answer safety — DONE (verified + locked)
- Confirmed `toQuizPublicView` already strips `correctLabel`. Added a regression test
  (`tests/unit/quiz-public-view.test.ts`) so it can never regress.

---

## NEXT (engagement engine)

### 7. Mentor role + assignment + "my flock" view — DONE (backend)
- New `mentor` role (logs in with email/password like an admin). Converts carry a
  `mentorId`. Endpoints:
  - `GET  /v1/admin/mentors` / `POST /v1/admin/mentors`
  - `POST /v1/admin/converts/:convertId/assign-mentor` `{ mentorId }`
  - `POST /v1/admin/converts/:convertId/unassign-mentor`
  - `GET  /v1/mentor/flock` — the assigned converts, each with progress + a shepherding
    **status** (`new`/`active`/`stuck`/`dark`/`done`), sorted so the people who need
    attention (longest silence) come first. Admins may pass `?mentorId=`.
- Files: `src/modules/mentor/*`; `roles.ts`, `express.d.ts`, `user.model.ts`,
  `user.types.ts`, `auth.service.ts` (staff login now allows admin **or** mentor), `app.ts`.
- **Remaining (frontend):** mentor flock page + admin assign-mentor control + routing for
  the mentor role.

### 8. Scheduler + re-engagement nudges — DONE (backend, no UI needed)
- `node-cron` scheduler runs a daily **re-engagement job**: finds converts who have gone
  quiet (default ≥ 3 days, respecting a cooldown) and sends an in-app + WhatsApp/SMS nudge.
  This is the proactive loop the platform was missing.
- Also added a generic `messaging.service` (WhatsApp/SMS for non-OTP messages).
- Files: `src/jobs/scheduler.ts`, `src/jobs/reengagement.job.ts`,
  `src/shared/services/messaging.service.ts`, `notification.service.ts` (+`reminder` type),
  `user.model.ts` (`lastNudgeAt`), `server.ts`, `config/env.ts`.
- **New dependency:** `node-cron` (+ `@types/node-cron`).

### 9. "Needs follow-up" admin list — DONE (backend)
- `GET /v1/admin/reports/follow-up?days=&limit=` — converts ranked by days of silence,
  with each one's assigned mentor and a reason ("hasn't started", "stalled mid-class").
  This replaces vanity metrics with an actionable pastoral-care list.
- Files: `src/modules/admin/report.{service,controller,routes}.ts`.
- **Remaining (frontend):** a dashboard section that renders this list.

---

## New environment variables (see `.env.example`)

```
SMS_CHANNEL=generic            # generic | dnd | whatsapp
# COOKIE_DOMAIN=.teambarnabas.org
# SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_PHONE
ENABLE_SCHEDULER=true
REENGAGEMENT_CRON=0 9 * * *
NUDGE_INACTIVE_DAYS=3
NUDGE_COOLDOWN_DAYS=3
```

## New dependencies
Backend: `cookie-parser`, `node-cron` (+ `@types/cookie-parser`, `@types/node-cron`) —
already added to `package.json`.

## How to verify (run locally)
```bash
cd dms-backend/dms-backend
npm install
npm run typecheck        # tsc --noEmit
npm test                 # vitest (includes the new quiz-answer regression test)
npm run seed             # creates admin with forced password change
npm run dev

cd ../../dms-frontend/dms-frontend
npm install
npm run build            # tsc -b && vite build
```

## Frontend feature screens — DONE

All five remaining screens are now built and wired into the router:

1. ✅ **Change-password** page (`/change-password`, any authenticated staff). Admin login
   redirects here automatically when `mustChangePassword` is true.
2. ✅ **Admin stage controls** — `components/ConvertManageModal.tsx` (advance stage, Holy
   Spirit toggle, mentor assign/unassign, stage history). Opened via a **Manage** button on
   each row of the Converts table and from the Follow-up page.
3. ✅ **Convert profile edit** — `pages/convert/ProfilePage.tsx` now has an edit form wired
   to `PATCH /v1/me` (added a `setUser` action to the auth store).
4. ✅ **Mentor role UX** — `pages/mentor/MentorFlockPage.tsx` + `MentorLayout`, guarded by
   `RouteGuard allowedRole="mentor"` (route `/mentor/flock`); admin **Mentors** page
   (`/admin/mentors`) to create mentors and view any mentor's flock; assignment via the
   Manage modal. `FlockList` shows each convert's status (new/active/stuck/dark/done) with
   one-tap WhatsApp/call.
5. ✅ **"Needs follow-up"** page — `pages/admin/AdminFollowUpPage.tsx` (`/admin/care`),
   ranked by silence, with mentor + reason and a WhatsApp shortcut.

New nav items were added to the admin sidebar: **Follow-up** and **Mentors**.

### New frontend files
`api/meApi.ts`, `api/mentorApi.ts`, `types/care.ts`, `components/ConvertManageModal.tsx`,
`components/FlockList.tsx`, `components/layouts/MentorLayout.tsx`,
`pages/auth/ChangePassword.tsx`, `pages/admin/MentorsPage.tsx`,
`pages/admin/AdminFollowUpPage.tsx`, `pages/mentor/MentorFlockPage.tsx`.

> Same verification caveat as the backend: run `npm install && npm run build` in
> `dms-frontend/dms-frontend` locally to typecheck. All `@/`/relative imports were
> statically verified to resolve.

---

# Roadmap features #1–#3 (built)

## 1. Active lessons — reflections + action steps
- Admins can now add a **Memory Verse** and an **Action Step** to each lesson (Lesson form).
- Converts get a **Reflect & apply** block on every lesson: the memory verse, a checkable
  action step, and a personal reflection ("one thing you're taking away"). Saved per lesson.
- Mentors/admins can read a convert's reflections: `GET /v1/mentor/converts/:id/reflections`.
- Backend: `modules/reflection/*`, lesson `memoryVerse`/`actionStep` fields.
- Frontend: `components/LessonReflection.tsx` (in LessonDetail), lesson-form fields, `api/reflectionApi.ts`.

## 2. Cohorts + group / prayer feed
- Admins create **Cohorts** (class intakes) under the new **Cohorts** sidebar page and assign
  converts to one from the convert **Manage** modal.
- Converts in a cohort get a **Group** tab: a feed to post a **prayer / praise / message** and
  say **Amen** to others. Converts without a cohort see a friendly empty state.
- Backend: `modules/cohort/*` (Cohort + Post models), `user.cohortId`.
  - Convert: `GET /v1/community`, `POST /v1/community/posts`, `POST /v1/community/posts/:id/amen`, `DELETE .../:id`.
  - Admin: `GET/POST /v1/admin/cohorts`, `PATCH /v1/admin/cohorts/:id`, `POST /v1/admin/converts/:id/assign-cohort`.
- Frontend: `pages/convert/CommunityPage.tsx`, `pages/admin/CohortsPage.tsx`, `api/communityApi.ts`.

## 3. Live sessions + attendance
- Admins schedule **Live Sessions** (title, date/time, duration, meeting link, audience =
  everyone or a specific cohort) on the new **Sessions** sidebar page, and mark attendance.
- Converts get a **Live** tab: upcoming sessions with a **Join** button and **Going / Can't**
  RSVP. RSVPs feed the admin attendance list.
- Backend: `modules/session/*` (LiveSession + SessionAttendance).
  - Convert: `GET /v1/sessions`, `POST /v1/sessions/:id/rsvp`.
  - Admin: `GET/POST /v1/admin/sessions`, `PATCH/DELETE /v1/admin/sessions/:id`,
    `GET/POST /v1/admin/sessions/:id/attendance`.
- Frontend: `pages/convert/SessionsPage.tsx`, `pages/admin/SessionsPage.tsx`, `api/sessionApi.ts`.

### New navigation
- Convert bottom bar: added **Group** and **Live**.
- Admin sidebar: added **Cohorts** and **Sessions**.

### Verify locally
```
cd dms-backend/dms-backend && npm run typecheck && npm test
cd ../../dms-frontend/dms-frontend && npm run build
```
No migration/re-seed needed — all new fields are additive (existing rows default to null/empty).
Remaining roadmap (next batch): #4 low-data mode + transcripts, #5 completion certificates,
#6 multi-course — plus the smaller enhancements (HTML notes, onboarding, durable notifications,
WebSocket, department in admin table/registration).

---

# Roadmap features #4–#6 (built)

## 4. Low-data mode + transcripts
- Admins can add a **Transcript** to each lesson (Lessons form).
- Converts get a **Data-saver** toggle in Profile. When on, the lesson video does NOT
  auto-load (shown as a "Load video" placeholder) and the **transcript** is surfaced for
  reading instead. When off, behaviour is unchanged.
- Backend: lesson `transcript`, user `lowDataMode` (via `/me`).
- Frontend: `components/LessonReflection.tsx` unaffected; `LessonDetail` low-data gating +
  transcript panel; Profile toggle; admin transcript field.

## 5. Completion certificates
- A PDF **Certificate of Completion** (PDFKit) is generated when a convert has completed the
  class (or is past Class Completed).
- Convert: a **Download certificate** card appears in Profile when eligible → `GET /v1/certificate`.
- Admin: **Download completion certificate** button in the convert Manage modal →
  `GET /v1/admin/converts/:id/certificate` (returns 403 if not yet eligible).
- Backend: `modules/certificate/*`. Frontend: `api/certificateApi.ts`.

## 6. Multi-course support (supplementary)
- Admins can create **additional courses** (e.g. a follow-up "Growth Class") under the new
  **Courses** sidebar page, and manage each course's lessons via a **course selector** on the
  Lessons page. The Believers Class is flagged **primary** (Core).
- Converts get a **Courses** page (linked from "All courses" on the Lessons screen) listing
  every active course with its own progress bar; opening a supplementary course shows that
  course's lessons (`/lessons?courseId=…`).
- **Important behaviour:** the discipleship **stage pipeline is unchanged** — `IN_CLASS` and
  `CLASS_COMPLETED` auto-transitions now fire **only** for the primary Believers Class.
  Supplementary courses track their own progress but do not move a convert's stage.
- Backend: `Course.isPrimary`; courses CRUD (`/v1/admin/courses`, `/v1/courses`); lessons and
  progress are course-scoped (`?courseId=`); `progress.service` refactored to resolve a course
  (defaults to primary) and gate stage transitions to primary.
  - **Run `npm run seed` once** so the existing Believers Class is marked primary. (There's a
    runtime fallback to the active course if the flag is missing, so nothing breaks meanwhile.)
- Frontend: `pages/convert/CoursesPage.tsx`, `pages/admin/CoursesAdminPage.tsx`, course-aware
  `LessonsPage`/`LessonDetail`/`LessonManagement`, `courseApi`/`progressApi` course params.

### New navigation
- Convert: "All courses" link on the Lessons screen → Courses page (bottom bar unchanged).
- Admin sidebar: added **Courses**.

### Verify locally
```
cd dms-backend/dms-backend && npm run typecheck && npm test && npm run seed
cd ../../dms-frontend/dms-frontend && npm run build
```
Roadmap after this batch: the smaller enhancements remain — HTML notes rendering, warm
onboarding, durable event notifications, WebSocket real-time, and department in the admin
table / at registration.

---

# Enhancements batch (built)

## E1. HTML/markdown lesson notes
- Admins can write **inline notes in Markdown** on a lesson (bold, italics, headings, lists,
  links). When present, converts read formatted notes **inline** (no PDF iframe, no data cost);
  the PDF remains the fallback when no markdown is set.
- Backend: lesson `notesMarkdown`. Frontend: safe `components/Markdown.tsx` (escapes first),
  LessonDetail renders it, admin lesson-form field.

## E2. Warm onboarding
- After a convert verifies their phone at registration, they land on a **/welcome** screen —
  a warm greeting, what to expect (short lessons, a mentor, the class group, a certificate),
  and a "Start my first lesson" button. Login still goes straight to the dashboard.
- Frontend: `pages/convert/WelcomePage.tsx`; RegisterConvert redirects to `/welcome`.

## E3. Durable event notifications (outbox)
- Added a **notification outbox**: if a direct notification write fails, the event is saved to
  `NotificationOutbox` and a **per-minute scheduler job** retries delivery with exponential
  backoff (up to 5 attempts) — events are no longer silently lost. In-app delivery stays
  instant on the happy path.
- Backend: `modules/notification/outbox.model.ts`, `safeCreate`/`enqueue`/`processOutbox` in
  `notification.service`, scheduler wiring.

## E4. WebSocket real-time notifications
- Notifications now push **instantly over socket.io** (per-user rooms, JWT-authenticated
  handshake) instead of waiting for the 60s poll. Polling stays as a fallback, so the badge is
  still correct if the socket drops.
- Backend: `src/realtime/socket.ts` (+ `server.ts` uses an `http.Server`, `notification.create`
  emits). Frontend: `src/lib/socket.ts`, `useUnreadCount` connects and refetches on push, Vite
  proxy forwards `/socket.io` (ws).
- **New deps:** `socket.io` (backend), `socket.io-client` (frontend) — already in `package.json`.

## E5. Department in admin table + at registration
- Converts can pick their **department** (and member/joining) during **registration**, not just
  in Profile.
- The admin **Converts table** shows a Department column and the **CSV export** includes it.
- Backend: `register` accepts department; `report.service`/`report.types` + CSV. Frontend:
  RegisterConvert fields, `UsersTable` column.

### Verify locally (note the new deps → reinstall)
```
cd dms-backend/dms-backend && npm install && npm run typecheck && npm test
cd ../../dms-frontend/dms-frontend && npm install && npm run build
```
This clears the numbered roadmap **and** the enhancement backlog from the original review.

---

# Mentor engagement + access hardening

## Mentor convert-detail + private notes
- Mentors tap a person in their flock to open a **convert-detail page** (`/mentor/converts/:id`):
  progress bar, **their reflections** (with action-step status), **stage history/journey**, and a
  **private notes** section (add/delete) — plus one-tap WhatsApp/call. This makes shepherding
  two-directional inside the app, not just a list.
- Backend: `modules/mentor/mentor-note.model.ts`, `access.ts` (ownership guard), and
  `getConvertDetail` / `addNote` / `deleteNote` on the mentor service; routes under `/v1/mentor`.
- Frontend: `pages/mentor/MentorConvertDetailPage.tsx`, flock rows now navigate to it,
  `api/mentorApi.ts` + `types/care.ts` additions.

## Access hardening (the real security fix)
- **Ownership scoping:** a mentor can now only view/annotate converts **assigned to them**
  (`assertMentorAccessToConvert`); admins keep full access. This closed a gap where the
  reflections endpoint accepted any convertId. The flock endpoint already scoped to the caller.
- **Dedicated mentor login** at `/mentor/login` (separate from `/admin/login`) so mentors never
  land on an admin-branded page. Guards send unauthenticated mentors there and `MentorLayout`
  logout returns there. (Note: the actual data boundary was — and remains — the role-based
  `authorize()` middleware + route guards; the separate page is clarity/least-privilege, not the
  security mechanism itself.)

Verify: `npm run typecheck` (backend) and `npm run build` (frontend) after `npm install`.

---

# Multi-branch (multi-tenant) support

The platform now supports onboarding multiple church branches (Lagos, Abuja, Ibadan, ...) onto
one shared deployment. Courses/lessons/quizzes stay **global**; everything else — converts,
mentors, admins, cohorts, live sessions, contact logs, reports, notifications — is isolated per
branch.

## Roles
- New **`super_admin`** role: belongs to no branch, sees/manages every branch, creates branches
  and branch admins. A plain **`admin`**/**`mentor`** each belong to exactly one branch (set at
  creation, immutable via the API). `authorize()` treats `super_admin` as implicitly satisfying
  any `'admin'`-gated route, so existing `/v1/admin/*` mounts needed no changes.
- Admins/mentors still log in at the existing `/admin/login`/`/mentor/login` screens —
  `super_admin` reuses `/admin/login` (same `POST /v1/auth/admin/login` endpoint; role comes back
  in the response and drives the redirect).

## Backend
- New module `modules/branch/` (model/service/controller/routes/validation). `GET /v1/branches`
  is public (active branches only — feeds the registration dropdown); `/v1/admin/branches`
  (list/create/update) is `super_admin`-only.
- New shared helper `shared/access/branch-scope.ts`: `branchFilter(requester)` (spreads into
  `find`/`aggregate` queries — returns real `ObjectId`s since raw `$match` stages don't auto-cast
  strings) and `assertBranchAccess(requester, targetBranchId)` (single-document ownership check),
  modeled on the existing `assertMentorAccessToConvert` pattern.
- `User`, `Cohort`, `LiveSession`, `ContactLog` gained a `branchId` field. `Progress` and
  `StageTransition` deliberately did **not** — they're always reached via a `userId`/`convertId`
  that's branch-checked upstream by the caller (mentor/admin controllers).
- Every admin/mentor list, aggregate, and lookup-by-ID across `report`, `cohort`, `session`,
  `notification`, `mentor`, `stage` (admin controller), `progress` (admin controller), and
  `certificate` (admin controller) now scopes by branch or asserts branch access before acting —
  including fixing a pre-existing gap where `assertMentorAccessToConvert` let *any* admin view
  *any* convert regardless of branch.
- Convert registration (`POST /v1/auth/register`) requires `branchId`. Staff creation
  (`POST /v1/auth/admin/create`, `POST /v1/admin/mentors`) auto-injects the caller's own branch
  for a plain admin, or requires an explicit `branchId` (and optional `role`) when the caller is
  `super_admin`. New `GET /v1/auth/admin/list` lists admins in-branch (or all, for super_admin).
- `scripts/seed.ts` now creates a **`super_admin`** (no branch) instead of a plain admin — that
  account subsequently creates real branches and branch admins. New one-off
  `scripts/migrate-branches.ts` (`npm run migrate:branches -- "Branch Name"`) backfills a default
  branch onto existing Users/Cohorts/LiveSessions for databases that predate this feature — run
  it once before deploying to an existing database.

## Frontend
- `RegisterConvert.tsx` has a required branch `<select>` sourced from `GET /v1/branches`
  (`api/branchApi.ts`).
- `RouteGuard`'s `allowedRole` now accepts an array; the admin route group is
  `allowedRole={['admin', 'super_admin']}`. New `super_admin`-only route group
  (`/admin/branches`, `/admin/admins`) shares `AdminLayout`.
- New pages `pages/admin/BranchesPage.tsx` (branch CRUD) and `pages/admin/AdminsPage.tsx`
  (create/list branch admins), both `super_admin`-only, mirroring `MentorsPage.tsx`'s pattern.
  `AdminLayout` sidebar shows "Branches"/"Admins" only when `useAuthStore().isSuperAdmin()`.
- `MentorsPage.tsx`'s create-mentor form and `AdminConvertsPage.tsx`'s create-convert dialog show
  a branch `<select>` **only** for a super_admin viewer (a branch admin's branch stays implicit).
  `AdminConvertsPage.tsx` also gets a branch filter dropdown and `UsersTable.tsx` a Branch column,
  both super_admin-only.
- **Not done** (deliberately out of scope for this batch): `CohortsPage`/`SessionsPage`'s create
  forms have no branch selector yet — a super_admin using those specific flows will hit a
  "branchId is required" error today; a branch admin is unaffected. Add branch selectors there if
  super_admins need to create cohorts/sessions directly.

### Verify locally
```
cd dms-backend && npm run typecheck && npm test
cd ../dms-frontend && npm run build
```
Then, once per environment: `npm run seed` (fresh DB) or `npm run migrate:branches -- "Branch
Name"` (existing DB) before relying on branch scoping.

---

# Move a convert between branches (super_admin)

A convert's `branchId` is set at registration and was otherwise immutable. Super admins can now
reassign it from the **Manage** modal on the Converts page.

## Backend
- New `super_admin`-only endpoint `PATCH /v1/admin/converts/:convertId/branch` (`{ branchId }`).
  New module files `modules/admin/convert.{service,controller,routes,validation}.ts`; mounted in
  `app.ts` at `/v1/admin/converts` behind `authorize('super_admin')` (sits between the
  `adminStageRoutes` and `certificateAdminRoutes` mounts on the same path).
- `adminConvertService.changeBranch()` verifies the requester can access the convert's *current*
  branch (`assertBranchAccess`), that the target branch exists and is active
  (`branchService.assertActiveBranch`), then sets `branchId` and **clears `mentorId` and
  `cohortId`** — mentors and cohorts are themselves branch-scoped, so the move must not leave a
  cross-branch assignment. No denormalized counters to fix (mentor `flockCount` / cohort
  `memberCount` are both computed via aggregation).

## Frontend
- `adminApi.changeConvertBranch(convertId, branchId)`.
- `ConvertManageModal.tsx` gains a **Branch** section, rendered only for `isSuperAdmin()`: a
  `<select>` of active branches (preselected to the convert's current branch via the new
  `convertBranchId` prop, passed from `AdminConvertsPage.tsx`'s `managing.branchId`) + a **Move**
  button, with a note that moving clears mentor & cohort. On success it calls `onChanged()` which
  refetches the list + stats.

---

# Production deployment (discipleship.slchurchng.org)

Server `62.238.33.106` (Ubuntu 26.04, user `tunji`). SPA + API are **same-origin** behind nginx,
mirroring the local Docker setup. DB is **MongoDB Atlas** (nothing Mongo on the box). API runs
under **PM2** (`dms-api`), resurrected on boot by `pm2-tunji.service`.

## `deploy/` (in the repo)
- `setup-server.sh` — idempotent one-time bootstrap: 2G swap, Node, PM2 (+boot+logrotate),
  certbot (snap), ufw, `/var/www/dms/{app,shared,logs}`, nginx vhost, and a root-owned
  `/usr/local/sbin/dms-nginx-sync` helper + scoped `sudoers.d/dms-deploy` (the only passwordless
  sudo `tunji` gets).
- `nginx/discipleship.slchurchng.org.conf` — vhost: static SPA from
  `/var/www/dms/app/dms-frontend/dist`, proxies `/v1`, `/socket.io`, `/health` → `127.0.0.1:4000`.
- `backend.env.production.example` — the production env template; every line needing a real value
  is marked `# ⚠ CHANGE`.
- `check-env.sh` — enforces the env checklist (parses, doesn't source — the cron value is
  unquoted). `deploy.sh` runs it first and **aborts** on any hard failure.
- `deploy.sh` — runs on the server: preflight → `git reset --hard origin/<branch>` → backend
  `npm ci`+build+`pm2 reload` → frontend `npm ci`+build → `dms-nginx-sync` → health check.
  Toggles: `RUN_SEED=1`, `RUN_MIGRATE=1 MIGRATE_BRANCH_NAME=…`, `SKIP_FRONTEND/BACKEND=1`,
  `NO_NGINX=1`.
- `remote-deploy.sh` — workstation trigger (`ssh … && deploy.sh`).
- `README.md` — full runbook + the env-checklist table + troubleshooting.

## Server layout
```
/var/www/dms/app/        git clone (dms-backend/.env → symlink to ../shared/backend.env)
/var/www/dms/shared/backend.env   production secrets (not in git, chmod 600)
/var/www/dms/logs/       pm2 logs
```

## Backend change for prod
- `app.ts`: `app.set('trust proxy', 'loopback')` — correct `req.ip` / rate-limiting / protocol
  behind nginx on 127.0.0.1, without letting external clients spoof `X-Forwarded-For`.

## Go-live checklist — status (2026-09-02)
1. ✅ DNS `A`: `discipleship.slchurchng.org` → `62.238.33.106`.
2. ✅ Atlas: server IP whitelisted, `dms` r/w user, SRV string in `backend.env`.
3. ✅ Repo cloned at `/var/www/dms/app`, `backend.env` created, `check-env.sh` passes.
4. ✅ First deploy done — super_admin (`admin@slchurchng.org`) + "Believers Class" course seeded.
5. ✅ `SMS_PROVIDER=termii` (sender `HBridge`) — convert phone-OTP login/registration live.
6. ⏳ **TLS**: issue the cert once with `sudo certbot certonly --nginx -d discipleship.slchurchng.org`
   then `sudo /usr/local/sbin/dms-nginx-sync`. The repo vhost already carries the self-contained
   `:443` block + HTTP→HTTPS redirect, so `dms-nginx-sync` keeps HTTPS across deploys — do **not**
   run `certbot --nginx` (it would rewrite the vhost). Auth needs HTTPS (refresh cookie is `Secure`).
7. ⏳ Post-TLS: log in as super_admin (forced password change), create the first branch(es),
   then branch admins / mentors / cohorts.
8. ⏳ Rotate `CLOUDINARY_API_SECRET` (currently empty/dev value — `check-env.sh` warns).
