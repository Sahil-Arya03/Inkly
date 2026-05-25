# JWT Authentication — Step-by-Step Implementation Guide

Your stack already has everything you need: Spring Security + jjwt 0.11.5 are both in `pom.xml`. You just need to wire them together. Work through the steps in order — each one builds on the last.

---

## What you're building

```
Browser (inkly-login.jsx)
  POST /api/auth/login  { email, password }
        ↓
  Spring AuthController  →  validates credentials  →  returns { token: "eyJ..." }
        ↓
Browser stores token in localStorage
  future requests add:  Authorization: Bearer eyJ...
        ↓
  JwtAuthFilter reads it, validates it, puts user in Spring Security context
```

---

## Step 1 — Create the User entity

Create `src/main/java/com/entities/User.java`:

```java
package com.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "APP_USERS")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;   // bcrypt hash, never plain text

    private String role = "USER";

    public User(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }
}
```

> **Why a separate User entity?** `Note` is your data model. Auth needs its own table — different lifecycle, different concerns.

---

## Step 2 — Create the UserRepository

Create `src/main/java/com/repositories/UserRepository.java`:

```java
package com.repositories;

import com.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

Spring Data generates the SQL automatically. You just declare the method name.

---

## Step 3 — Create the JWT utility class

Create `src/main/java/com/security/JwtUtil.java`:

```java
package com.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // Must be at least 32 characters for HS256. Move to application.properties later.
    private static final String SECRET = "inkly-super-secret-key-change-me-in-prod";
    private static final long EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());

    public String generate(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean isValid(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
```

> **Why jjwt 0.11.5 syntax?** jjwt changed its API at 0.10 — `Jwts.parser()` is deprecated. Always use `Jwts.parserBuilder()`.

---

## Step 4 — Create the DTOs

Create `src/main/java/com/dto/AuthRequest.java`:

```java
package com.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String email;
    private String password;
}
```

Create `src/main/java/com/dto/AuthResponse.java`:

```java
package com.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
}
```

---

## Step 5 — Create UserDetailsService (bridges your User entity to Spring Security)

Create `src/main/java/com/security/UserDetailsServiceImpl.java`:

```java
package com.security;

import com.repositories.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository repo;

    public UserDetailsServiceImpl(UserRepository repo) {
        this.repo = repo;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return repo.findByEmail(email)
                .map(u -> User.withUsername(u.getEmail())
                        .password(u.getPasswordHash())
                        .roles(u.getRole())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Not found: " + email));
    }
}
```

---

## Step 6 — Create the JWT request filter

This runs on every request and sets the security context if a valid token is present.

Create `src/main/java/com/security/JwtAuthFilter.java`:

```java
package com.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.isValid(token)) {
                String email = jwtUtil.extractEmail(token);
                UserDetails user = userDetailsService.loadUserByUsername(email);
                var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(req, res);
    }
}
```

---

## Step 7 — Configure Spring Security

Create `src/main/java/com/security/SecurityConfig.java`:

```java
package com.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                           // REST API, no session → no CSRF needed
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()        // login endpoint is public
                .requestMatchers("/*.html", "/*.jsx", "/*.css").permitAll()  // static frontend files
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## Step 8 — Create the Auth controller

Replace (or update) `src/main/java/com/controllers/homeController.java` — or create a new `AuthController.java`:

```java
package com.controllers;

import com.dto.*;
import com.entities.User;
import com.repositories.UserRepository;
import com.security.JwtUtil;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // One-time registration endpoint — use this to seed your first user, then remove or secure it
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody AuthRequest req) {
        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        userRepo.save(new User(req.getEmail(), passwordEncoder.encode(req.getPassword())));
        return ResponseEntity.ok("User created");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        return userRepo.findByEmail(req.getEmail())
                .filter(u -> passwordEncoder.matches(req.getPassword(), u.getPasswordHash()))
                .map(u -> ResponseEntity.ok(new AuthResponse(jwtUtil.generate(u.getEmail()))))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}
```

---

## Step 9 — Enable JPA (Spring Boot auto-config)

Add to `src/main/resources/application.properties`:

```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.datasource.url=jdbc:postgresql://localhost:5432/jdbclearning
spring.datasource.username=postgres
spring.datasource.password=2000
```

> **Important:** You now have two Hibernate configurations — `hibernate.cfg.xml` (legacy, used by `factoryprovider.java`) and Spring Boot's JPA auto-config. Spring Boot's JPA will manage the `User` table. Either keep both for now, or migrate `Note` to Spring Data JPA later and delete `hibernate.cfg.xml`.

---

## Step 10 — Wire up the frontend

In `src/main/webapp/inkly-login.jsx`, replace the fake `setTimeout` in the `submit` function:

**Before (current fake):**
```js
setLoading(true);
setTimeout(() => { setLoading(false); onSignIn(); }, 950);
```

**After (real API call):**
```js
setLoading(true);
fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: pw })
})
  .then(res => {
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  })
  .then(data => {
    localStorage.setItem("inkly_token", data.token);
    setLoading(false);
    onSignIn();
  })
  .catch(() => {
    setLoading(false);
    setErrs({ pw: "Invalid email or password." });
  });
```

For any future authenticated API calls, add this header:
```js
headers: {
  "Authorization": "Bearer " + localStorage.getItem("inkly_token")
}
```

---

## Test it end-to-end

1. Start the backend: `mvn spring-boot:run`
2. Register a user (one-time):
   ```bash
   curl -X POST http://localhost:8081/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"avery@inkly.team","password":"yourpassword"}'
   ```
3. Start the frontend: `npm run dev`
4. Open `http://localhost:3000`, enter the email/password you just registered — you should get redirected to the dashboard.
5. Check `localStorage` in DevTools → Application → Local Storage → you should see `inkly_token`.

---

## Checklist

- [ ] Step 1 — `User.java` entity created  
- [ ] Step 2 — `UserRepository.java` created  
- [ ] Step 3 — `JwtUtil.java` created  
- [ ] Step 4 — `AuthRequest.java` + `AuthResponse.java` DTOs created  
- [ ] Step 5 — `UserDetailsServiceImpl.java` created  
- [ ] Step 6 — `JwtAuthFilter.java` created  
- [ ] Step 7 — `SecurityConfig.java` created  
- [ ] Step 8 — `AuthController.java` created  
- [ ] Step 9 — `application.properties` updated with JPA config  
- [ ] Step 10 — `inkly-login.jsx` `submit` function updated  
- [ ] Registered a test user via `/api/auth/register`  
- [ ] Logged in successfully and confirmed token in localStorage  