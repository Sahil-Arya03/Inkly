# AUTHENTICATION_TEST_REPORT.md
# Inkly — HttpOnly Cookie Authentication: Integration Test Scenarios

**Prepared by:** AGENT-K (Integration Testing Specialist)
**Date:** 2026-06-05
**Scope:** Cookie-based JWT authentication flow end-to-end, covering the Spring Boot 4.x backend and React 18 (CDN/Babel) frontend.

---

## Implementation Summary

| Layer | Key facts |
|---|---|
| Cookie name | `inkly_token` |
| Cookie flags | `HttpOnly; Path=/; SameSite=Lax` (no `Secure` flag — HTTP dev environment) |
| Token algorithm | HS256, signed with `jwt.secret` from `application.properties` |
| Short session Max-Age | 86400 s (24 h) — matches `jwt.expiry-ms=86400000` |
| Long session Max-Age | 2592000 s (30 days) — hardcoded in `JwtUtil.generate(email, true)` |
| Token extraction (backend) | `JwtAuthFilter.extractToken()` — checks `Cookie: inkly_token` first, then `Authorization: Bearer` header |
| Session restoration (frontend) | `INKLY_API.getMe()` called once on mount in `App`; blocks render until `authChecked=true` |
| Auth guard (frontend) | `ProtectedRoute` — renders `<Outlet />` if `user != null`, else `<Navigate to="/login" replace />` |
| Redirect guard (frontend) | `RedirectIfAuth` — redirects authenticated users away from `/login` and `/signup` to `/dashboard` |
| Session expiry event | `inkly:session-expired` CustomEvent — fired in `INKLY_API.request()` on any 401; caught in `AppRoutes` `useEffect` |
| Profile cache | `localStorage["inkly_user"]` — stores `{ email, name, workspace }`; NOT the JWT token |

---

## Scenario 1: Login without Remember Me

**Backend endpoint:** `POST /api/auth/login`
**Frontend function:** `INKLY_API.login(email, password, false)` → `handleSignIn(data)` in `AppRoutes`
**Cookie state after:** `inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`

### Setup
- Backend running on `http://localhost:8081`.
- A registered user exists in the `USERS` table (e.g., `test@inkly.io` / `Password1!`).
- Browser has no existing `inkly_token` cookie and no `inkly_user` key in `localStorage`.
- The Login page is open (`/#/login`).

### Steps to Test
1. On the Login form, locate the "Remember me" checkbox and **uncheck** it.
2. Enter valid credentials and click **Sign in**.
3. Open Browser DevTools > Application > Cookies > `http://localhost:8081`.
4. Observe the `inkly_token` cookie attributes.
5. Observe the URL — should change to `/#/dashboard`.
6. Open Application > Local Storage > `http://localhost:3000`; inspect `inkly_user`.
7. In React DevTools (or console: `useInkly().user`), confirm `user` state is populated.

### Expected Result
- HTTP response from `POST /api/auth/login` is `200 OK`.
- Response body: `{ "email": "...", "name": "...", "workspace": "...", "expiresIn": 86400000 }`.
- `Set-Cookie` response header: `inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`.
- Browser stores cookie with **Max-Age 86400** (24 h); it is a session-length-ish cookie that expires in 24 h.
- `localStorage["inkly_user"]` is set to `{"email":"...","name":"...","workspace":"..."}`.
- `App.user` state is set via `ctx.setUser(...)` inside `handleSignIn`.
- Browser URL becomes `/#/dashboard`.
- A "Welcome back, [First Name]!" toast appears.

### What Could Go Wrong and How to Detect It
- **Wrong Max-Age (30 days instead of 24 h):** The `AuthRequest.isRememberMe()` call in `AuthController.login()` would return `true` by default if the JSON field is absent or if the frontend defaults `rememberMe` to `true`. Check: in `inkly-api.jsx` line 34, `var rm = (rememberMe === undefined) ? true : rememberMe;` — if `login()` is called without the third argument it defaults to `true`. Ensure the Login component explicitly passes `false` when the checkbox is unchecked. Verify by inspecting the cookie's `Expires` attribute in DevTools.
- **CORS preflight rejection:** If the frontend origin is not in `cors.allowed-origins`, the `POST` will fail with a CORS error before the cookie is sent. Detect in browser console: `Access to fetch at 'http://localhost:8081/api/auth/login' from origin 'http://localhost:3000' has been blocked`.
- **Cookie not sent on subsequent requests:** If `credentials: 'include'` is missing from the `fetch` call. The `login()` function in `inkly-api.jsx` does include it (line 36), so this is unlikely unless the code was changed.
- **`localStorage` not updated:** If `setUser()` is not called (e.g., `handleSignIn` not wired). Detect by checking `localStorage["inkly_user"]` is null after login.

