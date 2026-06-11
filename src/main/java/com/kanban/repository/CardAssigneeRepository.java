package com.kanban.repository;

import com.kanban.domain.CardAssignee;
import com.kanban.domain.CardAssigneeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, CardAssigneeId> {
    // id.userId maps to the user_id column via the @EmbeddedId path
    List<CardAssignee> findByIdUserId(UUID userId);

    // id.cardId maps to the card_id column; used to fan a card change out to
    // every assignee's Google calendar.
    List<CardAssignee> findByIdCardId(UUID cardId);
}