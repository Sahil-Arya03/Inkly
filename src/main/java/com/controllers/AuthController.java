package com.controllers;

import com.dto.AuthRequest;
import com.dto.AuthResponse;
import com.dto.RegisterRequest;
import com.entities.User;
import com.kanban.service.WorkspaceSetupService;
import com.repositories.UserRepository;
import com.security.JwtUtil;
import com.security.LoginRateLimiter;
import com.security.TokenRevocationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final WorkspaceSetupService workspaceSetup;
    private final LoginRateLimiter rateLimiter;
    private final TokenRevocationService tokenRevocation;

    /**
     * Adds the Secure attribute to the auth cookie. false for plain-HTTP dev;
     * the prod profile must set it to true so the JWT never travels over HTTP.
     */
    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    public AuthController(UserRepository userRepo, PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil, WorkspaceSetupService workspaceSetup,
                          LoginRateLimiter rateLimiter, TokenRevocationService tokenRevocation) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.workspaceSetup = workspaceSetup;
        this.rateLimiter = rateLimiter;
        this.tokenRevocation = tokenRevocation;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req,
                                                  HttpServletRequest httpReq,
                                                  HttpServletResponse res) {
        rateLimiter.checkAttempt(clientIp(httpReq), req.getEmail());
        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = userRepo.save(new User(
                req.getEmail(),
                passwordEncoder.encode(req.getPassword()),
                req.getName(),
                req.getWorkspace()
        ));
        workspaceSetup.bootstrap(user.getEmail(), user.getName(), user.getWorkspace());
        int maxAge = (int) (jwtUtil.getExpiryMs() / 1000);
        String token = jwtUtil.generate(user.getEmail(), false);
        setCookieHeader(res, token, maxAge);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(user.getEmail(), user.getName(), user.getWorkspace(), (long) maxAge * 1000));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest req,
                                               HttpServletRequest httpReq,
                                               HttpServletResponse res) {
        String ip = clientIp(httpReq);
        rateLimiter.checkAttempt(ip, req.getEmail());
        User user = userRepo.findByEmail(req.getEmail())
                .filter(u -> passwordEncoder.matches(req.getPassword(), u.getPasswordHash()))
                .orElseThrow(() -> {
                    rateLimiter.recordFailure(ip, req.getEmail());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
                });
        rateLimiter.recordSuccess(ip, req.getEmail());
        workspaceSetup.bootstrap(user.getEmail(), user.getName(), user.getWorkspace());
        boolean rememberMe = req.isRememberMe();
        int maxAge = rememberMe ? 30 * 24 * 3600 : (int) (jwtUtil.getExpiryMs() / 1000);
        String token = jwtUtil.generate(user.getEmail(), rememberMe);
        setCookieHeader(res, token, maxAge);
        return ResponseEntity.ok(new AuthResponse(user.getEmail(), user.getName(), user.getWorkspace(), (long) maxAge * 1000));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
        // Denylist the presented token so it cannot be replayed after logout.
        String token = readAuthCookie(req);
        if (token != null) {
            tokenRevocation.revoke(token);
        }
        setCookieHeader(res, "", 0);
        return ResponseEntity.noContent().build();
    }

    private static String readAuthCookie(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return null;
        }
        for (var cookie : req.getCookies()) {
            if ("inkly_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /**
     * Rate-limit key. Uses the socket address on purpose: X-Forwarded-For is
     * client-spoofable unless set by a trusted proxy. When deploying behind a
     * load balancer, configure server.forward-headers-strategy so
     * getRemoteAddr() reflects the real client.
     */
    private static String clientIp(HttpServletRequest req) {
        return req.getRemoteAddr();
    }

    private void setCookieHeader(HttpServletResponse res, String token, int maxAgeSec) {
        res.addHeader("Set-Cookie",
                "inkly_token=" + token + "; Path=/; HttpOnly; Max-Age=" + maxAgeSec + "; SameSite=Lax"
                + (cookieSecure ? "; Secure" : ""));
    }
}
