package com.kanban.repository;

import com.kanban.domain.KanbanUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface KanbanUserRepository extends JpaRepository<KanbanUser, UUID> {
    Optional<KanbanUser> findByEmail(String email);
}
