# Backend Implementation Report — AGENT-E
> Chief Architect (implemented directly) · Phase 3 · 2026-06-05

## Files Changed

| File | Change Type |
|---|---|
| `src/main/java/com/security/JwtUtil.java` | Modified — added rememberMe overload |
| `src/main/java/com/security/JwtAuthFilter.java` | Modified — cookie + Bearer fallback |
| `src/main/java/com/controllers/AuthController.java` | Rewritten — HttpOnly cookie + logout |
| `src/main/java/com/dto/AuthRequest.java` | Modified — added rememberMe field |
| `src/main/java/com/dto/AuthResponse.java` | Modified — removed token field |

---

## 1. JwtUtil.java

**Change:** Added `generate(String email, boolean rememberMe)` overload. Existing `generate(String email)` now delegates to it with `rememberMe=false`.

```java
public String generate(String email) {
    return generate(email, false);
}

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

**Security rationale:** Enables server-enforced session lifetime differentiation. "Remember Me" = 30 days (2592000000 ms). Normal session = 24 hours (configurable via `jwt.expiry-ms`). The client cannot extend its own session — it's enforced by the signed JWT `exp` claim.

---

## 2. JwtAuthFilter.java

**Change:** Replaced single-source header extraction with a `extractToken(HttpServletRequest)` helper that checks the `inkly_token` cookie first, then falls back to the `Authorization: Bearer` header for tooling/development compatibility.

```java
private String extractToken(HttpServletRequest req) {
    Cookie[] cookies = req.getCookies();
    if (cookies != null) {
        for (Cookie c : cookies) {
            if ("inkly_token".equals(c.getName())) return c.getValue();
        }
    }
    String header = req.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) return header.substring(7);
    return null;
}
```

Control flow simplified: now a single `if (token != null && jwtUtil.isValid(token))` block instead of multiple early returns.

**Security rationale:** Cookie extraction path is the production path — browser sends `inkly_token` cookie automatically with every request to `localhost:8081`. Bearer header fallback allows continued use with `curl`, Postman, or other API tools during development without breaking the security model (it's still a valid signed JWT).

---

## 3. AuthController.java

**Changes:**
- `POST /api/auth/login` — injects `HttpServletResponse`, generates `inkly_token` cookie with Max-Age based on `rememberMe` flag
- `POST /api/auth/register` — same cookie pattern, always 24h for new registrations
- `POST /api/auth/logout` — new endpoint, sets `Max-Age=0` to expire the cookie immediately
- `setCookieHeader()` private helper centralises cookie header construction
- `AuthResponse` no longer contains `token` field — removed from all return statements

**Cookie header format:**
```
Set-Cookie: inkly_token=<jwt>; Path=/; HttpOnly; Max-Age=<seconds>; SameSite=Lax
```

Uses `res.addHeader("Set-Cookie", ...)` instead of the `jakarta.servlet.http.Cookie` API because the Jakarta API does not support the `SameSite` attribute. Manual header construction is the standard workaround for this JDK/Servlet API limitation.

**Security rationale:**
- `HttpOnly` — JavaScript cannot read the cookie, eliminating XSS token theft
- `SameSite=Lax` — CSRF protection while remaining compatible with top-level navigation (OAuth redirect flows work)
- `Path=/` — Cookie sent on all requests to this origin
- `Max-Age` controls browser persistence: 0 = session cookie gone, positive value = persisted

---

## 4. AuthRequest.java

**Change:** Added `private boolean rememberMe = false;` field. Lombok `@Data` auto-generates `isRememberMe()` getter.

**Security rationale:** Allows the client to signal session duration preference at login time. Defaults to `false` (24h) if the field is not sent in the JSON body — safe default.

---

## 5. AuthResponse.java

**Change:** Removed `private String token;` field and updated constructor from 5-arg to 4-arg (no token parameter).

**Security rationale:** The JWT must never travel in the JSON response body where it can be read by JavaScript. Moving it exclusively to the HttpOnly `Set-Cookie` response header means the frontend never has access to the raw token string. The response body carries only non-sensitive user profile data.

---

## Security Summary

| Concern | Before | After |
|---|---|---|
| JWT exposure | In JSON body → stored in localStorage | In HttpOnly Set-Cookie only |
| Remember Me | Non-functional | 30-day cookie (Max-Age=2592000) |
| Server-side logout | No endpoint | POST /api/auth/logout → Max-Age=0 |
| Cookie SameSite | Not set | SameSite=Lax |
| Bearer header fallback | Only mechanism | Dev fallback; cookie is primary |
