package com.kanban.repository;

import com.kanban.domain.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    List<Membership> findByWorkspaceId(UUID workspaceId);
    List<Membership> findByUserId(UUID userId);
    List<Membership> findByWorkspaceIdAndDepartmentId(UUID workspaceId, UUID departmentId);
    java.util.Optional<Membership> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}