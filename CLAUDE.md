# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend (Vite — lives in `frontend/`):**
```bash
npm install --prefix frontend   # one-time: install deps (or: cd frontend && npm install)
npm run dev                      # Vite dev server on port 3000; proxies /api → :8081
npm run build                    # production build → frontend/dist/
npm run lint                     # ESLint (flat config, eslint src)
```
Root `npm run dev|build|lint` delegate to `frontend/` via `npm --prefix frontend …`; the same scripts also work when run directly inside `frontend/`.

**Backend (Spring Boot / Maven):**
```bash
mvn clean package        # build WAR
mvn spring-boot:run      # start Spring Boot on port 8081 (set in application.properties)
mvn cargo:run            # alternative: embedded Tomcat on port 8080
mvn test                 # run JUnit tests
```

**Both servers must be running** for auth and kanban to work. Start the backend first (`mvn spring-boot:run`), then the frontend (`npm run dev`). The Vite dev server proxies `/api` to the backend, so the browser sees a single origin and the `inkly_token` cookie stays same-site.

## Architecture

**Inkly** is a workspace/note-taking app with kanban boards and dashboards. The frontend and backend are partially integrated — auth and kanban hit the real API; other pages still use mock data.

### Frontend (`frontend/`)

**Vite + ES modules.** The frontend is a standard Vite project in `frontend/`: React 18 + react-router-dom v6 as deps, `@vitejs/plugin-react` (automatic JSX runtime — no `import React` needed except for `React.Fragment`/`React.*`). No CDN, no in-browser Babel. `frontend/index.html` is the Vite entry; it loads a single module `src/main.jsx`, which imports `inkly.css` and renders `<App />` via `react-dom/client` `createRoot`.

**Source layout (`frontend/src/`)** — every file is an ES module with explicit `import`/`export` (no `window.*` globals, no aliased hooks):
- `main.jsx` — Vite entry; imports CSS + `App`, mounts the root
- `inkly-api.js` — `INKLY_API` object: cookie-based auth (`login()`, `signup()`, `logout()`, `getMe()`), profile cache, `kanban.*`; reads backend base from `import.meta.env.VITE_API_BASE`. `export const INKLY_API`
- `inkly-context.js` — `InklyContext` + `useInkly()` (extracted so pages can consume context without importing `App`, avoiding an import cycle)
- `inkly-error-boundary.jsx` — `ErrorBoundary` class component; wraps `<Outlet/>` in `MainLayout` so a render error shows a themed fallback + Reload button instead of a blank screen
- `tweaks-panel.jsx` — `useTweaks()` hook + design token UI components
- `inkly-icons.jsx` — SVG icon sprite (`export { Icons, I }`); icons referenced by name string
- `inkly-data.js` — mock data (`export { INKLY_DATA, peopleById }`) for pages not yet wired to the API
- `inkly-chrome.jsx` — `Sidebar`, `Topbar`, `Avatar`
- Page modules: `inkly-login.jsx`, `inkly-signup.jsx`, `inkly-dashboard.jsx`, `inkly-kanban.jsx`, `inkly-tasks.jsx`, `inkly-calendar.jsx`, `inkly-teams.jsx`, `inkly-inbox.jsx`, `inkly-settings.jsx`
- `inkly-app.jsx` — root `App` (`export default`); imports all pages + chrome + context

CSS (`inkly.css`, `styles.css`) lives in `frontend/src/`; only `inkly.css` is imported (in `main.jsx`).

**Build & serving:** `npm run build` emits `frontend/dist/` (`index.html` + hashed `assets/*.js|css`). `application.properties` sets `spring.web.resources.static-locations=file:./frontend/dist/,classpath:/static/` so Spring can serve the build. **Caveat:** `SecurityConfig` authenticates `anyRequest()`, so to actually serve the SPA shell + `/assets/**` through Spring you must `permitAll()` `/`, `/index.html`, and `/assets/**` there. Dev mode (`npm run dev`) is unaffected — Vite serves the frontend and proxies `/api`.

**Linting:** ESLint v9 flat config (`frontend/eslint.config.js`) for React 18 + hooks; `react/react-in-jsx-scope`, `react/prop-types`, and `react/no-unescaped-entities` are off. `npm run lint` is clean (0 errors; a few `react-hooks/exhaustive-deps` warnings are intentional, matching the original `[]` dependency arrays).

