# FEATURE_INVENTORY.md — Complete Feature Catalogue

> Date: 2026-06-10 | Branch: main

---

## Legend

- **LIVE** — fully wired: UI → API → DB
- **MOCK** — UI renders using `INKLY_DATA` constants; no API calls
- **STUB** — button/link exists, shows a toast; no backing implementation
- **SCHEMA** — table/entity exists in DB; no service, no API, no UI
- **DEAD** — code exists but is unreachable / unused

---

## Feature 1: User Registration

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | `/signup` route → `inkly-signup.jsx` |
| **UI Component** | `Signup` in `inkly-signup.jsx` |
| **API endpoint** | `POST /api/auth/register` |
| **Controller** | `AuthController.register()` |
| **Service** | `WorkspaceSetupService.bootstrap()` |
| **Database tables** | `APP_USERS`, `users`, `workspaces`, `workspace_counters`, `memberships`, `departments`, `boards`, `board_columns` |
| **Dependencies** | BCryptPasswordEncoder, JwtUtil, UserRepository, WorkspaceSetupService |
| **Notes** | On success: JWT set as HttpOnly cookie, user profile stored in `localStorage`. Also bootstraps an entire kanban workspace with 5 default columns. |

---

## Feature 2: User Login

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | `/login` route → `inkly-login.jsx` |
| **UI Component** | `Login` in `inkly-login.jsx` |
| **API endpoint** | `POST /api/auth/login` |
| **Controller** | `AuthController.login()` |
| **Service** | `WorkspaceSetupService.bootstrap()` (idempotent, runs on every login) |
| **Database tables** | `APP_USERS` (read), `users` (read), `workspaces` (read) |
| **Dependencies** | BCryptPasswordEncoder, JwtUtil |
| **Notes** | `rememberMe=true` → 30-day cookie; `false` → 24h. Login page has a hardcoded default email `avery@inkly.team` (development convenience, should be cleared before production). |

---

## Feature 3: Session Restoration

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | App startup in `inkly-app.jsx` `App()` component |
| **UI Component** | Spinner shown until `authChecked = true` |
| **API endpoint** | `GET /api/me` |
| **Controller** | `MeController.me()` |
| **Service** | None (reads from `APP_USERS` via `UserRepository`) |
| **Database tables** | `APP_USERS` |
| **Notes** | Prevents flash-of-wrong-screen. On cookie expiry → returns `null` → user stays on or is redirected to `/login`. |

---

## Feature 4: Logout

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | Sidebar user button → `handleLogout()` in `inkly-app.jsx` |
| **UI Component** | `Sidebar` in `inkly-chrome.jsx` |
| **API endpoint** | `POST /api/auth/logout` |
| **Controller** | `AuthController.logout()` |
| **Database** | No DB write — sets `Max-Age=0` on cookie |
| **Notes** | `inkly:session-expired` custom DOM event also triggers the same logout flow (fired from `INKLY_API.request()` on any 401). |

---

## Feature 5: Kanban Board View

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | `/kanban` route → `Kanban` component in `inkly-kanban.jsx` |
| **UI Components** | `Kanban`, `Column`, `TaskCard`, `RightPanel` |
| **API endpoint** | `GET /api/boards` |
| **Controller** | `KanbanController.getBoard()` |
| **Service** | `BoardService.loadBoardForUser(email)` |
| **Database tables** | `workspaces`, `boards`, `board_columns`, `cards` |
| **Response shape** | `BoardLoadResponse { workspaceId, boardId, boardName, columns[{ id, name, rank, wipLimit, cards[] }] }` |
| **Notes** | Falls back to "any board in system" if workspace slug doesn't match — covers seed profile. Columns in `rank` ASC order; cards in `rank` ASC within each column. |

---

## Feature 6: Kanban Card Creation

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | "Create task" button on Kanban header → `CreateTaskModal` |
| **UI Component** | `CreateTaskModal` in `inkly-kanban.jsx` |
| **API endpoint** | `POST /api/cards` |
| **Controller** | `KanbanController.createCard()` |
| **Service** | `CardService.createCard()` |
| **Database tables** | `cards`, `workspace_counters` (PESSIMISTIC_WRITE lock), `card_assignees` (optional) |
| **Validation** | title: `@NotBlank @Size(max=255)`, description: `@NotBlank @Size(max=10000)`, workspaceId/boardId/columnId: `@NotNull` |
| **Notes** | Seq number assigned under pessimistic lock to prevent duplicates. `humanId` = `SLUG-N` (e.g., `INK-42`). Assignee cross-validates department membership. |

---

## Feature 7: Kanban Drag & Drop (Card Move)

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | HTML5 drag events on `TaskCard` |
| **UI Component** | `TaskCard`, `Column`, `Kanban` in `inkly-kanban.jsx` |
| **API endpoint** | `PATCH /api/cards/{id}/move` |
| **Controller** | `KanbanController.moveCard()` |
| **Service** | `CardService.moveCard()` |
| **Database tables** | `cards` (column_id, rank updated), `board_columns` (wipLimit read) |
| **Pattern** | Optimistic update → API call → on failure: rollback to snapshot |
| **WIP enforcement** | `inkly.kanban.wip.strict=false` → warns only; `true` → throws 409 |

