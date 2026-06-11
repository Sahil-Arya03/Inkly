package com.calendar.service;

import com.calendar.domain.GoogleCalendarLink;
import com.calendar.domain.OAuthState;
import com.calendar.repository.GoogleCalendarLinkRepository;
import com.calendar.repository.OAuthStateRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.kanban.domain.KanbanUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Drives the Google OAuth2 authorization-code dance: build the consent URL,
 * exchange the callback code for tokens, and keep the short-lived access token
 * fresh. Refresh tokens are persisted encrypted.
 */
@Service
@Slf4j
public class GoogleOAuthService {

    /** How long an issued state value can be redeemed. */
    private static final Duration STATE_TTL = Duration.ofMinutes(10);

    private final GoogleAuthorizationCodeFlow flow;
    private final TokenEncryptionService tokenEncryption;
    private final GoogleCalendarLinkRepository links;
    private final OAuthStateRepository states;
    private final NetHttpTransport httpTransport;
    private final GsonFactory jsonFactory;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${google.oauth.redirect-uri}")
    private String redirectUri;

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    public GoogleOAuthService(GoogleAuthorizationCodeFlow flow,
                              TokenEncryptionService tokenEncryption,
                              GoogleCalendarLinkRepository links,
                              OAuthStateRepository states,
                              NetHttpTransport httpTransport,
                              GsonFactory jsonFactory) {
        this.flow = flow;
        this.tokenEncryption = tokenEncryption;
        this.links = links;
        this.states = states;
        this.httpTransport = httpTransport;
        this.jsonFactory = jsonFactory;
    }

    /**
     * Builds the Google consent URL. {@code state} is 32 random bytes
     * (base64url), persisted server-side mapped to the user, single-use,
     * valid for {@link #STATE_TTL}.
     */
    public String buildAuthorizationUrl(KanbanUser user) {
        byte[] raw = new byte[32];
        secureRandom.nextBytes(raw);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        // Opportunistic purge of states that can no longer be redeemed.
        states.deleteByCreatedAtBefore(Instant.now().minus(STATE_TTL));
        states.save(new OAuthState(state, user.getId(), Instant.now()));

        return flow.newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .setState(state)
                .build();
    }

    /**
     * Exchanges the authorization {@code code} for tokens and upserts the
     * user's {@link GoogleCalendarLink}. The {@code state} must match a
     * stored, unexpired, never-used value; it is consumed on first sight so
     * a replayed or forged state is rejected before any token exchange.
     */
    public GoogleCalendarLink handleCallback(String code, String state) throws IOException {
        OAuthState stored = (state == null || state.isBlank())
                ? null
                : states.findById(state).orElse(null);
        if (stored != null) {
            states.delete(stored); // single-use: consume before anything else
        }
        if (stored == null || stored.getCreatedAt().isBefore(Instant.now().minus(STATE_TTL))) {
            throw new IllegalStateException("OAuth state is missing, unknown, expired, or already used");
        }
        UUID userId = stored.getUserId();

        GoogleTokenResponse tokenResponse = flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        String googleEmail = extractEmail(tokenResponse);

        GoogleCalendarLink link = links.findById(userId).orElseGet(() -> {
            GoogleCalendarLink fresh = new GoogleCalendarLink();
            fresh.setUserId(userId);
            fresh.setCalendarId("primary");
            return fresh;
        });

        link.setGoogleEmail(googleEmail);

        // Google only returns a refresh token on first consent (or with
        // approval_prompt=force). Keep the existing one if none came back.
        String refreshToken = tokenResponse.getRefreshToken();
        if (refreshToken != null && !refreshToken.isBlank()) {
            link.setRefreshTokenEnc(tokenEncryption.encrypt(refreshToken));
        } else if (link.getRefreshTokenEnc() == null) {
            throw new IllegalStateException(
                    "Google did not return a refresh token and none is stored. "
                    + "Revoke access at https://myaccount.google.com/permissions and retry.");
        }

        link.setAccessToken(tokenResponse.getAccessToken());
        Long expiresIn = tokenResponse.getExpiresInSeconds();
        link.setAccessExpiresAt(Instant.now().plusSeconds(expiresIn != null ? expiresIn : 3600));

        return links.save(link);
    }

    /** Refreshes the access token when it is missing or expiring within 60s. */
    public GoogleCalendarLink refreshAccessTokenIfNeeded(GoogleCalendarLink link) throws IOException {
        Instant expiry = link.getAccessExpiresAt();
        boolean needsRefresh = link.getAccessToken() == null
                || expiry == null
                || expiry.isBefore(Instant.now().plusSeconds(60));
        if (!needsRefresh) {
            return link;
        }

        String refreshToken;
        try {
            refreshToken = tokenEncryption.decrypt(link.getRefreshTokenEnc());
        } catch (TokenEncryptionService.TokenDecryptionException e) {
            // Stored token is unreadable (key rotated/lost). Drop the link so the
            // user shows as "not connected" and re-authorizes; never 500.
            log.warn("Refresh token for user {} cannot be decrypted; unlinking Google Calendar. "
                    + "Re-authorization required.", link.getUserId());
            links.delete(link);
            throw new IOException("Google Calendar link is no longer valid; re-authorization required", e);
        }
        GoogleTokenResponse resp = new GoogleRefreshTokenRequest(
                httpTransport, jsonFactory, refreshToken, clientId, clientSecret)
                .execute();

        link.setAccessToken(resp.getAccessToken());
        Long expiresIn = resp.getExpiresInSeconds();
        link.setAccessExpiresAt(Instant.now().plusSeconds(expiresIn != null ? expiresIn : 3600));
        return links.save(link);
    }

    private String extractEmail(GoogleTokenResponse tokenResponse) {
        try {
            GoogleIdToken idToken = tokenResponse.parseIdToken();
            if (idToken != null && idToken.getPayload() != null
                    && idToken.getPayload().getEmail() != null) {
                return idToken.getPayload().getEmail();
            }
        } catch (Exception e) {
            log.warn("Could not parse id_token email: {}", e.getMessage());
        }
        return "unknown";
    }
}