---

## Scenario 2: Login with Remember Me

**Backend endpoint:** `POST /api/auth/login`
**Frontend function:** `INKLY_API.login(email, password, true)` (or omitting third arg — defaults to `true`)
**Cookie state after:** `inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`

### Setup
- Same as Scenario 1.
- The "Remember me" checkbox is **checked** (which is the default in the Login component).

### Steps to Test
1. Leave "Remember me" checked (or re-check it).
2. Enter valid credentials and click **Sign in**.
3. Open DevTools > Application > Cookies > `http://localhost:8081`.
4. Inspect `inkly_token`: check `Max-Age` / `Expires` value.
5. Confirm the JWT's `exp` claim also reflects a 30-day expiry: in DevTools console, run `atob(document.cookie.match(/inkly_token=([^;]+)/)?.[1]?.split('.')[1] ?? '')` — this is blocked by HttpOnly. Instead decode the JWT returned in the response body if available, or check server logs.

### Expected Result
- `AuthController.login()` receives `rememberMe: true` in the request body.
- `JwtUtil.generate(email, true)` produces a token with `exp = now + 30 * 24 * 60 * 60 * 1000`.
- `maxAge` variable in `AuthController` is `30 * 24 * 3600 = 2592000`.
- `Set-Cookie` response header: `inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`.
- Browser stores the cookie with an absolute expiry ~30 days in the future (persistent cookie, survives browser restart).
- Navigation to `/#/dashboard` and toast occur identically to Scenario 1.

### What Could Go Wrong and How to Detect It
- **Max-Age is 86400 instead of 2592000:** Means `req.isRememberMe()` returned `false`. Check that the Login component passes `rememberMe: true` in the request body JSON, and that `AuthRequest.isRememberMe()` (the getter) is correctly mapped from the JSON field `rememberMe`. A missing or misspelled getter causes the default boolean `false` to be used.
- **JWT exp and Max-Age mismatch:** `JwtUtil.generate(email, true)` uses `30L * 24 * 60 * 60 * 1000` for expiry, and `AuthController` uses `30 * 24 * 3600` for Max-Age. These are equivalent (both 30 days). If someone changes one but not the other, the cookie could outlive or underrun the token. Detect by comparing the cookie `Expires` with the JWT `exp` claim (decode JWT on server logs).
- **Cookie treated as session cookie by browser:** If `Max-Age` header is absent, the browser treats it as a session cookie. Detect by verifying the header is present in DevTools > Network > Response Headers for the `/api/auth/login` request.

---

## Scenario 3: Page Refresh While Authenticated

**Backend endpoint:** `GET /api/me`
**Frontend function:** `INKLY_API.getMe()` called in `App`'s `useEffect([], [])` on mount
**Cookie state:** Existing valid `inkly_token` cookie (from a previous login)

### Setup
- User is logged in (either session or persistent cookie is present).
- Current page: `/#/dashboard`.

### Steps to Test
1. Confirm dashboard is displayed and `user` state is non-null.
2. Press **F5** (or Ctrl+R) to hard-refresh the browser.
3. Observe the brief loading state.
4. Observe the final rendered page.

### Expected Result
- On mount, `App`'s `useEffect` immediately calls `INKLY_API.getMe()`.
- While `authChecked` is `false`, the app renders a centered spinner (24×24 `<span className="spinner" />`).
- The browser automatically sends the `inkly_token` cookie with `GET /api/me` (because `credentials: 'include'` is set in `getMe()`).
- `JwtAuthFilter` reads the cookie, validates the JWT via `JwtUtil.isValid()`, extracts the email, loads `UserDetails`, and populates `SecurityContextHolder`.
- `MeController.me()` returns `{ email, name, workspace, role }` with HTTP 200.
- `INKLY_API.getMe()` returns the profile object; `setUser(profile)` is called; `setAuthChecked(true)` is called in `finally`.
- `authChecked` becomes `true`, `user` is non-null; `ProtectedRoute` renders `<Outlet />`.
- User is shown the **dashboard** (the HashRouter restores `/#/dashboard` from the URL bar).

