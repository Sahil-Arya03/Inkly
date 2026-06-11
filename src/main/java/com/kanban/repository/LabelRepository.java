package com.kanban.repository;

import com.kanban.domain.Label;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabelRepository extends JpaRepository<Label, UUID> {
    List<Label> findByWorkspaceId(UUID workspaceId);
}