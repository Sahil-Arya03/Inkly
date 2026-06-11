package com.calendar.web;

import com.calendar.service.GoogleOAuthService;
import com.kanban.domain.KanbanUser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar/oauth")
@Slf4j
public class GoogleOAuthController {

    private final GoogleOAuthService oauthService;

    @Value("${calendar.oauth.success-redirect}")
    private String successRedirect;

    public GoogleOAuthController(GoogleOAuthService oauthService) {
        this.oauthService = oauthService;
    }

    /** Returns the Google consent URL for the authenticated caller. */
    @GetMapping("/start")
    public Map<String, String> start(HttpServletRequest request) {
        KanbanUser caller = (KanbanUser) request.getAttribute("kanbanUser");
        if (caller == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No kanban user for session");
        }
        return Map.of("url", oauthService.buildAuthorizationUrl(caller));
    }

    /**
     * Google redirects here after consent. Public endpoint (no session cookie):
     * the caller is identified by {@code state} (the kanban user UUID set in /start).
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error) {
        String target = successRedirect;
        try {
            if (error != null || code == null || state == null) {
                throw new IllegalArgumentException("OAuth denied or missing code/state");
            }
            oauthService.handleCallback(code, state);
        } catch (Exception e) {
            log.warn("Google OAuth callback failed: {}", e.getMessage());
            target = withConnectedFalse(successRedirect);
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, target)
                .build();
    }

    private String withConnectedFalse(String url) {
        return url.replace("connected=true", "connected=false");
    }
}
