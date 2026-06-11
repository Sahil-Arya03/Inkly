package com.kanban.web.dto;

import java.util.List;
import java.util.UUID;

public record BoardLoadResponse(
    UUID workspaceId,
    UUID boardId,
    String boardName,
    List<ColumnWithCards> columns
) {
    public record ColumnWithCards(
        UUID id,
        String name,
        String rank,
        Integer wipLimit,
        List<CardResponse> cards
    ) {}
}
