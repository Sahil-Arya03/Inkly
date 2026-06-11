# Frontend Auth Audit — AGENT-B Report
> Delivered by AGENT-B (Haiku) · Phase 1 · 2026-06-05

## Files Audited
- `src/main/webapp/inkly-api.jsx`
- `src/main/webapp/inkly-app.jsx`
- `src/main/webapp/inkly-login.jsx`
- `src/main/webapp/inkly-signup.jsx`

---

## 1. localStorage Operations

### Token Storage (`inkly-api.jsx`)
| Key | Operation | Location | Value |
|---|---|---|---|
| `inkly_token` | Read | `getToken()` | JWT string |
| `inkly_token` | Write | `setToken(t)` | JWT string from login/register response |
| `inkly_token` | Delete | `clearToken()` | — |

### User Profile Storage (`inkly-api.jsx`)
| Key | Operation | Location | Value |
|---|---|---|---|
| `inkly_user` | Read | `getUser()` | JSON `{email, name, workspace}` |
| `inkly_user` | Write | `setUser(u)` | JSON `{email, name, workspace}` |
| `inkly_user` | Delete | `clearUser()` | — |

**sessionStorage:** No sessionStorage calls found anywhere.

---

## 2. JWT Token Read/Write Points

**Written on login:**
```js
// inkly-api.jsx — login()
setToken(data.token);
setUser({ email: data.email, name: data.name, workspace: data.workspace });
```

**Written on signup:**
```js
// inkly-api.jsx — signup()
setToken(data.token);
setUser({ email: data.email, name: data.name, workspace: data.workspace });
```

**Read for injection:**
```js
// inkly-api.jsx — request()
const token = getToken();
...(token ? { "Authorization": "Bearer " + token } : {})
```

**Read for route protection:**
```js
// inkly-app.jsx — ProtectedRoute
const token = INKLY_API.getToken();
return token ? <Outlet /> : <Navigate to="/login" replace />;
```

**Cleared on 401:**
```js
// inkly-api.jsx — request()
clearToken();
clearUser();
window.dispatchEvent(new CustomEvent("inkly:session-expired"));
```

---

## 3. Route Protection

### ProtectedRoute
```jsx
function ProtectedRoute() {
  const token = INKLY_API.getToken();   // reads localStorage — no server validation
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
```
Protected routes: `/dashboard`, `/tasks`, `/kanban`, `/calendar`, `/teams`, `/inbox`, `/settings`, `/analytics`

### RedirectIfAuth
```jsx
function RedirectIfAuth() {
  const token = INKLY_API.getToken();   // reads localStorage — no server validation
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
```
Public-only routes: `/login`, `/signup`

**Problem:** Both guards read localStorage synchronously — no server round-trip. A tampered or expired localStorage entry gives full access/redirect without validation.

---

## 4. Login Success Flow

```
submit() → INKLY_API.login(email, pw)
  → POST /api/auth/login
  → data = { token, email, name, workspace, expiresIn }
  → setToken(data.token)     ← writes JWT to localStorage
  → setUser({...})           ← writes profile to localStorage
  → onSignIn(data)           ← callback in inkly-app.jsx
    → navigate("/dashboard")
    → pushToast("Welcome back, ...")
```

---

## 5. Logout Flow

```
handleLogout() in inkly-app.jsx
  → INKLY_API.logout()
    → clearToken()   ← removes from localStorage
    → clearUser()    ← removes from localStorage
  → navigate("/login")
```

**Problem:** No server-side call. The JWT remains valid on the backend for the remainder of its 24h lifetime. Anyone who captured the token can continue using it.

---

## 6. "Remember Me" Checkbox — Status

```jsx
// inkly-login.jsx
const [remember, setRemember] = useStateLogin(true);   // default: true

// Rendered:
<input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
<span>Remember me for 30 days</span>

// submit():
INKLY_API.login(email, pw)   // ← remember is NEVER passed here
```

**Finding:** The checkbox state is tracked in React but never used. It is not passed to `INKLY_API.login()`, and the API function signature does not accept it. The backend always issues a 24h token. **Completely non-functional.**

---

## 7. Session Expiry Handling

**Detection:** Automatic on 401 responses within `request()` helper
**Event dispatch:** `window.dispatchEvent(new CustomEvent("inkly:session-expired"))`
**Listener in `inkly-app.jsx` AppRoutes:**
```js
window.addEventListener("inkly:session-expired", onSessionExpired);
// → navigate("/login")
// → pushToast("Session expired — please sign in again.")
```

---

## 8. Session Restoration (Not Implemented)

On app startup / page refresh:
1. `App` component mounts
2. `AppRoutes` renders — `ProtectedRoute` checks `INKLY_API.getToken()`
3. If token found in localStorage → renders protected route immediately
4. **No call to `/api/me`** — server is never consulted
5. Stale, revoked, or tampered localStorage entries pass the guard

**Result:** Session restoration is purely client-side. The `MeController.getMe()` backend endpoint exists and is designed for this purpose, but is never called.

---

## 9. Issues Summary

| Severity | Issue |
|---|---|
| **CRITICAL** | JWT stored in `localStorage` — XSS-accessible; all of Inkly's runtime CDN scripts can read it |
| **HIGH** | No server-side logout — token stays valid 24h after client clears it |
| **HIGH** | Route guards use localStorage only — no server validation on app load |
| **HIGH** | No session restoration via `/api/me` — expired/revoked tokens not detected until next API call |
| **MEDIUM** | "Remember Me" checkbox is purely cosmetic — creates false user expectation |
| **MEDIUM** | `isTokenExpired()` function decodes JWT in JS — confirms token is fully readable client-side |
| **MEDIUM** | No `authChecked` loading state — flash-of-wrong-screen possible on page refresh |
| **LOW** | User profile stored unencrypted in localStorage |
