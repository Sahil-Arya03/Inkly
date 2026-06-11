package com.kanban.repository;

import com.kanban.domain.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SprintRepository extends JpaRepository<Sprint, UUID> {
    List<Sprint> findByBoardId(UUID boardId);
}