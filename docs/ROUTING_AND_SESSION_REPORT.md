# Routing & Session Report — AGENT-D Report
> Delivered by AGENT-D (Sonnet) · Phase 1 · 2026-06-05

## Files Analyzed
- `src/main/webapp/inkly-app.jsx`
- `src/main/webapp/inkly-login.jsx`
- `src/main/webapp/inkly-signup.jsx`

---

## 1. Router Type

| Property | Value |
|---|---|
| Router component | `HashRouter` |
| React Router version | v6 (`Routes`, `Route`, `Outlet`, `Navigate`, `useNavigate`, `useLocation`, `NavLink`) |
| URL scheme | Hash-based — paths prefixed with `#`, e.g. `http://localhost:3000/Inkly.html#/dashboard` |

`HashRouter` is appropriate — app has no server-side routing; static HTML file served by `live-server`. Hash routing avoids 404s on page refresh.

---

## 2. Route Inventory

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login` | Public (RedirectIfAuth) |
| `/signup` | `Signup` | Public (RedirectIfAuth) |
| `/dashboard` | `Dashboard` | Protected |
| `/tasks` | `MyTasksPage` | Protected |
| `/kanban` | `Kanban` | Protected |
| `/calendar` | `CalendarPage` | Protected |
| `/teams` | `TeamBoardsPage` | Protected |
| `/inbox` | `InboxPage` | Protected |
| `/settings` | `SettingsPage` | Protected |
| `/analytics` | `Placeholder` | Protected |
| `*` | redirect → `/login` | — |

---

## 3. `ProtectedRoute` — Current Implementation

```jsx
function ProtectedRoute() {
  const token = INKLY_API.getToken();  // synchronous localStorage read
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
```

**Checks:** Non-null string in `localStorage.getItem("inkly_token")`.
**Does NOT check:** Token expiry, token validity, server state.
**Result:** Any non-null localStorage string grants access.

---

## 4. `RedirectIfAuth` — Current Implementation

```jsx
function RedirectIfAuth() {
  const token = INKLY_API.getToken();  // synchronous localStorage read
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
```

Identical mechanism. If token exists → redirect away from login/signup.

---

## 5. Session Restoration on Page Refresh

**Current: none.** On hard refresh:
1. React remounts
2. Route guards evaluate synchronously from localStorage
3. **No `/api/me` call** — server never consulted
4. No `authChecked` flag, no loading spinner
5. Stale/expired/revoked tokens pass the guard

User may briefly access protected pages with an invalid token until the next API call returns 401.

---

## 6. Auth Callbacks

### `handleSignIn(data)` — called after successful login
```jsx
function handleSignIn(data) {
  navigate("/dashboard");
  ctx.pushToast("Welcome back, " + firstName + "!");
}
```
- Navigates to `/dashboard`, shows toast
- **No React `user` state is set** — auth lives only in localStorage

### `handleSignedUp(data)` — called after successful register
```jsx
function handleSignedUp(data) {
  navigate("/dashboard");
  ctx.pushToast(`Workspace "${data.workspace}" created — welcome, ${firstName}!`);
}
```
Same pattern — no React user state.

---

## 7. Logout Flow

```jsx
function handleLogout() {
  INKLY_API.logout();   // clears localStorage
  navigate("/login");
}
```

- Clears `inkly_token` and `inkly_user` from localStorage
- Navigates to `/login`
- **No server-side call**, **no React state cleared**

---

## 8. `inkly:session-expired` Handler

```jsx
function onSessionExpired() {
  navigate("/login");
  ctx.pushToast("Session expired — please sign in again.");
}
window.addEventListener("inkly:session-expired", onSessionExpired);
```

- Triggered when any authenticated request returns 401
- Navigates to `/login`, shows toast
- Does not clear any React user state (no user state exists)

---

## 9. Problems With the Current Approach

| # | Problem | Impact |
|---|---|---|
| 1 | Guards read localStorage only — no server validation | Expired/revoked tokens grant access until first 401 |
| 2 | No async session restoration — no `/api/me` on startup | Server state never verified on load |
| 3 | No `authChecked` / loading state | Flash-of-wrong-screen risk when async check is added |
| 4 | No React `user` state — auth entirely in localStorage | Re-renders don't react to auth state changes |
| 5 | "Remember Me" checkbox is non-functional | False UX expectation; always uses localStorage regardless |

---

## 10. Required Changes

### A. Context — add `user` + `authChecked`
```jsx
// App component
const [user, setUser] = useState(null);
const [authChecked, setAuthChecked] = useState(false);
// expose in ctx: { ..., user, setUser, authChecked }
```

### B. Session restoration on startup
```jsx
// In App, before rendering routes
useEffect(() => {
  INKLY_API.getMe()          // calls GET /api/me with credentials:include
    .then(profile => setUser(profile))
    .catch(() => {})           // unauthenticated — user stays null
    .finally(() => setAuthChecked(true));
}, []);
```

### C. Loading gate
```jsx
if (!authChecked) return <div className="app-loading"><span className="spinner" /></div>;
```

### D. `ProtectedRoute` — React state
```jsx
function ProtectedRoute() {
  const { user } = useInkly();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```

### E. `RedirectIfAuth` — React state
```jsx
function RedirectIfAuth() {
  const { user } = useInkly();
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
```

### F. `handleSignIn` / `handleSignedUp` — set user state
```jsx
function handleSignIn(data) {
  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  navigate("/dashboard");
  ctx.pushToast("Welcome back, " + firstName + "!");
}
```

### G. Logout + session-expired — clear user state
```jsx
function handleLogout() {
  INKLY_API.logout();   // calls POST /api/auth/logout (cookie cleared server-side)
  setUser(null);
  navigate("/login");
}

function onSessionExpired() {
  setUser(null);
  navigate("/login");
  ctx.pushToast("Session expired — please sign in again.");
}
```
