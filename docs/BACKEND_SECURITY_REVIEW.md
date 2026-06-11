# Backend Security Review — AGENT-F
> Delivered by AGENT-F (Haiku) · Phase 3-F · 2026-06-05

## Files Reviewed
- `JwtUtil.java`, `JwtAuthFilter.java`, `AuthController.java`
- `AuthRequest.java`, `AuthResponse.java`, `SecurityConfig.java`

---

## Overall Grade: B+ — Production-ready with 3 required fixes before go-live

---

## Check 1 — JWT Expiry Logic

**PASS**

`generate(email, false)` → uses `expiryMs` (86400000 = 24h). ✓
`generate(email, true)` → uses `30L * 24 * 60 * 60 * 1000` = 2592000000 ms = 30 days. ✓
Math correct: `30L` prevents int overflow (2592000000 > Integer.MAX_VALUE). ✓
`generate(email)` defaults to `generate(email, false)` → always 24h. ✓

---

## Check 2 — Cookie Configuration

**PASS with WARNING**

The `Set-Cookie` header produced by `setCookieHeader()`:
```
inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=<seconds>; SameSite=Lax
```

| Attribute | Status | Note |
|---|---|---|
| `HttpOnly` | ✓ PASS | JWT inaccessible to JavaScript |
| `SameSite=Lax` | ✓ PASS | CSRF protection, OAuth-compatible |
| `Path=/` | ✓ PASS | Cookie sent on all backend requests |
| `Max-Age` | ✓ PASS | 86400 (24h) or 2592000 (30d) |
| **`Secure`** | **⚠ WARNING** | **Missing — cookie sent over HTTP in dev. Must add `;Secure` for production HTTPS.** |
| Manual `addHeader` | ✓ PASS | Correct approach — Jakarta `Cookie` API lacks `SameSite` support |

---

## Check 3 — Authentication Flow (JwtAuthFilter)

**PASS**

- `req.getCookies()` null-checked before loop → no NullPointerException on cookieless requests. ✓
- Cookie lookup iterates all cookies looking for name `"inkly_token"` exactly. ✓
- Bearer header fallback: `header != null && header.startsWith("Bearer ")` before substring. ✓
- If `extractToken()` returns null: filter passes request through unauthenticated → rejected by `authorizeHttpRequests` downstream. ✓
- SecurityContext set only when `email != null && authentication == null` → prevents overwrite. ✓

---

## Check 4 — Logout

**PASS**

`POST /api/auth/logout` sets:
```
Set-Cookie: inkly_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax
```
`Max-Age=0` causes browser to delete the cookie immediately. ✓
Returns `204 No Content`. ✓
Endpoint is under `/api/auth/**` which SecurityConfig marks `.permitAll()`. ✓
Client can call logout even with an expired or invalid token. ✓

---

## Check 5 — CORS

**PASS**

`SecurityConfig.corsConfigurationSource()`:
```java
config.setAllowCredentials(true);
```
This is required for the browser to send cookies on cross-origin requests (`credentials: 'include'` on the frontend). ✓
Allowed origins are explicitly listed (not `*`) which is required when `allowCredentials=true`. ✓

---

## Security Gaps

### CRITICAL (must fix before production)

| Gap | Detail | Fix |
|---|---|---|
| Hardcoded JWT secret | `jwt.secret=<redacted>` committed to source | Move to environment variable; use 256-bit random value |
| Hardcoded DB password | `neondb_owner` / `<redacted>` in `application.properties` | Move to environment variable |
| Missing `Secure` cookie flag | Cookie sent over HTTP | Add `; Secure` suffix in `setCookieHeader()` when not in dev profile |

### HIGH

| Gap | Detail | Fix |
|---|---|---|
| No rate limiting | `/api/auth/login` allows unlimited attempts → brute force risk | Add Spring Security's `@RateLimiter` or Bucket4j |
| No token revocation | Issued tokens valid until expiry — logout doesn't invalidate active tokens | Add a server-side denylist (Redis `SET inkly:revoked:<jti>`) |

### MEDIUM

| Gap | Detail | Fix |
|---|---|---|
| No token refresh | Users forced to re-login after 24h (or 30d) — no silent refresh | Add refresh token mechanism |
| Weak password minimum | `AuthRequest` accepts 6-char passwords; `RegisterRequest` requires 8 — inconsistent | Standardise on 8 chars minimum for both |

---

## Protected (Working Correctly)

| Concern | Status |
|---|---|
| XSS token theft | ✓ Protected — JWT in HttpOnly cookie, not localStorage |
| CSRF | ✓ Protected — SameSite=Lax + stateless JWT |
| Session fixation | ✓ Protected — STATELESS session policy, no server-side session |
| SQL injection | ✓ Protected — JPA parameterized queries |
| Password hashing | ✓ BCryptPasswordEncoder (cost factor 10) |
| Username enumeration | ✓ Same error message for unknown user and wrong password |
