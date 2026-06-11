package com.calendar.domain;

import com.kanban.domain.KanbanUser;
import com.kanban.domain.Workspace;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A native Inkly calendar event. Soft-deleted via {@code deleted_at}; the
 * {@link SQLRestriction} keeps deleted rows out of every query automatically.
 */
@Entity
@Table(name = "calendar_events")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private KanbanUser createdBy;

    @Column(nullable = false)
    private String title;

    private String description;

    private String location;

    @Column(nullable = false)
    @Builder.Default
    private String category = "GENERAL";

    @Column(name = "starts_at", columnDefinition = "timestamptz", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", columnDefinition = "timestamptz", nullable = false)
    private Instant endsAt;

    @Column(name = "all_day", nullable = false)
    @Builder.Default
    private boolean allDay = false;

    /** INKLY (created in Inkly) or GOOGLE (pulled from Google Calendar). */
    @Column(nullable = false)
    @Builder.Default
    private String source = "INKLY";

    @Column(name = "deleted_at", columnDefinition = "timestamptz")
    private Instant deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", columnDefinition = "timestamptz", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", columnDefinition = "timestamptz")
    private Instant updatedAt;

    @OneToMany(mappedBy = "event", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EventAttendee> attendees = new ArrayList<>();
}