### What Could Go Wrong and How to Detect It
- **Redirect to `/login` on every refresh (session not restored):** Most likely cause: `getMe()` is returning `null` or the fetch is failing. Check: (a) network tab — is `GET /api/me` being called? (b) Is the cookie being sent? (c) Is CORS blocking the response? The CORS config requires the frontend origin to be in `cors.allowed-origins`; the dev server port must match (live-server sometimes picks a random port — confirm in `application.properties`).
- **Spinner shown indefinitely:** The `finally` block in `App`'s `useEffect` always calls `setAuthChecked(true)`, so a stuck spinner means the `Promise` never settled — possible network timeout or unhandled rejection. Check console for errors.
- **`user` state is null but cookie is valid:** Could mean `getMe()` returned `null` due to a JSON parse error or the response body is malformed. Check the Network tab response body.
- **Wrong page shown after refresh:** HashRouter reads the URL fragment (`/#/dashboard`). If the hash is absent (user navigated to `http://localhost:3000` without `#/dashboard`), the catch-all route sends to `/#/login`, then `RedirectIfAuth` redirects back to `/#/dashboard`. This double redirect is correct but adds a flash.

---

## Scenario 4: Browser Restart / New Tab (Persistent Cookie)

**Backend endpoint:** `GET /api/me`
**Frontend function:** `INKLY_API.getMe()` on App mount
**Cookie state:** `inkly_token` with `Max-Age=2592000` (30-day persistent cookie)

### Setup
- User logged in with "Remember me" checked; `inkly_token` cookie has Max-Age=2592000 set.
- All browser windows are closed completely (full browser restart, not just tab close).

### Steps to Test
1. Reopen the browser.
2. Navigate to `http://localhost:3000/Inkly.html` (or whatever the frontend URL is).
3. Open DevTools > Application > Cookies immediately — verify `inkly_token` is still present.
4. Observe the app startup: spinner then page.

### Expected Result
- Browser persists the `inkly_token` cookie because `Max-Age > 0` (persistent, not session cookie).
- On app load, `getMe()` sends the cookie automatically.
- Backend validates the JWT (still within 30-day expiry window) and returns user profile.
- `setUser(profile)` and `setAuthChecked(true)` are called; user lands on `/#/dashboard` (or whichever route the URL bar resolves to).
- `localStorage["inkly_user"]` is also still populated with the cached profile (it was written on login and persists across browser restarts).

### What Could Go Wrong and How to Detect It
- **Cookie is gone after restart:** Means the cookie was stored as a session cookie despite `Max-Age=2592000`. Check if the browser's "clear cookies on exit" setting is enabled. Also verify that the `Set-Cookie` header actually contained `Max-Age=2592000` by checking the login response in DevTools (from the previous login session's Network tab history, or repeat the login).
- **`Max-Age` vs `Expires` browser behavior:** Some older browsers honor only `Expires` and ignore `Max-Age`. The current `setCookieHeader` in `AuthController` only sets `Max-Age`. For maximum compatibility, also setting an `Expires` attribute would help. Detect by checking browser compatibility or using a non-Chrome browser.
- **Session cookie behavior with HashRouter:** If a user navigates to `http://localhost:3000/Inkly.html` directly (no fragment), they land at the catch-all `*` route which redirects to `/login`. `RedirectIfAuth` then redirects back to `/dashboard` — a two-step redirect that is correct but adds an extra render cycle.
- **`localStorage` stale profile:** If the user's name or workspace changed server-side between sessions, `getMe()` returns fresh data, but the stale `inkly_user` in `localStorage` could briefly show the old name before `setUser` updates React state. This is cosmetic only.

---

## Scenario 5: Logout

**Backend endpoint:** `POST /api/auth/logout`
**Frontend function:** `INKLY_API.logout()` → `handleLogout()` in `MainLayout` (or `AppRoutes`)
**Cookie state after:** `inkly_token=; Path=/; HttpOnly; Max-Age=0` (cookie immediately expired)

### Setup
- User is logged in; dashboard is shown.
- `inkly_token` cookie and `localStorage["inkly_user"]` are set.

