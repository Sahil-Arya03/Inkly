# API Client Audit — AGENT-C Report
> Delivered by AGENT-C (Haiku) · Phase 1 · 2026-06-05

## Files Audited
- `src/main/webapp/inkly-api.jsx`
- `src/main/webapp/inkly-kanban.jsx`

---

## 1. Token Storage Mechanism

| Concern | Finding |
|---|---|
| Storage location | `localStorage` under key `"inkly_token"` |
| Profile storage | `localStorage` under key `"inkly_user"` |
| HttpOnly cookie | **NOT used** |
| `credentials: 'include'` | **NOT used** anywhere |
| `withCredentials` | **NOT used** |

```js
// inkly-api.jsx — lines 8–11
function getToken()   { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }
```

---

## 2. Token Injection Pattern

The `request()` helper (inkly-api.jsx lines 32–50) manually reads the token from localStorage and injects it as an `Authorization: Bearer` header on every authenticated call:

```js
async function request(path, options) {
  const token = getToken();                     // reads localStorage
  const res = await fetch(BASE + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {}),
    },
  });
  ...
}
```

**No `credentials: 'include'`** — cookies are never sent with requests.

---

## 3. Full Endpoint Inventory

| Endpoint | Method | Auth Required | Token Mechanism |
|---|---|---|---|
| `/api/auth/login` | POST | No | Direct `fetch()`, no Bearer header |
| `/api/auth/register` | POST | No | Direct `fetch()`, no Bearer header |
| `/api/boards` | GET | **Yes** | `request()` helper injects Bearer |
| `/api/cards` | POST | **Yes** | `request()` helper injects Bearer |
| `/api/cards/{id}/move` | PATCH | **Yes** | `request()` helper injects Bearer |

> **Missing:** `GET /api/me` — no session restoration call anywhere in the client.

---

## 4. 401 Handling

When any authenticated request receives a 401:
```js
if (res.status === 401) {
  clearToken();   // removes from localStorage
  clearUser();    // removes from localStorage
  window.dispatchEvent(new CustomEvent("inkly:session-expired"));
}
```
- Token and profile cleared from localStorage.
- `inkly:session-expired` event fired — `inkly-app.jsx` listens and redirects to `/login`.
- No proactive expiry check before requests.

---

## 5. Client-Side JWT Inspection (Security Risk)

`isTokenExpired()` (inkly-api.jsx lines 19–29) decodes the JWT payload client-side via `atob()` to check the `exp` field. This is:
- **Functional** for early expiry detection, but
- **Evidence that the token is JavaScript-readable** — confirms localStorage exposure vector.

After the cookie migration, this function must be removed entirely (server validates expiry via the HttpOnly cookie).

---

## 6. Migration Required

To migrate from `Authorization: Bearer` (localStorage) → HttpOnly cookie:

### Frontend Changes
| What | Current | Target |
|---|---|---|
| Token storage | `localStorage.setItem("inkly_token", t)` | **Remove entirely** |
| Token reading | `localStorage.getItem("inkly_token")` | **Remove entirely** |
| Token injection | `Authorization: Bearer <token>` header | **Remove entirely** |
| Request credential mode | _(unset, defaults to `same-origin`)_ | `credentials: 'include'` on all fetch calls |
| Client-side JWT decode | `isTokenExpired()` via `atob()` | **Remove entirely** |
| Login response handling | `setToken(data.token)` | Remove; cookie set by server automatically |
| Logout | `clearToken()` / `clearUser()` | Call `POST /api/auth/logout` to clear HttpOnly cookie |
| Session restoration | No `/api/me` call | Add `GET /api/me` with `credentials: 'include'` on startup |

### Backend Changes Required
| What | Target |
|---|---|
| Login response | Set `Set-Cookie: inkly_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/` |
| Register response | Same cookie |
| Logout endpoint | `POST /api/auth/logout` → clears cookie via `Max-Age=0` |
| JwtAuthFilter | Read token from `Cookie` header, not `Authorization` |
| CORS | `allowCredentials(true)` already set ✓ |

---

## 7. Issues Summary

| Severity | Issue |
|---|---|
| **CRITICAL** | JWT in `localStorage` — readable by any JavaScript, vulnerable to XSS |
| **HIGH** | No server-side logout — clearing localStorage doesn't invalidate cookie (after migration) |
| **HIGH** | No session restoration via `/api/me` — stale localStorage state trusted blindly |
| **MEDIUM** | `isTokenExpired()` client-side decode exposes JWT structure to JS |
| **LOW** | No `credentials: 'include'` — browser won't send cookies even if set |
