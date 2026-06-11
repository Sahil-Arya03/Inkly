package com.kanban.web.dto;

import com.kanban.domain.Card;
import com.kanban.domain.Priority;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Read-side projection of a Card. Entities never cross the service boundary.
 */
public record CardResponse(
    UUID id,
    UUID workspaceId,
    UUID boardId,
    UUID columnId,
    int seq,
    String humanId,       // e.g. "INK-235" — workspace slug prefix + seq
    String title,
    String description,
    Priority priority,
    LocalDate dueDate,
    String rank,
    int commentCount,
    int attachmentCount,
    UUID createdById,
    Instant createdAt,
    Instant updatedAt
) {
    public static CardResponse from(Card c, String workspaceSlug) {
        return new CardResponse(
            c.getId(),
            c.getWorkspace().getId(),
            c.getBoard().getId(),
            c.getColumn().getId(),
            c.getSeq(),
            workspaceSlug.toUpperCase() + "-" + c.getSeq(),
            c.getTitle(),
            c.getDescription(),
            c.getPriority(),
            c.getDueDate(),
            c.getRank(),
            c.getCommentCount(),
            c.getAttachmentCount(),
            c.getCreatedBy().getId(),
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }
}