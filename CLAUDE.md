# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend dev server:**
```bash
npm run dev   # live-server on port 3000, opens Inkly.html
```

**Backend (Spring Boot / Maven):**
```bash
mvn clean package        # build WAR
mvn spring-boot:run      # start Spring Boot on port 8081 (set in application.properties)
mvn cargo:run            # alternative: embedded Tomcat on port 8080
mvn test                 # run JUnit tests
```

## Architecture

**Inkly** is a workspace/note-taking app with kanban boards and dashboards. The frontend and backend are fully decoupled — the frontend currently runs on mock data with no API calls.

### Frontend (`src/main/webapp/`)

**No build step.** React 18 + Babel are loaded via CDN (`unpkg`); all `.jsx` files are transpiled in-browser at runtime. `Inkly.html` is the single entry point and loads every `.jsx` and `.css` file as `<script type="text/babel">` in dependency order.

**Script load order matters** (defined in `Inkly.html`):
1. `tweaks-panel.jsx` — `useTweaks()` hook + design token UI components (must load before `inkly-app.jsx`)
2. `inkly-icons.jsx` — SVG icon sprite; all icons referenced by name string
3. `inkly-data.jsx` — all mock data constants (`PEOPLE`, `ME`, `TASKS`, `TAGS`, `PRIORITY`); no API calls
4. `inkly-chrome.jsx` — `Sidebar` + `Topbar` shell components
5. Page files: `inkly-login.jsx`, `inkly-dashboard.jsx`, `inkly-kanban.jsx`, `inkly-calendar.jsx`, `inkly-teams.jsx`, `inkly-inbox.jsx`
6. `inkly-app.jsx` — root `App` component; mounts via `ReactDOM.createRoot`

**Routing** is plain `useState` string in `App` (`route` state). There is no React Router. All navigation goes through `setRoute(routeName)`. Valid routes: `login`, `dashboard`, `kanban`, `calendar`, `teams`, `inbox`.

**Theming system:**
- `[data-theme="light|dark"]` and `[data-density="cozy|comfy|roomy"]` are set as attributes on `<html>`.
- Accent color is one of four presets (`ink-blue`, `moss`, `clay`, `graphite`) applied as CSS custom properties via `applyAccent()` in `inkly-app.jsx`.
- All colors use OKLch (`--paper`, `--ink-1/2/3/4`, `--accent`, `--accent-soft/tint/ink`).
- `useTweaks()` (in `tweaks-panel.jsx`) persists all design token overrides to `localStorage`.

**Default configuration** is in the `window.__INKLY_DEFAULTS` block inside `Inkly.html`, between `/*EDITMODE-BEGIN*/` and `/*EDITMODE-END*/` markers. These markers exist for a `window.postMessage` edit-mode protocol (`__EDITMODE_BEGIN/END`, `__activate_edit_mode`) for potential host-frame tooling integration.

### Backend (`src/main/java/`)

The backend is **Spring Boot 4.1 (RC)** packaged as a WAR, deployed via Cargo (Tomcat 10) or run directly. It listens on port **8081** (`application.properties`).

**Current state — skeleton only:**
- `com.controllers.homeController` — `@RestController` on `/Login`, no endpoints implemented yet
- `com.entities.Note` — JPA entity (`NOTES` table: id, title, content, addeddate); id is set via `new Random().nextInt(10000)` — no `@Id`/`@GeneratedValue` annotations yet
- `com.helper.factoryprovider` — Hibernate `SessionFactory` singleton (legacy Hibernate session API, separate from Spring's JPA layer)

**Dependencies in pom.xml:** Spring Boot Web + Security, Hibernate ORM 6.4, PostgreSQL driver, Lombok, jjwt (JWT 0.11.5).

**Hibernate config** (`src/main/resources/hibernate.cfg.xml`):
- PostgreSQL at `localhost:5432/jdbclearning` (user: `postgres` / pw: `2000`)
- `hbm2ddl.auto=create` — **drops and recreates the schema on every start**

### Integration gap

The frontend reads all data from `inkly-data.jsx` constants. The next step is creating Spring REST endpoints and replacing those constants with `fetch()` calls. The `homeController` stub and `Note` entity are the starting points. Spring Security is on the classpath but not configured — any new endpoints will be blocked by its default deny-all until a `SecurityFilterChain` bean is added.