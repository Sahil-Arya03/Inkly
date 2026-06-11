package com.kanban.web;

import com.kanban.service.AssigneeService;
import com.kanban.service.BoardService;
import com.kanban.service.CardService;
import com.kanban.web.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class KanbanController {

    private final BoardService    boardService;
    private final CardService     cardService;
    private final AssigneeService assigneeService;

    /**
     * Load the board for the authenticated user's workspace.
     * Returns columns in rank order, each with their cards sorted by rank.
     */
    @GetMapping("/boards")
    public BoardLoadResponse getBoard(Authentication auth) {
        return boardService.loadBoardForUser(auth.getName());
    }

    /**
     * Create a card. Assigns a gapless per-workspace seq under a pessimistic lock.
     */
    @PostMapping("/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public CardResponse createCard(@Valid @RequestBody CreateCardRequest req, Authentication auth) {
        return cardService.createCard(req, auth.getName());
    }

    /**
     * Move a card to a new column/position.
     * Rank is computed server-side from destination neighbors.
     */
    @PatchMapping("/cards/{id}/move")
    public MoveCardResponse moveCard(
            @PathVariable UUID id,
            @RequestBody MoveCardRequest req) {
        return cardService.moveCard(new MoveCardRequest(id, req.columnId(), req.afterCardId(), req.beforeCardId()));
    }

    /**
     * Permanently deletes a card (and its assignees/labels/comments/attachments
     * via cascade). Caller must belong to the card's workspace.
     */
    @DeleteMapping("/cards/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCard(@PathVariable UUID id, Authentication auth) {
        cardService.deleteCard(id, auth.getName());
    }

    /**
     * List assignable users for the caller's workspace + department.
     * Falls back to all workspace members when the caller has no department.
     */
    @GetMapping("/assignees")
    public List<AssigneeDto> getAssignees(Authentication auth) {
        return assigneeService.fetchAssignees(auth.getName());
    }
}
