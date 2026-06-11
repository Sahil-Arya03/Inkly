package com.kanban.repository;

import com.kanban.domain.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, UUID> {
    List<BoardColumn> findByBoardIdOrderByRankAsc(UUID boardId);
}
