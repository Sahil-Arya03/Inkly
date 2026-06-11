package com.calendar.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-user Google Calendar connection. Primary key is the kanban user id
 * (one Google connection per user). The refresh token is stored encrypted.
 */
@Entity
@Table(name = "google_calendar_links")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoogleCalendarLink {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID userId;

    @Column(name = "google_email", nullable = false)
    private String googleEmail;

    @Column(name = "refresh_token_enc", nullable = false)
    private String refreshTokenEnc;

    @Column(name = "access_token")
    private String accessToken;

    @Column(name = "access_expires_at", columnDefinition = "timestamptz")
    private Instant accessExpiresAt;

    @Column(name = "calendar_id", nullable = false)
    @Builder.Default
    private String calendarId = "primary";

    @Column(name = "sync_token")
    private String syncToken;

    @Column(name = "channel_id")
    private String channelId;

    @Column(name = "channel_resource_id")
    private String channelResourceId;

    @Column(name = "channel_expires_at", columnDefinition = "timestamptz")
    private Instant channelExpiresAt;

    @Column(name = "last_synced_at", columnDefinition = "timestamptz")
    private Instant lastSyncedAt;

    @CreationTimestamp
    @Column(name = "created_at", columnDefinition = "timestamptz", updatable = false)
    private Instant createdAt;
}
