package com.controllers;

import com.entities.User;
import com.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserRepository userRepo;

    public MeController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping
    public Map<String, Object> me(Authentication auth) {
        User u = userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session user no longer exists"));
        return Map.of(
                "email", u.getEmail(),
                "name", u.getName(),
                "workspace", u.getWorkspace(),
                "role", u.getRole()
        );
    }
}