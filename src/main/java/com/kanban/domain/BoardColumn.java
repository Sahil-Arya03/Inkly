package com.kanban.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "board_columns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BoardColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(nullable = false)
    private String name;

    /** LexoRank-style fractional ordering key. */
    @Column(nullable = false)
    private String rank;

    /** Null = unlimited. Active work columns carry a limit. */
    @Column(name = "wip_limit")
    private Integer wipLimit;

    @CreationTimestamp
    @Column(name = "created_at", columnDefinition = "timestamptz", updatable = false)
    private Instant createdAt;
}