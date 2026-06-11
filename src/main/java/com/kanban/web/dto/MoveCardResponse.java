package com.kanban.web.dto;

import java.util.UUID;

/**
 * Result of CardService.moveCard().
 *
 * @param cardId    moved card
 * @param columnId  new (or same) column
 * @param rank      new rank string — use this to update optimistic-UI state
 * @param overLimit true when the destination column's wip_limit would be exceeded;
 *                  the move still succeeds unless inkly.kanban.wip.strict=true
 */
public record MoveCardResponse(
    UUID cardId,
    UUID columnId,
    String rank,
    boolean overLimit
) {}