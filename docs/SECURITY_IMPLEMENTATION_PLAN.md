# Security Implementation Plan
> Chief Architect (Opus 4.8) · Phase 2 · 2026-06-05

## Executive Summary

Inkly currently stores JWT tokens in `localStorage` and injects them as `Authorization: Bearer` headers. This makes every token JavaScript-readable and therefore XSS-stealable. The full CDN runtime (React, Babel, React Router loaded from unpkg) is additional attack surface.

This plan migrates authentication to HttpOnly cookies, removes all client-side token exposure, adds functional "Remember Me" with server-enforced expiry differentiation, and adds proper session restoration via `/api/me`.

---

## Architecture Decision Record

### Decision: HttpOnly Cookie with SameSite=Lax

**Rationale:**
- `HttpOnly` — cookie not readable by JavaScript; XSS cannot steal token
- `Secure` — cookie sent only over HTTPS (enforced in production)
- `SameSite=Lax` — protects against CSRF on cross-site navigation; allows first-party requests; compatible with OAuth redirects later
- Browser sends cookie automatically on every `fetch` with `credentials: 'include'` — no manual header injection needed

**Not chosen:**
- `SameSite=Strict` — too aggressive; breaks OAuth redirect flows
- `SameSite=None` — requires Secure, less restrictive than needed
- `localStorage` — current approach, XSS-vulnerable

### Decision: Profile in localStorage, Token never in JS

User profile data (`email`, `name`, `workspace`) is not a secret — it is safe in `localStorage`. The JWT (the secret credential) must never touch JavaScript. After migration:
- React state holds the user profile (source of truth during a session)
- `localStorage` holds a copy for fast startup hydration only
- The HttpOnly cookie holds the JWT (never readable by JS)

### Decision: `/api/me` as session restoration source of truth

On every page load / app startup: call `GET /api/me` with `credentials: 'include'`. If the cookie is valid → set React user state. If 401 → user is unauthenticated. This ensures:
- Revoked tokens are detected immediately
- React state is always server-validated on load
- Route guards check React state, not localStorage

---

## Phase 3 — Backend Changes

### 3.1 `JwtUtil.java` — Add rememberMe overload

**Current:** Single `generate(String email)` always uses `expiryMs` (24h).

**Change:** Add overloaded method:
```java
public String generate(String email, boolean rememberMe) {
    long expiry = rememberMe ? 30L * 24 * 60 * 60 * 1000 : expiryMs;
    return Jwts.builder()
        .setSubject(email)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + expiry))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
}
```
Keep existing `generate(String email)` for backward compatibility (calls `generate(email, false)`).

### 3.2 `JwtAuthFilter.java` — Read from cookie

**Current:** Reads `Authorization: Bearer <token>` header only.

**Change:** Read from `inkly_token` cookie. Keep Bearer header as fallback (for API tools / Postman / curl during development):
```java
private String extractToken(HttpServletRequest req) {
    // 1. Cookie (production path)
    Cookie[] cookies = req.getCookies();
    if (cookies != null) {
        for (Cookie c : cookies) {
            if ("inkly_token".equals(c.getName())) return c.getValue();
        }
    }
    // 2. Bearer header (dev/tooling fallback)
    String header = req.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) return header.substring(7);
    return null;
}
```
Replace the existing header-only logic with this helper.

### 3.3 `AuthController.java` — Cookie creation + logout endpoint

**Login change:** Accept `rememberMe` from request, issue cookie in response:
```java
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest req,
                                           HttpServletResponse res) {
    // ... existing user validation ...
    boolean rememberMe = req.isRememberMe();
    String token = jwtUtil.generate(user.getEmail(), rememberMe);
    int maxAge = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
    Cookie cookie = buildCookie(token, maxAge);
    res.addCookie(cookie);
    return ResponseEntity.ok(new AuthResponse(
        user.getEmail(), user.getName(), user.getWorkspace(), maxAge * 1000L
    ));
}
```

