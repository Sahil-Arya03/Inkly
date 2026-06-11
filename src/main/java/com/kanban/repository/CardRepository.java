package com.kanban.repository;

import com.kanban.domain.Card;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {

    /** Board load query: returns all cards ordered for rendering. */
    List<Card> findByBoardIdOrderByColumnIdAscRankAsc(UUID boardId);

    /** WIP check: count cards currently in the given column. */
    int countByColumnId(UUID columnId);

    /** Ordered card list for a single column. */
    List<Card> findByColumnIdOrderByRankAsc(UUID columnId);
}