### Steps to Test
1. Click the user icon in the Sidebar (bottom of icon rail) to trigger logout.
2. Open DevTools > Network — verify `POST /api/auth/logout` is fired.
3. Inspect the response headers for the `Set-Cookie` header.
4. Observe the browser URL change.
5. Check DevTools > Application > Cookies — `inkly_token` should be absent.
6. Check DevTools > Application > Local Storage — `inkly_user` should be absent.
7. Try navigating back to `/#/dashboard` manually.

### Expected Result
- `INKLY_API.logout()` fires `POST /api/auth/logout` with `credentials: 'include'`.
- `AuthController.logout()` responds with HTTP 204 No Content and the header: `Set-Cookie: inkly_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`.
- Browser deletes the `inkly_token` cookie (Max-Age=0 instructs immediate deletion).
- Back in the frontend, `INKLY_API.logout()` calls `clearUser()` which removes `localStorage["inkly_user"]`.
- `handleLogout()` calls `ctx.setUser(null)` and `navigate("/login")`.
- User is redirected to `/#/login`.
- Navigating to `/#/dashboard` redirects back to `/#/login` because `user` is null and `ProtectedRoute` fires.
- No JWT remains in `localStorage` (the token was never stored there — only the profile object was).

### What Could Go Wrong and How to Detect It
- **Cookie not deleted (Max-Age=0 not respected):** Check the raw `Set-Cookie` header in the Network tab. If it reads `Max-Age=0`, the browser must honor it. If the `Path` attribute on the clearing cookie does not match the original cookie's `Path`, the browser will not delete it. Both the login and logout cookies use `Path=/` so this should be consistent.
- **Network error on logout silently swallowed:** `INKLY_API.logout()` wraps the fetch in `try/catch` and ignores errors. This is intentional — `clearUser()` and the state/navigation updates always run. A backend being down at logout time will not trap the user. Verify by taking the backend offline and confirming the client-side cleanup still happens.
- **Session-expired event fires during logout:** If the `POST /api/auth/logout` itself returns 401 (e.g., token already expired), the `request()` helper would fire `inkly:session-expired`. However, `logout()` uses a direct `fetch()` call (not `request()`), so the event is NOT fired. This is correct — no double navigation. Verify by checking the logout code path uses plain `fetch`, not `INKLY_API.request()`.
- **`ctx.setUser(null)` called twice:** `handleLogout` is defined in both `MainLayout` and `AppRoutes`. The Sidebar's `onLogout` prop comes from `MainLayout.handleLogout`. Ensure they are not both wired to the same event, or that double-calling `setUser(null)` has no side effects (it does not, given React's idempotent state updates).

---

## Scenario 6: Expired JWT

**Backend endpoint:** `GET /api/me` (on startup), then any authenticated endpoint
**Frontend function:** `INKLY_API.getMe()` on mount; `INKLY_API.request()` for subsequent calls
**Cookie state:** `inkly_token` cookie present but JWT `exp` claim is in the past

### Setup
- A valid `inkly_token` cookie exists in the browser but the JWT inside it has expired (either Max-Age has passed or the `exp` claim is past).
- For testing: manually set `jwt.expiry-ms=5000` (5 seconds) in `application.properties`, restart the backend, log in, wait 5 seconds, then test.
- Alternatively, use browser DevTools to edit the cookie value to a JWT whose `exp` is in the past.

### Steps to Test
1. With an expired-token cookie in place, navigate to (or refresh) `http://localhost:3000/Inkly.html`.
2. Observe spinner during auth check.
3. Observe the final page shown.
4. Check `localStorage["inkly_user"]` — should be cleared.

### Expected Result
- On app mount, `INKLY_API.getMe()` sends `GET /api/me` with the expired cookie.
- `JwtAuthFilter.extractToken()` finds the cookie and calls `jwtUtil.isValid(token)`.
- `JwtUtil.isValid()` calls `parseClaims()` which calls `Jwts.parserBuilder()...parseClaimsJws()`; this throws `ExpiredJwtException` (a subclass of `JwtException`), caught and `false` returned.
- The token is invalid; `SecurityContextHolder` is not populated.
- Spring Security's `authenticationEntryPoint` returns HTTP 401 with body `{"error":"UNAUTHORIZED","message":"Authentication required"}`.
- `INKLY_API.getMe()` sees `!res.ok` (401) and returns `null`.
- `profile` is `null` in `App`'s `useEffect`; `setUser` is not called; `user` stays `null`.
- `setAuthChecked(true)` is called in `finally`.
- `authChecked` is `true`, `user` is `null`; `ProtectedRoute` redirects to `/login`; app shows login page.
- `localStorage["inkly_user"]` is **not** cleared by `getMe()` — note that `getMe()` uses a direct `fetch` call, not `INKLY_API.request()`, so `clearUser()` is NOT called here. The stale profile cache remains in `localStorage`. This is not a security issue (the HttpOnly cookie is the actual auth token), but the cache lingers until next login or logout.