**Register change:** Same cookie pattern:
```java
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req,
                                              HttpServletResponse res) {
    // ... existing user creation ...
    String token = jwtUtil.generate(user.getEmail(), false); // 24h for new registrations
    Cookie cookie = buildCookie(token, 24 * 3600);
    res.addCookie(cookie);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(new AuthResponse(
            user.getEmail(), user.getName(), user.getWorkspace(), 86400000L
        ));
}
```

**Cookie builder helper:**
```java
private Cookie buildCookie(String token, int maxAgeSec) {
    Cookie cookie = new Cookie("inkly_token", token);
    cookie.setHttpOnly(true);
    cookie.setSecure(false);  // set true in production (HTTPS)
    cookie.setPath("/");
    cookie.setMaxAge(maxAgeSec);
    // SameSite must be set via header since Jakarta Cookie API lacks it
    return cookie;
}
```

> **Note on SameSite:** Jakarta Servlet `Cookie` API does not support `SameSite`. Set it via response header:
> ```java
> res.addHeader("Set-Cookie",
>   "inkly_token=" + token + "; Path=/; HttpOnly; Max-Age=" + maxAgeSec +
>   "; SameSite=Lax" + (isProd ? "; Secure" : ""));
> ```
> Use this header approach instead of the `Cookie` object for `SameSite` support.

**New logout endpoint (under `/api/auth/**` — already public):**
```java
@PostMapping("/logout")
public ResponseEntity<Void> logout(HttpServletResponse res) {
    res.addHeader("Set-Cookie",
        "inkly_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
    return ResponseEntity.noContent().build();
}
```

### 3.4 `AuthRequest.java` — Add rememberMe

```java
private boolean rememberMe = false;  // default: 24h session
```

### 3.5 `AuthResponse.java` — Remove token field

**Before:**
```java
private String token;
private String email;
private String name;
private String workspace;
private long expiresIn;
```

**After:**
```java
private String email;
private String name;
private String workspace;
private long expiresIn;
```

Token is no longer returned in the response body — it lives only in the HttpOnly cookie.

### 3.6 `SecurityConfig.java` — No changes required

- `allowCredentials(true)` is already set
- `/api/auth/**` already public (covers the new `/api/auth/logout`)
- CORS origins already configured

---

## Phase 4 — Frontend API Client (`inkly-api.jsx`)

### Remove

- `TOKEN_KEY` constant
- `getToken()` function
- `setToken(t)` function
- `clearToken()` function
- `isTokenExpired()` function
- `Authorization: Bearer` header injection in `request()`

### Add / Change

**All fetch calls must add `credentials: 'include'`** so the browser sends the HttpOnly cookie:
```js
const res = await fetch(BASE + path, Object.assign({}, opts, {
  credentials: 'include',
  headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
}));
```

**Login — pass rememberMe, no token storage:**
```js
async function login(email, password, rememberMe = true) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  var data;
  try { data = await res.json(); } catch (e) { data = {}; }
  if (!res.ok) throw new Error(data.message || "Invalid email or password.");
  // Cookie set by server — no token to store
  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  return data;
}
```

**Signup — same pattern:**
```js
async function signup(name, email, password, workspace) {
  const res = await fetch(BASE + "/api/auth/register", {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, workspace }),
  });
  // ... error handling ...
  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  return data;
}
```

**Logout — call server to clear cookie:**
```js
async function logout() {
  try {
    await fetch(BASE + "/api/auth/logout", {
      method: "POST",
      credentials: 'include',
    });
  } catch (e) { /* ignore network errors */ }
  clearUser();
}
```

**Session restoration via /api/me:**
```js
async function getMe() {
  const res = await fetch(BASE + "/api/me", {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json();  // { email, name, workspace, role }
}
```

**Export changes:**
- Remove: `getToken`, `clearToken`, `isTokenExpired`
- Add: `getMe`, change `logout` to async
- Keep: `getUser`, `request`, `login`, `signup`, `logout`, `kanban`

---

## Phase 4 — Frontend Login (`inkly-login.jsx`)

Pass the `remember` checkbox value into `INKLY_API.login()`:
```js
// In submit():
INKLY_API.login(email, pw, remember)   // was: INKLY_API.login(email, pw)
```

---

## Phase 5+6 — Frontend App (`inkly-app.jsx`)

### A. Extend `InklyContext`

