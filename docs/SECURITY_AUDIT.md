# SECURITY_AUDIT.md — Vulnerabilities & Recommendations

> Date: 2026-06-10  
> Auditor: automated discovery audit  
> Severity scale: CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Summary Table

| # | Severity | Finding | File |
|---|---|---|---|
| S1 | CRITICAL | DB credentials and JWT secret committed to source control | `application.properties` |
| S2 | HIGH | JWT secret is weak (human-readable string, not random bytes) | `application.properties` |
| S3 | HIGH | Cookie missing `Secure` flag — vulnerable over HTTP | `AuthController.java` |
| S4 | HIGH | `RankGenerator.rebalanceColumn()` unimplemented — DoS via rank exhaustion | `RankGenerator.java` |
| S5 | HIGH | No CSRF protection | `SecurityConfig.java` |
| S6 | HIGH | React + Babel Standalone transpile in-browser — production anti-pattern | `Inkly.html` |
| S7 | MEDIUM | React Router DOM and `history` loaded via CDN without SRI hashes | `Inkly.html` |
| S8 | MEDIUM | Login form has hardcoded default email (`avery@inkly.team`) | `inkly-login.jsx` |
| S9 | MEDIUM | No rate limiting on auth endpoints | `AuthController.java` |
| S10 | MEDIUM | `DELETE /api/cards/{id}` uses `window.confirm()` — bypassable | `inkly-kanban.jsx` |
| S11 | MEDIUM | No workspace isolation check on `moveCard` | `CardService.java` |
| S12 | MEDIUM | No `@Version` optimistic lock on `Card` — last-write-wins | `Card.java` |
| S13 | MEDIUM | Denormalized counters have no DB-level enforcement | `V1__kanban_schema.sql` |
| S14 | LOW | `homeController.java` is a dead stub with an active `@RequestMapping` | `homeController.java` |
| S15 | LOW | `window.confirm()` for destructive action — easily dismissed | `inkly-kanban.jsx` |
| S16 | LOW | JWT library (jjwt 0.11.5) — check for CVEs | `pom.xml` |
| S17 | LOW | Spring Boot 4.1.0-RC1 (Release Candidate) — not production-stable | `pom.xml` |
| S18 | INFO | `SameSite=Lax` cookie — cross-origin navigation could replay cookie | `AuthController.java` |

---

## Detailed Findings

---

### S1 — CRITICAL: Credentials in Source Control

**File:** `src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:postgresql://...neon.tech/neondb?sslmode=require
spring.datasource.username=neondb_owner
spring.datasource.password=npg_5ZJSpjXVovC3

jwt.secret=inkly-super-secret-key-please-change-before-going-to-production
```

**Impact:** Anyone with read access to the repository has full DB credentials and can forge JWTs. The Neon DB URL, username, and password are live.

**Recommendation:**
1. Immediately rotate the Neon DB password.
2. Generate a new JWT secret (minimum 256-bit random bytes).
3. Move all secrets to environment variables or a secrets manager.
4. Add `application.properties` to `.gitignore` and replace with `application.properties.template`.
5. Use `spring.datasource.password=${DB_PASSWORD}` and `jwt.secret=${JWT_SECRET}`.

---

### S2 — HIGH: Weak JWT Secret

**File:** `application.properties` line 13

The value `inkly-super-secret-key-please-change-before-going-to-production` is a human-readable string. Even after moving to environment variables, the replacement must be cryptographically random.

**Recommendation:** Generate with:
```bash
openssl rand -base64 64
```
Minimum length for HMAC-SHA256 is 32 bytes; 64 bytes is safer.

---

### S3 — HIGH: Cookie Missing `Secure` Flag

**File:** `AuthController.java` lines 75-78

```java
res.addHeader("Set-Cookie",
    "inkly_token=" + token + "; Path=/; HttpOnly; Max-Age=" + maxAgeSec + "; SameSite=Lax");
```

The `Secure` flag is intentionally absent for HTTP development. Without `Secure`, the cookie is sent over plain HTTP connections, making it vulnerable to network interception.

**Recommendation:** Add `Secure` for HTTPS deployments. Use a config property:
```java
String secure = isHttps ? "; Secure" : "";
"inkly_token=..." + secure + "; HttpOnly; ..."
```

---

### S4 — HIGH: Rank Exhaustion / Denial of Service

**File:** `RankGenerator.java` lines 100-104

```java
public void rebalanceColumn(UUID columnId) {
    throw new UnsupportedOperationException(
        "rebalanceColumn not yet implemented for column " + columnId);
}
```

After approximately 25-30 cards are inserted consecutively at the same position, `between()` throws `IllegalStateException`. This bubbles up to a 500 response. Users cannot move cards in that column until the column is manually rebalanced in the DB.

**This is not just theoretical:** A single column with heavy card activity at the bottom will hit this within a normal sprint cycle.

**Recommendation:** Implement `rebalanceColumn()` to redistribute ranks evenly (e.g., `"a", "f", "k", "p", "u", "z"`) and call it when `between()` throws.

---

### S5 — HIGH: CSRF Protection Disabled

**File:** `SecurityConfig.java` line 41

```java
.csrf(csrf -> csrf.disable())
```

