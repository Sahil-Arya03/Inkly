package com.calendar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Maps an Inkly object (either a {@code calendar_events} row or a {@code cards}
 * row) to its mirror copy in a user's Google Calendar. Exactly one of
 * {@code eventId} / {@code cardId} is non-null (enforced by a DB CHECK).
 */
@Entity
@Table(name = "google_event_map")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoogleEventMap {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "event_id", columnDefinition = "uuid")
    private UUID eventId;

    @Column(name = "card_id", columnDefinition = "uuid")
    private UUID cardId;

    @Column(name = "google_event_id", nullable = false)
    private String googleEventId;

    private String etag;

    @Column(name = "last_synced_at", columnDefinition = "timestamptz")
    private Instant lastSyncedAt;
}