Add `user`, `setUser`, `authChecked` to both the `App` state and the context value:
```js
const [user, setUser] = useStateApp(null);
const [authChecked, setAuthChecked] = useStateApp(false);
const ctx = { t, setTweak, toasts, pushToast, toggleTheme, user, setUser, authChecked };
```

### B. Session restoration — startup effect in `App`

```js
useEffectApp(() => {
  INKLY_API.getMe()
    .then(profile => { if (profile) setUser(profile); })
    .catch(() => {})
    .finally(() => setAuthChecked(true));
}, []);
```

### C. Loading gate in `App`

Before rendering `HashRouter`:
```jsx
if (!authChecked) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--paper)" }}>
      <span className="spinner" style={{ width:24, height:24 }} />
    </div>
  );
}
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

### F. Auth callbacks — set/clear user state

```jsx
function handleSignIn(data) {
  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  navigate("/dashboard");
  ctx.pushToast("Welcome back, " + firstName + "!");
}

function handleSignedUp(data) {
  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  navigate("/dashboard");
  ctx.pushToast(...);
}

function handleLogout() {
  INKLY_API.logout();   // async — calls POST /api/auth/logout
  setUser(null);
  navigate("/login");
}
```

### G. `inkly:session-expired` handler — clear user state

```js
function onSessionExpired() {
  setUser(null);
  navigate("/login");
  ctx.pushToast("Session expired — please sign in again.");
}
```

---

## Cookie Specification

```
Set-Cookie: inkly_token=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=<seconds>
```

| Attribute | Value | Reason |
|---|---|---|
| `HttpOnly` | true | Prevents JavaScript access |
| `Secure` | false (dev) / true (prod) | HTTPS-only in production |
| `SameSite` | Lax | CSRF protection + OAuth compatibility |
| `Path` | `/` | Sent on all requests to the backend |
| `Max-Age` | 86400 (24h) or 2592000 (30d) | Based on rememberMe |
| Name | `inkly_token` | Consistent with existing constant |

---

## Success Criteria Checklist

| Criterion | Implementation |
|---|---|
| JWT only in HttpOnly Cookie | Set-Cookie in AuthController; JwtAuthFilter reads cookie |
| No localStorage token | Remove TOKEN_KEY, getToken, setToken, clearToken, isTokenExpired from inkly-api.jsx |
| No sessionStorage token | Never added |
| Remember Me = 30 days | `jwtUtil.generate(email, true)` → 30-day expiry; Max-Age=2592000 |
| Normal login = 24 hours | `jwtUtil.generate(email, false)` → expiryMs (86400000ms); Max-Age=86400 |
| Automatic session restoration | `INKLY_API.getMe()` called in App startup effect; user state set from /api/me response |
| Protected routes | ProtectedRoute checks React `user` state |
| Secure logout | `POST /api/auth/logout` clears cookie server-side; client clears user state |
| /api/me as source of truth | Session restoration calls /api/me; user object comes from server |
| React state stores only user data | `user` = `{email, name, workspace}` in context |
| Frontend never reads JWT | No atob(), no token parsing, no isTokenExpired() |
| Browser automatically sends cookie | `credentials: 'include'` on all fetches |
| Minimal code duplication | Cookie building centralised in AuthController helper method |

---

## File Change Summary

### Backend (6 files)
| File | Changes |
|---|---|
| `JwtUtil.java` | Add `generate(email, rememberMe)` overload |
| `JwtAuthFilter.java` | Read from cookie + Bearer header fallback |
| `AuthController.java` | Set-Cookie on login/register; add `/logout` endpoint |
| `AuthRequest.java` | Add `rememberMe` boolean field |
| `AuthResponse.java` | Remove `token` field |
| `SecurityConfig.java` | No changes needed |

### Frontend (3 files)
| File | Changes |
|---|---|
| `inkly-api.jsx` | Remove token localStorage; add `credentials:'include'`; async logout; add `getMe()` |
| `inkly-app.jsx` | Add `user`+`authChecked` state; session restoration; update route guards; auth callbacks |
| `inkly-login.jsx` | Pass `remember` to `INKLY_API.login()` |
