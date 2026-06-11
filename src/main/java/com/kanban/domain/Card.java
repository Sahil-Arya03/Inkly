package com.kanban.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "cards")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    /** Denormalized workspace key for single-table tenant isolation. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "column_id", nullable = false)
    private BoardColumn column;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    /** Per-workspace sequential id (INK-N). NOT the primary key. */
    @Column(nullable = false)
    private int seq;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "due_date")
    private LocalDate dueDate;

    /** LexoRank-style fractional ordering key within the column. */
    @Column(nullable = false)
    private String rank;

    /**
     * Denormalized comment count. Increment/decrement in the same transaction
     * when a Comment is created or deleted — never COUNT() on board load.
     */
    @Column(name = "comment_count", nullable = false)
    @Builder.Default
    private int commentCount = 0;

    /**
     * Denormalized attachment count. Same convention as commentCount.
     */
    @Column(name = "attachment_count", nullable = false)
    @Builder.Default
    private int attachmentCount = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private KanbanUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", columnDefinition = "timestamptz", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", columnDefinition = "timestamptz")
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "card_labels",
        joinColumns        = @JoinColumn(name = "card_id"),
        inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    @Builder.Default
    private Set<Label> labels = new HashSet<>();
}