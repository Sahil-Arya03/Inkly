package com.kanban.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Per-workspace monotonic sequence for human-readable card IDs (INK-N).
 * workspace_id is both the PK and FK; @MapsId derives it from the Workspace reference.
 */
@Entity
@Table(name = "workspace_counters")
@Getter @Setter @NoArgsConstructor
public class WorkspaceCounter {

    @Id
    @Column(name = "workspace_id", columnDefinition = "uuid")
    private UUID workspaceId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @Column(name = "next_card_seq", nullable = false)
    private int nextCardSeq = 1;

    public WorkspaceCounter(Workspace workspace) {
        this.workspace = workspace;
        // @MapsId will derive workspaceId from workspace.getId() during persist;
        // do NOT set workspaceId here — a non-null @Id tricks Spring Data JPA into
        // calling merge() instead of persist(), which fails on a brand-new entity.
    }
}