**Routing** uses **React Router v6** with `HashRouter` (hash-based URLs, e.g. `/#/dashboard`). All navigation uses `useNavigate()`. Route guards are `ProtectedRoute` and `RedirectIfAuth` components in `inkly-app.jsx`. Valid routes: `login`, `signup`, `dashboard`, `tasks`, `kanban`, `calendar`, `teams`, `inbox`, `settings`.

**API client (`inkly-api.js`):**
- `INKLY_API.login(email, password, rememberMe?)` — POST `/api/auth/login`; server sets `inkly_token` HttpOnly cookie (24h or 30d based on `rememberMe`); stores user profile in `localStorage`
- `INKLY_API.signup(name, email, password, workspace)` — POST `/api/auth/register`; server sets 24h HttpOnly cookie
- `INKLY_API.logout()` — async; POST `/api/auth/logout` (server clears cookie); clears user profile from `localStorage`
- `INKLY_API.getMe()` — GET `/api/me` with `credentials:'include'`; returns `{ email, name, workspace, role }` or `null`; used for session restoration on startup
- `INKLY_API.getUser()` — returns `{ email, name, workspace }` from `localStorage` (non-sensitive profile cache)
- `INKLY_API.kanban.fetchBoard()` — GET `/api/boards`; returns `{ workspaceId, boardId, boardName, columns[] }`; uses `silent: true` so a 401 never fires session-expired
- `INKLY_API.kanban.createCard(data)` — POST `/api/cards`; accepts `{ workspaceId, boardId, columnId, title, description, priority? }`; **description is required**
- `INKLY_API.kanban.moveCard(cardId, columnId, afterCardId, beforeCardId)` — PATCH `/api/cards/:id/move`
- All fetch calls use `credentials: 'include'` — browser sends `inkly_token` cookie automatically; no Authorization header needed
- A `401` on any authenticated call fires `inkly:session-expired`, clears user profile, and redirects to login
- **JWT is never accessible to JavaScript** — it lives only in the HttpOnly cookie

**Theming system:**
- `[data-theme="light|dark"]` and `[data-density="cozy|comfy|roomy"]` are set as attributes on `<html>`.
- Accent color is one of four presets (`ink-blue`, `moss`, `clay`, `graphite`) applied as CSS custom properties via `applyAccent()` in `inkly-app.jsx`.
- All colors use OKLch (`--paper`, `--ink-1/2/3/4`, `--accent`, `--accent-soft/tint/ink`).
- `useTweaks()` (in `tweaks-panel.jsx`) persists all design token overrides to `localStorage`.

**Default configuration:** the accent/density/theme defaults are the `INKLY_DEFAULTS` constant at the top of `inkly-app.jsx`:
```js
{ accent: "ink-blue", density: "comfy", theme: "dark" }
```
The backend URL is no longer part of this block — it comes from `VITE_API_BASE` (see `frontend/.env` / `frontend/.env.example`, default `http://localhost:8081`) and is read by `inkly-api.js` via `import.meta.env.VITE_API_BASE`.

### Key frontend components

**`inkly-chrome.jsx` — Sidebar + Topbar:**
- `Sidebar` — icon rail navigation; `onNav(routeName)` for all items; brand logo click → dashboard; user button → logout
- `Topbar` — accepts `onNav` prop; global search input navigates to matching page on Enter (e.g. typing "kanban" → kanban page); notifications bell → inbox; theme toggle; "New" button → quick-create toast

**`inkly-kanban.jsx` — Kanban board:**
- `Kanban` — main board component; fetches from API on mount using context `user` (not localStorage); stores `workspaceId` and `boardId` from the board response; falls back to empty state (not mock data) if API fails
- `FieldSelect` — themed dropdown component used in `CreateTaskModal`; uses `position: absolute` with `overflow: visible` on the modal wrapper so options render outside the modal bounds without clipping
- `Column` — renders a board column with drag-drop support; no inline add-task buttons
- `TaskCard` — individual card with drag handlers; "more" (⋯) button shows toast
- `CreateTaskModal` — themed popup; **both title and description are required** (submit button disabled until both filled); column and priority use `FieldSelect` themed dropdowns; calls `INKLY_API.kanban.createCard()` with `workspaceId` + `boardId` + `columnId`
- `TaskModal` — detail modal for viewing a card's info, subtasks, and comments
- `RightPanel` — sprint progress, activity feed, upcoming deadlines sidebar
- Drag & drop uses HTML5 drag events with optimistic updates + API sync + rollback on failure
- Filters: All / Assigned to me / High priority; search by title/ID

