package com.kanban.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "card_assignees")
@Getter @Setter @NoArgsConstructor
public class CardAssignee {

    @EmbeddedId
    private CardAssigneeId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("cardId")
    @JoinColumn(name = "card_id")
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private KanbanUser user;

    @Column(name = "assigned_at", columnDefinition = "timestamptz", nullable = false)
    private OffsetDateTime assignedAt;

    @PrePersist
    void prePersist() {
        if (assignedAt == null) assignedAt = OffsetDateTime.now();
    }

    public CardAssignee(Card card, KanbanUser user) {
        this.card = card;
        this.user = user;
        this.id   = new CardAssigneeId(card.getId(), user.getId());
    }
}