CSRF is disabled globally. While the cookie is `HttpOnly` (so JavaScript can't steal it), CSRF attacks can still submit requests from a different origin using browser-initiated form/fetch requests where SameSite=Lax provides only partial protection (only on cross-site navigations, not cross-site AJAX).

**Recommendation:** For cookie-based auth, either:
1. Re-enable CSRF and issue a CSRF token to the SPA, OR
2. Upgrade the cookie to `SameSite=Strict`.

SameSite=Strict is the simpler fix for this architecture.

---

### S6 — HIGH: Babel Transpilation in the Browser

**File:** `Inkly.html` lines 20, 35-48

```html
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"></script>
<script type="text/babel" src="inkly-api.jsx"></script>
...
```

Babel Standalone (~1.3MB) downloads and executes at page load, transpiles all JSX on the client, and evaluates it. This is:
- **~3-5× slower** initial load than a built bundle.
- **A security surface:** code is evaluated at runtime via Babel's internal `eval`-like mechanism.
- **Not suitable for production.**

**Recommendation:** Add a build step (Vite, webpack, or esbuild). This is the single highest-impact performance improvement available.

---

### S7 — MEDIUM: CDN Scripts Without SRI (React Router, history)

**File:** `Inkly.html` lines 16-18

```html
<script src="https://unpkg.com/history@5.3.0/umd/history.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-router@6.3.0/..."></script>
<script src="https://unpkg.com/react-router-dom@6.3.0/..."></script>
```

React and Babel have SRI hashes. React Router and history do not. A compromised unpkg CDN could serve malicious code silently.

**Recommendation:** Add `integrity="sha384-..."` attributes, or better, bundle all dependencies locally via a build step (see S6).

---

### S8 — MEDIUM: Hardcoded Default Email in Login Form

**File:** `inkly-login.jsx` line 7

```js
const [email, setEmail] = useStateLogin("avery@inkly.team");
```

Pre-fills the login form with a seed user email. Exposes internal naming convention and seed data to anyone who views the page source.

**Recommendation:** Change initial state to `""`.

---

### S9 — MEDIUM: No Rate Limiting on Auth Endpoints

**File:** `AuthController.java`

No rate limiting, account lockout, or brute-force protection on `/api/auth/login` or `/api/auth/register`. An attacker can attempt unlimited password guesses.

**Recommendation:** Add Spring Security's `AuthenticationEventPublisher` for lockout tracking, or use a gateway-level rate limiter (nginx, AWS WAF, etc.).

---

### S10 — MEDIUM: No Workspace Isolation on moveCard

**File:** `CardService.java` lines 134-170

`moveCard()` accepts a `columnId` in the request body. It verifies the card exists and the column exists, but does NOT verify that the column belongs to the same board/workspace as the card. A user could theoretically move a card into a column from another workspace.

**Recommendation:** Add:
```java
if (!targetCol.getBoard().getId().equals(card.getBoard().getId())) {
    throw new IllegalArgumentException("Column does not belong to the card's board");
}
```

---

### S11 — MEDIUM: No Optimistic Lock on Card (Last-Write-Wins)

**File:** `Card.java` — no `@Version` field

If two users edit the same card concurrently (when card editing is implemented), the second save will silently overwrite the first with no merge conflict.

**Recommendation:** Add `@Version private Long version;` to `Card.java`. Include `version` in `UpdateCardRequest` and `CardResponse`.

---

### S12 — MEDIUM: Denormalized Counters Not DB-Enforced

**File:** `V1__kanban_schema.sql` — `comment_count`, `attachment_count` on `cards`

The `commentCount` and `attachmentCount` fields are documented to be "kept in sync manually in the same transaction." There is no DB trigger, no CHECK constraint, and no existing service that updates them. When the Comment and Attachment APIs are built, it will be easy to forget to update these.

**Recommendation:** Either add PostgreSQL triggers to maintain the counters, or remove them and use `COUNT()` queries with appropriate caching.

---

### S14 — LOW: Dead Controller With Active Route

**File:** `homeController.java`

```java
@RestController
@RequestMapping("/Login")
public class homeController {}
```

This empty class registers a `/Login` route prefix in Spring's handler mapping. It does nothing but adds ambiguity and is a naming-convention violation (lowercase class name).

**Recommendation:** Delete this file.

---

### S17 — LOW: Spring Boot Release Candidate in Production

**File:** `pom.xml` line 31

```xml
<version>4.1.0-RC1</version>
```

Release Candidates may have breaking changes, known bugs, or missing security patches. The Spring Boot 4.1.0 GA release may address issues present in RC1.

**Recommendation:** Upgrade to Spring Boot 4.1.0 GA (or the latest stable release) once it is available.

---

## Authentication Architecture — Positive Notes

The following were implemented correctly:

- JWT is stored in an `HttpOnly` cookie — JavaScript cannot read it. ✓
- Passwords are hashed with BCrypt. ✓
- Spring Security sessions are stateless (`STATELESS`). ✓
- CORS is configured with an explicit allowlist and `allowCredentials=true`. ✓
- `JwtAuthFilter` checks `SecurityContextHolder` before re-authenticating (no double-auth). ✓
- Logout sets `Max-Age=0` server-side (cookie is actually cleared, not just client-deleted). ✓
- `GET /api/boards` uses `silent:true` so a 401 does not trigger a disruptive session-expired redirect. ✓
- `WorkspaceSetupService` is idempotent — safe to call on every login. ✓
- Workspace counter uses `PESSIMISTIC_WRITE` lock — no seq collisions possible. ✓