**`inkly-login.jsx` / `inkly-signup.jsx`:**
- Accept `onPushToast` prop for OAuth button feedback, forgot password, terms/privacy links
- OAuth buttons show "SSO coming soon" toast; forgot password shows "reset link sent" toast

**`inkly-dashboard.jsx`:**
- Accepts `onNav` prop; "OPEN CALENDAR" action navigates to calendar; "Daily plan" shows toast

**`inkly-calendar.jsx`:**
- Three views: Month (grid), Week (time-based grid), Day (hourly timeline)
- View toggle (Month/Week/Day) switches the actual layout
- Category filters, day picker, upcoming events sidebar

**`inkly-app.jsx` — root component:**
- `App` holds `user` (object or null) and `authChecked` (boolean) state in `InklyContext`
- On mount: calls `INKLY_API.getMe()` — if cookie is valid, sets `user` from `/api/me` response; shows a spinner until `authChecked = true` (prevents flash-of-wrong-screen)
- `ProtectedRoute` — renders `<Outlet />` if `user !== null`, else redirects to `/login`
- `RedirectIfAuth` — redirects to `/dashboard` if `user !== null`, else renders public page
- `handleSignIn` / `handleSignedUp` — call `ctx.setUser({...})` after login/signup to immediately update route guards
- `handleLogout` — calls `INKLY_API.logout()` then `ctx.setUser(null)`; `inkly:session-expired` event also calls `ctx.setUser(null)`

### Backend (`src/main/java/`)

The backend is **Spring Boot 4.1 (RC)** packaged as a WAR, listening on port **8081**.

**Auth layer (`com.controllers`, `com.security`):**
- `AuthController` — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
  - Both register and login call `WorkspaceSetupService.bootstrap()` to create the kanban user + workspace if missing (idempotent)
  - Login/register set `inkly_token` HttpOnly cookie via `Set-Cookie` response header (not in body)
  - Login accepts `rememberMe: boolean` — `true` → 30-day cookie (Max-Age=2592000), `false` → 24h (Max-Age=86400)
  - Logout sets `Max-Age=0` to expire the cookie; no auth required to call it
  - `AuthResponse` contains `{ email, name, workspace, expiresIn }` — **no token field**
- `MeController` — `GET /api/me`; returns `{ email, name, workspace, role }` from JWT; requires auth; used for session restoration
- `SecurityConfig` — stateless JWT sessions, CORS configured from `cors.allowed-origins` (comma-separated); `allowCredentials=true` so browsers send cookies cross-origin; `/api/auth/**` public, everything else authenticated
- `JwtAuthFilter` — reads `inkly_token` cookie first, falls back to `Authorization: Bearer` header (dev/tooling only)
- `JwtUtil` — `generate(email)` = 24h; `generate(email, rememberMe)` = 24h or 30d
- `UserDetailsServiceImpl` + `UserRepository` — loads users from `APP_USERS` table by email

**Kanban module (`com.kanban`):**
- `KanbanController` — `GET /api/boards`, `POST /api/cards`, `PATCH /api/cards/{id}/move`
- `BoardService` — `loadBoardForUser(email)` finds the board for the user's workspace slug; `BoardLoadResponse` now includes `workspaceId` (required by `createCard`)
- `CardService` — `createCard()` requires `workspaceId`, `boardId`, `columnId`, `title`, `description` (all non-null); uses pessimistic lock for per-workspace sequential card numbering
- `WorkspaceSetupService` — bootstraps kanban setup for a new auth user: creates `KanbanUser`, `Workspace`, `WorkspaceCounter`, `Membership`, `Board`, and 5 default columns (Backlog, To Do, In Progress, Review, Done); safe to call repeatedly — skips if kanban user already exists
- `RankGenerator` — lexicographic rank strings for drag-and-drop ordering
- `KanbanSeeder` — seeds demo data only under `--spring.profiles.active=seed`; not used in normal operation
- Domain entities: `Workspace`, `Board`, `BoardColumn`, `Card`, `Label`, `Sprint`, `Membership`, `Comment`, `Attachment`, `KanbanUser`

**DTOs (`com.dto`):** `AuthRequest`, `AuthResponse`, `RegisterRequest`, `ErrorResponse`

