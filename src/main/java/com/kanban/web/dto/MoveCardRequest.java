package com.kanban.web.dto;

import java.util.UUID;

/**
 * Input for CardService.moveCard().
 *
 * Rank is computed server-side from the neighbors — never trusted from client.
 *
 * @param cardId       card to move
 * @param columnId     destination column (may be the current column for reorder)
 * @param afterCardId  card that should appear immediately before the moved card (lower rank); null = top
 * @param beforeCardId card that should appear immediately after the moved card (higher rank); null = bottom
 */
public record MoveCardRequest(
    UUID cardId,
    UUID columnId,
    UUID afterCardId,
    UUID beforeCardId
) {}