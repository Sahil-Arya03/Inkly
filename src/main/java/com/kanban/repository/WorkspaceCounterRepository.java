package com.kanban.repository;

import com.kanban.domain.WorkspaceCounter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface WorkspaceCounterRepository extends JpaRepository<WorkspaceCounter, UUID> {

    /**
     * Acquires a pessimistic write lock (SELECT … FOR UPDATE) so concurrent
     * card creates in the same workspace serialize on this row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from WorkspaceCounter c where c.workspaceId = :ws")
    WorkspaceCounter lockByWorkspaceId(@Param("ws") UUID ws);
}