**Database:**
- PostgreSQL on **Neon** (cloud): `ep-steep-brook-aoaf38ce-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb`
- Credentials in `application.properties` (`neondb_owner` / `npg_5ZJSpjXVovC3`)
- `spring.jpa.hibernate.ddl-auto=none` — schema managed by **Flyway**
- Flyway migrations in `src/main/resources/db/migration/`; current: `V1__kanban_schema.sql`

**Database tables:**

| Table | Purpose |
|---|---|
| `APP_USERS` | Auth users — email, hashed password, name, workspace name |
| `users` | Kanban-domain users — email, name, avatar (separate from `APP_USERS`) |
| `workspaces` | One workspace per registered user (slug derived from workspace name) |
| `workspace_counters` | Per-workspace monotonic counter for card seq numbers (INK-1, INK-2…) |
| `memberships` | Links kanban users to workspaces with a role |
| `boards` | Kanban boards inside a workspace |
| `board_columns` | Columns inside a board (Backlog, To Do, In Progress, Review, Done) |
| `cards` | Task cards — title, description, priority, rank, due date, created_by |
| `sprints` | Sprint metadata |
| `labels` / `card_labels` | Tags on cards |
| `card_assignees` | Who is assigned to a card |
| `comments` | Comments on cards |
| `attachments` | File attachments on cards |

**Why two user tables:** `APP_USERS` is the Spring Security auth table (JWT validation); `users` is the kanban domain table referenced by `cards.created_by` and `card_assignees`. `WorkspaceSetupService` keeps them in sync on every login/register.

**Key config (`application.properties`):**
- `jwt.secret` — signing key (**must move to env var before production**; current value is committed)
- `jwt.expiry-ms=86400000` — base 24h token lifetime; `rememberMe=true` overrides to 30 days in `JwtUtil`
- `cors.allowed-origins=http://localhost:3000,http://localhost:55067,http://127.0.0.1:3000,http://127.0.0.1:55067` — multiple origins supported; add any additional dev ports here
- `inkly.kanban.wip.strict=false` — WIP limit violations warn only; set `true` to block moves

**Cookie name:** `inkly_token` — HttpOnly, SameSite=Lax, Path=/. Missing `Secure` flag intentionally for HTTP dev; add it for HTTPS production.

### Integration status

| Area | Status |
|---|---|
| Login / Signup | Live — hits `/api/auth/*`; kanban workspace bootstrapped automatically on every login/register |
| Kanban board | Live — hits `/api/boards`, `/api/cards`; create-task modal calls `POST /api/cards` |
| Kanban card creation | Live — title + description both required; column and priority use themed dropdowns |
| Kanban drag & drop | Live — optimistic update + `PATCH /api/cards/:id/move` with rollback on failure |
| Dashboard | Mock data; "OPEN CALENDAR" navigates to calendar; "Daily plan" shows toast |
| Calendar | Mock data; Month/Week/Day views all render; category filters and day picker work |
| My Tasks | Mock data; filters, search, and task detail modal work |
| Teams | Mock data; board cards navigate to kanban; search/filter/workload bars work |
| Inbox | Mock data; mark read/unread, archive, detail panel with reply form all work |
| Settings | Mock data; profile edit, sessions, privacy toggles, account switching, delete account all work |

### Button wiring status

All visible buttons now have click handlers. Buttons for features not yet built show toast feedback (e.g. "Advanced filters coming soon"). Key wired interactions:
- **Sidebar**: all nav items, brand logo → dashboard, user button → logout
- **Topbar**: search (Enter to navigate), bell → inbox, theme toggle, "New" → toast
- **Kanban**: "Create task" → modal popup, card drag & drop, card click → detail modal, card ⋯ → toast, filter/group → toast
- **Login/Signup**: OAuth → toast, forgot password → toast, terms/privacy → toast
- **Dashboard**: "OPEN CALENDAR" → calendar, "Daily plan" → toast, "New task" → toast
- **Calendar**: month/week/day toggle, category filters, "Today" jump, "New event" → toast
- **Teams**: board cards → kanban, filters/sort → toast, "New board" → toast
- **Inbox**: mark read/unread, archive, mark all read, snooze/archive/reply → toast
- **Settings**: profile save/reset, session logout, privacy toggles, account switching, delete with confirmation

The old `homeController` stub and legacy `com.helper.factoryprovider` / `com.entities.Note` may still exist but are unused. The `com.entities.User` entity is the active user model.
