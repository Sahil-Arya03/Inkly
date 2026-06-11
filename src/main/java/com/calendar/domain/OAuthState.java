package com.calendar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Single-use, short-lived state token for the Google OAuth consent flow.
 * The state value is 32 bytes from SecureRandom (base64url); it is deleted
 * on first validation and expires after 10 minutes (see GoogleOAuthService).
 */
@Entity
@Table(name = "oauth_states")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class OAuthState {

    @Id
    @Column(name = "state", updatable = false, nullable = false)
    private String state;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "created_at", columnDefinition = "timestamptz", nullable = false)
    private Instant createdAt;
}