### What Could Go Wrong and How to Detect It
- **Stale `localStorage["inkly_user"]` causing confusion:** `getUser()` returns the stale cached profile, which is used by some parts of the UI (e.g., showing the user's name before auth check). This could briefly show "Welcome, Alice" before redirecting to login. Since `user` React state starts as `null` and is only set if `getMe()` succeeds, the protected routes will still redirect correctly. Detect: add a `console.log(INKLY_API.getUser())` in the browser after an expired-token scenario and observe stale data.
- **`getMe()` not calling `clearUser()` on 401:** As noted above, `getMe()` uses plain `fetch`, not `request()`. This means the `inkly:session-expired` event is not fired either. If you need the cache cleared on startup 401, `getMe()` should call `clearUser()` when `!res.ok`. Currently it simply returns `null`. This is a potential inconsistency.
- **Backend still accepts the expired token:** If the server clock is behind the client clock, a token that appears expired on the client may still be valid on the server. Check server time synchronization.

---

## Scenario 7: Invalid JWT (Tampered Cookie)

**Backend endpoint:** `GET /api/me` (on startup)
**Frontend function:** `INKLY_API.getMe()` on mount
**Cookie state:** `inkly_token` cookie present but value is a corrupted/tampered JWT string

### Setup
- A valid `inkly_token` cookie exists.
- Open DevTools > Application > Cookies, double-click the `inkly_token` value, and modify one character in the signature segment (last `.` delimited section). Save.
- Note: browsers block editing of HttpOnly cookies from the Application panel. To bypass for testing, the `Secure` flag is absent and the cookie is not HttpOnly from the DevTools perspective on some browsers. Alternatively, use a proxy tool (e.g., Burp Suite, mitmproxy) to intercept and modify the cookie in transit.

### Steps to Test
1. With the tampered cookie in place, refresh the app.
2. Monitor DevTools > Network for `GET /api/me`.
3. Check the HTTP response status.
4. Observe the app's behavior.

### Expected Result
- `JwtAuthFilter.extractToken()` returns the tampered token string.
- `jwtUtil.isValid(token)` calls `parseClaims()` which throws `SignatureException` (a subclass of `JwtException`).
- `isValid()` catches the exception and returns `false`.
- The filter does NOT populate `SecurityContextHolder`.
- `chain.doFilter()` continues; Spring Security's `authenticationEntryPoint` returns 401.
- `INKLY_API.getMe()` returns `null`; `user` state stays `null`; `authChecked` becomes `true`.
- App redirects to `/login`.

### What Could Go Wrong and How to Detect It
- **HttpOnly cookie cannot be tampered via DevTools:** The `HttpOnly` flag prevents JavaScript access (no `document.cookie` access), but in most browsers the Application panel still shows HttpOnly cookies and allows editing. If not, use a proxy tool. Detect whether the cookie is truly HttpOnly by checking that `document.cookie` in the browser console does not show `inkly_token`.
- **`parseClaims` throws an unexpected runtime exception not caught by the `JwtException` catch:** `JwtUtil.isValid()` catches `JwtException`. The JJWT library ensures all parsing failures subclass `JwtException`. No other exception type should escape under normal operation, but a null/empty token string could cause a `NullPointerException` before reaching JJWT. Detect: check backend logs for unhandled exceptions in the filter chain.
- **Backend logs the tampered token at WARN level:** Check the Spring Boot console for log output from JJWT. Some configurations log signature validation failures. This is expected and helps with security auditing.

---

## Scenario 8: Unauthenticated Access to Protected Route

**Backend endpoint:** `GET /api/me` (called on startup regardless of route)
**Frontend function:** `INKLY_API.getMe()` on App mount; `ProtectedRoute` component
**Cookie state:** No `inkly_token` cookie; no `inkly_user` in `localStorage`

### Setup
- Clear all cookies for `localhost:8081` and all `localStorage` for `localhost:3000`.
- Alternatively, open a fresh private/incognito window.

### Steps to Test
1. Directly navigate to `http://localhost:3000/Inkly.html#/dashboard` in the address bar.
2. Observe the spinner during auth check.
3. Observe the final URL and page shown.

### Expected Result
- `App` mounts; `user` starts as `null`; `authChecked` starts as `false`.
- Spinner is shown.
- `INKLY_API.getMe()` fires `GET /api/me` with no cookie.
- `JwtAuthFilter.extractToken()` returns `null` (no cookies, no Authorization header).
- The filter skips token validation; `SecurityContextHolder` is not populated.
- Spring Security blocks the request and returns 401.
- `getMe()` sees `!res.ok`; returns `null`.
- `setUser` not called; `user` stays `null`; `setAuthChecked(true)` called.
- `authChecked` is `true`; `HashRouter` resolves `#/dashboard`; `ProtectedRoute` sees `user=null`; renders `<Navigate to="/login" replace />`.
- User is shown the login page at `/#/login`.

### What Could Go Wrong and How to Detect It
- **ProtectedRoute renders briefly before redirect:** Because `authChecked` starts `false` and the spinner is shown, by the time routes render, auth is already resolved. There should be no flash of protected content. If a flash occurs, it means `authChecked` is being set to `true` before `getMe()` resolves — check the `useEffect` promise chain for an accidental early `setAuthChecked` call.
- **Redirect loop:** If `RedirectIfAuth` and `ProtectedRoute` both trigger, a loop can occur. This is prevented by the route structure: `RedirectIfAuth` only wraps `/login` and `/signup`; `ProtectedRoute` wraps everything else. They are not nested.
- **HashRouter catch-all fires before ProtectedRoute:** The catch-all route `path="*"` redirects to `/login`. If `/#/dashboard` is unrecognized for any reason, this catch-all fires instead of `ProtectedRoute`. Confirm `/#/dashboard` is mapped under the `ProtectedRoute` element (it is — confirmed in `AppRoutes`).

---

## Scenario 9: Authenticated User Accessing Login Page

**Backend endpoint:** `GET /api/me` (on startup)
**Frontend function:** `INKLY_API.getMe()` on mount; `RedirectIfAuth` component
**Cookie state:** Valid `inkly_token` cookie present (user is logged in)

### Setup
- User is logged in; valid `inkly_token` cookie exists.
- Navigate manually to `http://localhost:3000/Inkly.html#/login` (e.g., via address bar or back button).

### Steps to Test
1. While logged in, manually type `http://localhost:3000/Inkly.html#/login` in the address bar and press Enter.
2. Observe whether the login form is shown.
3. Observe the final URL.

### Expected Result
- `App` mounts; `getMe()` fires; cookie is sent; `GET /api/me` returns 200 with profile.
- `setUser(profile)` called; `setAuthChecked(true)` called.
- `authChecked` is `true`; `user` is non-null.
- `HashRouter` resolves `#/login`; the `/login` route is inside `<Route element={<RedirectIfAuth />}>`.
- `RedirectIfAuth` sees `user != null`; renders `<Navigate to="/dashboard" replace />`.
- User is automatically redirected to `/#/dashboard` and never sees the login form.

### What Could Go Wrong and How to Detect It
- **Login form flashes before redirect:** Means `RedirectIfAuth` rendered before `authChecked` became `true`. Since the app renders a spinner until `authChecked=true`, this should not happen — the `HashRouter` and `Routes` are not rendered at all while `authChecked` is `false`. If a flash is seen, it indicates the spinner conditional (`if (!authChecked) return <spinner>`) was bypassed.
- **Redirect does not happen:** `user` is null despite a valid cookie. Most likely `getMe()` returned `null` due to a network error or CORS issue. Detect in Network tab.
- **`replace` flag missing on Navigate:** Without `replace`, the user's history stack gains an entry for `/login`, meaning the back button would bounce between login and dashboard. The current code uses `replace` — verify this is preserved.

---

## Scenario 10: Cookie Deletion While App Is Open

**Backend endpoint:** Any authenticated endpoint (e.g., `GET /api/boards`)
**Frontend function:** `INKLY_API.request()` — the authenticated fetch wrapper
**Cookie state:** `inkly_token` deleted while the app is active and the React `user` state is still populated

### Setup
- User is logged in; `inkly_token` cookie is present; user is on the Kanban page.

### Steps to Test
1. Open DevTools > Application > Cookies > `http://localhost:8081`.
2. Right-click the `inkly_token` cookie and select **Delete**.
3. Trigger an API call that goes through `INKLY_API.request()` — e.g., drag a card to a new column (triggers `PATCH /api/cards/:id/move`) or navigate to the Kanban page (triggers `GET /api/boards`).
4. Observe the network response.
5. Observe the app's reaction.

### Expected Result
- The next API call via `INKLY_API.request()` fires `fetch(url, { credentials: 'include' })`.
- Without the cookie, no `inkly_token` is sent; `JwtAuthFilter` finds no token; `SecurityContextHolder` is not populated.
- Spring Security returns 401 with body `{"error":"UNAUTHORIZED","message":"Authentication required"}`.
- Inside `request()`, `res.status === 401` is `true`:
  - `clearUser()` is called — removes `localStorage["inkly_user"]`.
  - `window.dispatchEvent(new CustomEvent("inkly:session-expired"))` is fired.
- In `AppRoutes`'s `useEffect`, the `onSessionExpired` listener fires:
  - `ctx.setUser(null)` — user state set to null.
  - `navigate("/login")` — HashRouter navigates to login page.
  - `ctx.pushToast("Session expired — please sign in again.")` — toast shown.
- User is redirected to `/#/login` and sees the session-expired toast.

### What Could Go Wrong and How to Detect It
- **`inkly:session-expired` listener not active:** The listener is registered in a `useEffect` inside `AppRoutes`, which only mounts inside `HashRouter`. If the user is on the login or signup page when the cookie is deleted, `AppRoutes` is still mounted and the listener is active. However, if the component tree was unmounted and remounted without re-registering the listener, the event fires with no handler. Detect: add `console.log` inside the listener or check if the toast appears.
- **Double redirect or loop:** `clearUser()` fires, `setUser(null)` fires, `ProtectedRoute` would also redirect — but since `navigate("/login")` is called first, the route is already login before `ProtectedRoute` evaluates. There should be no loop. If a loop is observed, check for duplicate `session-expired` event registrations.
- **HttpOnly cookie cannot be deleted from DevTools:** In some browser configurations, HttpOnly cookies are shown but cannot be modified or deleted from the Application panel (read-only). If this is the case, use a proxy tool or set `httponly=false` temporarily in `setCookieHeader` for testing purposes only. Never disable HttpOnly in production.
- **`INKLY_API.getMe()` does not fire the event:** `getMe()` uses a direct `fetch()` call (not `request()`), so deleting the cookie and refreshing the page takes the Scenario 6 path (auth check returns null, `user` stays null, redirect to login without a toast). Only subsequent API calls routed through `request()` will trigger the `inkly:session-expired` event and show the toast. This is an expected behavioral difference between startup auth check and mid-session expiry.

---

## Quick Reference Matrix

| Scenario | Endpoint | Frontend Function | Cookie State Post-Action |
|---|---|---|---|
| 1: Login no-remember | `POST /api/auth/login` | `INKLY_API.login(e,p,false)` | Set, Max-Age=86400 |
| 2: Login remember-me | `POST /api/auth/login` | `INKLY_API.login(e,p,true)` | Set, Max-Age=2592000 |
| 3: Page refresh | `GET /api/me` | `INKLY_API.getMe()` | Unchanged (sent, valid) |
| 4: Browser restart | `GET /api/me` | `INKLY_API.getMe()` | Persisted (Max-Age>0) |
| 5: Logout | `POST /api/auth/logout` | `INKLY_API.logout()` | Deleted, Max-Age=0 |
| 6: Expired JWT | `GET /api/me` | `INKLY_API.getMe()` | Present but invalid (401) |
| 7: Tampered JWT | `GET /api/me` | `INKLY_API.getMe()` | Present but rejected (401) |
| 8: No cookie, protected route | `GET /api/me` | `INKLY_API.getMe()` | Absent (no change) |
| 9: Auth user hits /login | `GET /api/me` | `INKLY_API.getMe()` | Present and valid |
| 10: Cookie deleted mid-session | Any authenticated endpoint | `INKLY_API.request()` | Absent → 401 → event |
