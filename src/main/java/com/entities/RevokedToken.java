package com.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A JWT that was revoked before its natural expiry (logout). Identified by
 * the token's jti claim; rows older than expires_at can be pruned freely.
 */
@Entity
@Table(name = "revoked_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RevokedToken {

    @Id
    @Column(name = "jti", updatable = false, nullable = false)
    private String jti;

    @Column(name = "expires_at", columnDefinition = "timestamptz", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at", columnDefinition = "timestamptz", nullable = false)
    private Instant revokedAt;
}