---

## Feature 8: Kanban Card Delete

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | Card ⋯ menu → "Delete card" (with `window.confirm()`) |
| **UI Component** | `CardMenu` in `inkly-kanban.jsx` |
| **API endpoint** | `DELETE /api/cards/{id}` |
| **Controller** | `KanbanController.deleteCard()` |
| **Service** | `CardService.deleteCard()` |
| **Database** | `cards` DELETE; CASCADE removes `card_assignees`, `card_labels`, `comments`, `attachments` |
| **Auth check** | Caller must be a member of the card's workspace |

---

## Feature 9: Assignee Picker

| Field | Value |
|---|---|
| **Status** | LIVE |
| **Entry point** | `CreateTaskModal` "Assigned to" dropdown |
| **UI Component** | `ThemedSelect` in `inkly-kanban.jsx` (populated by `fetchAssignees()`) |
| **API endpoint** | `GET /api/assignees` |
| **Controller** | `KanbanController.getAssignees()` |
| **Service** | `AssigneeService.fetchAssignees()` |
| **Database tables** | `memberships` (joined with `users` and `departments`) |
| **Notes** | Returns users in caller's workspace filtered by department. Falls back to all workspace members when no department set. |

---

## Feature 10: Dashboard

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/dashboard` route |
| **UI Component** | `Dashboard` in `inkly-dashboard.jsx` |
| **API endpoint** | None |
| **Notes** | All data from `INKLY_DATA`. "OPEN CALENDAR" navigates to `/calendar`. "Daily plan" shows toast. |

---

## Feature 11: My Tasks

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/tasks` route |
| **UI Component** | `MyTasksPage` in `inkly-tasks.jsx` |
| **API endpoint** | None |
| **Notes** | Filters, search, and task detail modal work — all on mock data. |

---

## Feature 12: Calendar

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/calendar` route |
| **UI Component** | `CalendarPage` in `inkly-calendar.jsx` |
| **API endpoint** | None |
| **Notes** | Month/Week/Day views render. Category filters and day picker work. No API integration. |

---

## Feature 13: Teams

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/teams` route |
| **UI Component** | `TeamBoardsPage` in `inkly-teams.jsx` |
| **API endpoint** | None |
| **Notes** | Board cards navigate to `/kanban`. All other actions show toast. |

---

## Feature 14: Inbox

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/inbox` route |
| **UI Component** | `InboxPage` in `inkly-inbox.jsx` |
| **API endpoint** | None |
| **Notes** | Mark read/unread, archive, detail panel with reply form all work (no persistence). |

---

## Feature 15: Settings

| Field | Value |
|---|---|
| **Status** | MOCK |
| **Entry point** | `/settings` route |
| **UI Component** | `SettingsPage` in `inkly-settings.jsx` |
| **API endpoint** | None — except logout button calls `handleLogout()` |
| **Notes** | Profile save/reset, session management, privacy toggles, account switching, delete account — all are UI-only stubs. |

---

## Feature 16: Theme / Design Tweaks

| Field | Value |
|---|---|
| **Status** | LIVE (client-side only) |
| **Entry point** | Tweaks panel (floating, accessible from every page) |
| **UI Component** | `TweaksPanel`, `useTweaks()` in `tweaks-panel.jsx`; `InklyTweaksPanel` in `inkly-app.jsx` |
| **Persistence** | `localStorage` |
| **Options** | Theme: light/dark; Accent: ink-blue/moss/clay/graphite; Density: cozy/comfy/roomy |

---

## Features With Schema But No UI/API

| Feature | Schema Location | Notes |
|---|---|---|
| Sprints | `sprints` table, `Sprint.java` | Column exists on cards but not used in board load or UI |
| Labels / Card Tags | `labels`, `card_labels` tables | Mock tags exist in `INKLY_DATA.TAGS`; no API |
| Comments | `comments` table, `Comment.java` | Count denormalized on card; no POST/GET comments API |
| Attachments | `attachments` table, `Attachment.java` | Count denormalized on card; no upload API |
| Analytics | Route `/analytics` exists | Renders a `Placeholder` component |
| SSO (Google/Microsoft) | — | Shows "SSO coming soon" toast |
| Forgot Password | — | Shows "reset link sent" toast |

---

## Dead / Legacy Code

| File / Class | Status | Notes |
|---|---|---|
| `homeController.java` | DEAD | Empty class, maps to `/Login` — does nothing |
| `KanbanSeeder.java` | CONDITIONAL | Only active under `--spring.profiles.active=seed`; never in production |
| `com.helper.factoryprovider` (referenced in CLAUDE.md) | NOT FOUND | Mentioned but not present in scanned files |
| `com.entities.Note` (referenced in CLAUDE.md) | NOT FOUND | Mentioned but not present in scanned files |
| `styles.css` | UNKNOWN | Present in webapp; `Inkly.html` only loads `inkly.css` |
| `WEB-INF/web.xml` | LEGACY | Present for WAR packaging; Spring Boot ignores it |
| `junit:junit:3.8.1` | DEAD | JUnit 3 test dep; actual tests use JUnit 5 |
