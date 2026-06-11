package com.controllers;

import com.dto.AuthRequest;
import com.dto.AuthResponse;
import com.dto.RegisterRequest;
import com.entities.User;
import com.kanban.service.WorkspaceSetupService;
import com.repositories.UserRepository;
import com.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
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

    public AuthController(UserRepository userRepo, PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil, WorkspaceSetupService workspaceSetup) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.workspaceSetup = workspaceSetup;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req,
                                                  HttpServletResponse res) {
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
        int maxAge = 24 * 3600;
        String token = jwtUtil.generate(user.getEmail(), false);
        setCookieHeader(res, token, maxAge);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(user.getEmail(), user.getName(), user.getWorkspace(), (long) maxAge * 1000));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest req,
                                               HttpServletResponse res) {
        User user = userRepo.findByEmail(req.getEmail())
                .filter(u -> passwordEncoder.matches(req.getPassword(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        workspaceSetup.bootstrap(user.getEmail(), user.getName(), user.getWorkspace());
        boolean rememberMe = req.isRememberMe();
        int maxAge = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
        String token = jwtUtil.generate(user.getEmail(), rememberMe);
        setCookieHeader(res, token, maxAge);
        return ResponseEntity.ok(new AuthResponse(user.getEmail(), user.getName(), user.getWorkspace(), (long) maxAge * 1000));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse res) {
        res.addHeader("Set-Cookie", "inkly_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
        return ResponseEntity.noContent().build();
    }

    private void setCookieHeader(HttpServletResponse res, String token, int maxAgeSec) {
        res.addHeader("Set-Cookie",
                "inkly_token=" + token + "; Path=/; HttpOnly; Max-Age=" + maxAgeSec + "; SameSite=Lax");
    }
}
