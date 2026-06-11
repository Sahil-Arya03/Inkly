# Frontend Implementation Report — AGENT-G
> Chief Architect (implemented directly) · Phase 4+5+6 · 2026-06-05

## Files Changed

| File | Change Type |
|---|---|
| `src/main/webapp/inkly-api.jsx` | Rewritten — removed token layer, added cookie auth |
| `src/main/webapp/inkly-app.jsx` | Modified — user state, session restoration, route guards |
| `src/main/webapp/inkly-login.jsx` | Modified — pass `remember` to `login()` |
| `src/main/webapp/inkly-kanban.jsx` | Fixed — replaced `getToken()` with `getUser()` |

---

## 1. inkly-api.jsx

### Removed
| Symbol | Reason |
|---|---|
| `TOKEN_KEY = "inkly_token"` | Token no longer stored client-side |
| `getToken()` | Token in HttpOnly cookie — unreadable by JS |
| `setToken(t)` | Server sets cookie via Set-Cookie header |
| `clearToken()` | Server clears cookie via logout endpoint |
| `isTokenExpired()` | Server enforces expiry via JWT `exp` claim |
| `Authorization: Bearer` header in `request()` | Browser sends cookie automatically |

### Added
| Symbol | Purpose |
|---|---|
| `credentials: 'include'` on all fetch calls | Browser sends `inkly_token` cookie automatically |
| `login(email, password, rememberMe)` | Passes `rememberMe` boolean to backend |
| `async logout()` | Calls `POST /api/auth/logout` to clear server-side cookie |
| `getMe()` | Calls `GET /api/me` for session restoration; returns user profile or null |

### Export changes
- Removed from public API: `getToken`, `clearToken`, `isTokenExpired`
- Added to public API: `getMe`
- `logout` is now `async`

**Why:** The frontend no longer participates in token management. The browser handles cookie transmission transparently. This eliminates the entire localStorage token attack surface.

---

## 2. inkly-app.jsx — 7 changes

### A. Added `user` + `authChecked` state to `App`
```js
const [user, setUser] = useStateApp(null);
const [authChecked, setAuthChecked] = useStateApp(false);
```
Both exposed in `InklyContext` so all child components can read/set auth state.

### B. Session restoration effect
```js
useEffectApp(() => {
  INKLY_API.getMe()
    .then(function(profile) { if (profile) setUser(profile); })
    .catch(function() {})
    .finally(function() { setAuthChecked(true); });
}, []);
```
Runs once on mount. Calls `/api/me` — the browser sends `inkly_token` cookie automatically. If valid → user state set. If 401 → user remains null. Either way, `authChecked` becomes `true` and routes are unblocked.

### C. Loading gate
```jsx
if (!authChecked) {
  return (
    <div style={{...centered...}}>
      <span className="spinner" style={{width:24,height:24}}/>
    </div>
  );
}
```
Prevents flash-of-wrong-screen during the async `/api/me` check. No route guard fires until `authChecked = true`.

### D. `ProtectedRoute` — React state
```jsx
function ProtectedRoute() {
  const { user } = useInkly();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```
Previously read `INKLY_API.getToken()` (localStorage). Now reads server-validated React state.

### E. `RedirectIfAuth` — React state
```jsx
function RedirectIfAuth() {
  const { user } = useInkly();
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
```
Same improvement as `ProtectedRoute`.

### F. Auth callbacks set user state
Both `handleSignIn` and `handleSignedUp` in `AppRoutes` now call `ctx.setUser({...})` before navigating. This means the route guards see the authenticated user immediately after login without waiting for a page refresh.

### G. Logout + session-expired clear user state
Both `handleLogout` implementations (`AppRoutes` and `MainLayout`) call `ctx.setUser(null)` after `INKLY_API.logout()`. The `inkly:session-expired` event handler also calls `ctx.setUser(null)`. This ensures React route guards immediately reflect the unauthenticated state.

---

## 3. inkly-login.jsx

**Change:** `INKLY_API.login(email, pw, remember)` — passes the "Remember me for 30 days" checkbox value as the third argument. Previously the `remember` state was tracked but never used.

**Why:** The checkbox now controls whether the backend issues a 24h or 30-day cookie.

---

## 4. inkly-kanban.jsx (Fix)

**Change:** `INKLY_API.getToken()` → `INKLY_API.getUser()` on line 455.

**Why:** `getToken` was removed from the API. The Kanban component uses this check to decide whether to attempt the real API or fall back to mock data. `getUser()` (returns localStorage profile or null) is the correct replacement — if a user profile exists, the session is active.

---

## Route Protection Summary

| Route | Guard | Check | Result when unauthenticated |
|---|---|---|---|
| `/dashboard` through `/settings` | `ProtectedRoute` | `user !== null` | Redirect to `/login` |
| `/login`, `/signup` | `RedirectIfAuth` | `user !== null` | Redirect to `/dashboard` |
| `*` (catch-all) | None | — | Redirect to `/login` |

---

## Session Flow (Before vs After)

### Before
```
Page load → check localStorage("inkly_token") → if present: render protected page
Refresh    → check localStorage("inkly_token") → if present: render protected page (no server check)
Login      → store token in localStorage → navigate to /dashboard
Logout     → clear localStorage → navigate to /login
```

### After
```
Page load  → show spinner → GET /api/me (cookie sent auto) → set user state → render
Refresh    → show spinner → GET /api/me (cookie sent auto) → set user state → render
Login      → server sets cookie → set user state → navigate to /dashboard
Logout     → POST /api/auth/logout (server clears cookie) → set user=null → navigate to /login
```
