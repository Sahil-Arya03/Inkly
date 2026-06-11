package com.kanban.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class CardAssigneeId implements Serializable {

    @Column(name = "card_id", columnDefinition = "uuid")
    private UUID cardId;

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;
}