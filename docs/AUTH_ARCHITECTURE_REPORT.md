# Auth Architecture Report — AGENT-A Report
> Delivered by AGENT-A (Opus 4.6) · Phase 1 · 2026-06-05

## Files Analyzed
- `src/main/java/com/security/JwtUtil.java`
- `src/main/java/com/security/JwtAuthFilter.java`
- `src/main/java/com/security/SecurityConfig.java`
- `src/main/java/com/security/UserDetailsServiceImpl.java`
- `src/main/java/com/controllers/AuthController.java`
- `src/main/java/com/controllers/MeController.java`
- `src/main/java/com/dto/AuthRequest.java`
- `src/main/java/com/dto/AuthResponse.java`
- `src/main/java/com/dto/RegisterRequest.java`
- `src/main/resources/application.properties`

---

## 1. JWT Generation (`JwtUtil.java`)

| Property | Value |
|---|---|
| Algorithm | **HS256** (symmetric HMAC-SHA-256) via jjwt |
| Key init | `@PostConstruct`, built from `jwt.secret` as UTF-8 bytes |
| Secret (committed) | `inkly-super-secret-key-please-change-before-going-to-production` |
| Token lifetime | **24 hours** (`jwt.expiry-ms=86400000`) — fixed, no variable expiry |
| Claims | `sub` (email), `iat`, `exp` only — no roles, no workspace |
| Validation | Signature + expiry only — no denylist |

```java
public String generate(String email) {
    return Jwts.builder()
        .setSubject(email)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + expiryMs))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
}
```

**Gap:** Single `generate(email)` signature — no `rememberMe` parameter. All tokens are 24h regardless of user preference.

---

## 2. Token Extraction (`JwtAuthFilter.java`)

`OncePerRequestFilter` reads exclusively from the **`Authorization` header** with `Bearer ` prefix:

```java
String header = req.getHeader("Authorization");
if (header == null || !header.startsWith("Bearer ")) {
    chain.doFilter(req, res);
    return;
}
String token = header.substring(7);
```

- **No cookie reading** — cookies are completely ignored
- Invalid/missing token passes through unauthenticated (rejected by authorization rules downstream)
- On valid token: loads user from DB via `UserDetailsServiceImpl`, sets `SecurityContext`

---

## 3. SecurityConfig Analysis

| Configuration | Setting |
|---|---|
| Session policy | `STATELESS` — no server-side session |
| CSRF | **Disabled** (`csrf.disable()`) |
| `allowCredentials` | **`true`** — but no cookie flow uses it (inconsistent) |
| CORS origins | Comma-separated from `cors.allowed-origins` property |
| Public routes | `/api/auth/**`, `/*.html`, `/*.jsx`, `/*.css`, `/*.js` |
| Protected | All other requests require `authenticated()` |
| 401 response | Custom JSON: `{"error":"UNAUTHORIZED","message":"Authentication required"}` |
| 403 response | Custom JSON: `{"error":"FORBIDDEN","message":"Access denied"}` |

---

## 4. AuthController — Login & Register Responses

Both endpoints return `AuthResponse` with **JWT in the JSON body** — no `Set-Cookie` header:

```java
return ResponseEntity.ok(new AuthResponse(
    token,          // JWT string in body — exposed to JS
    user.getEmail(),
    user.getName(),
    user.getWorkspace(),
    jwtUtil.getExpiryMs()
));
```

- `POST /register` → 201 CREATED (409 CONFLICT if email exists)
- `POST /login` → 200 OK (401 for unknown email or wrong password — prevents enumeration)
- No `Set-Cookie` on either endpoint
- No `POST /api/auth/logout` endpoint exists

---

## 5. DTOs

### AuthRequest
```java
@Email String email;
@Size(min = 6) String password;    // min 6 chars at login
```

### RegisterRequest
```java
@Email String email;
@Size(min = 8) String password;    // min 8 chars at register — MISMATCH with login
@Size(min = 2) String name;
@Pattern(regexp = "^[a-z0-9-]+$") @Size(min = 3) String workspace;
```

> **Note:** No `rememberMe` field anywhere — needed for cookie expiry differentiation.

### AuthResponse
```java
String token;         // JWT string — must be removed after cookie migration
String email;
String name;
String workspace;
long expiresIn;       // ms
```

---

## 6. `/api/me` Endpoint (`MeController.java`)

```java
@GetMapping
public Map<String, Object> me(Authentication auth) {
    User u = userRepo.findByEmail(auth.getName())...;
    return Map.of("email", u.getEmail(), "name", u.getName(),
                  "workspace", u.getWorkspace(), "role", u.getRole());
}
```

- Always re-fetches from DB — live state, not cached
- Returns `role` field (not in `AuthResponse`)
- Protected by `SecurityConfig` (requires valid JWT)
- **Currently never called by frontend** for session restoration

---

## 7. Security Gaps

| Severity | Gap | Details |
|---|---|---|
| **CRITICAL** | JWT in response body / localStorage | Token returned as JSON field, stored by frontend in `localStorage` — XSS-stealable |
| **HIGH** | No server-side logout | No `/api/auth/logout` endpoint; no token denylist; clearing localStorage doesn't invalidate token |
| **HIGH** | No HttpOnly cookie | `allowCredentials=true` in CORS is configured but no cookie is ever set — misconfiguration |
| **HIGH** | Committed JWT secret | `inkly-super-secret-key-please-change-before-going-to-production` in source control |
| **HIGH** | Remember Me non-functional | UI checkbox exists, always defaults `true`; backend always issues 24h token regardless |
| **MEDIUM** | No token refresh mechanism | Single 24h token, no refresh token; user must re-login after expiry |
| **MEDIUM** | Password validation mismatch | Login accepts 6-char passwords; registration requires 8-char |
| **MEDIUM** | No rate limiting | No brute-force protection on `/api/auth/login` |
| **LOW** | No JWT claims (roles/workspace) | Token only carries email; every request hits DB |
