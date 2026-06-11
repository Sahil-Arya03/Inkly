package com.kanban.service;

import com.calendar.service.CalendarSyncService;
import com.kanban.domain.*;
import com.kanban.repository.*;
import com.kanban.web.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cards;
    private final BoardColumnRepository columns;
    private final WorkspaceRepository workspaces;
    private final KanbanUserRepository users;
    private final BoardRepository boards;
    private final WorkspaceCounterRepository counters;
    private final RankGenerator rankGen;
    private final MembershipRepository memberships;
    private final CardAssigneeRepository cardAssignees;
    private final CalendarSyncService calendarSyncService;

    /**
     * When true, moveCard throws on WIP violation; when false it only sets
     * overLimit.
     */
    @Value("${inkly.kanban.wip.strict:false}")
    private boolean wipStrict;

    // ------------------------------------------------------------------
    // createCard
    // ------------------------------------------------------------------

    /**
     * Creates a card with a gapless per-workspace sequential id.
     *
     * The pessimistic write lock on workspace_counters ensures concurrent
     * inserts in the same workspace serialize — no seq collisions.
     */
    @Transactional
    public CardResponse createCard(CreateCardRequest req, String callerEmail) {
        // --- 1. Resolve references ---
        Workspace workspace = workspaces.findById(req.workspaceId())
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found: " + req.workspaceId()));
        Board board = boards.findById(req.boardId())
                .orElseThrow(() -> new IllegalArgumentException("Board not found: " + req.boardId()));
        BoardColumn column = columns.findById(req.columnId())
                .orElseThrow(() -> new IllegalArgumentException("Column not found: " + req.columnId()));
        KanbanUser creator = users.findByEmail(callerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Kanban user not found for: " + callerEmail));

        // --- 2. Authorize: caller must be a member of the target workspace,
        // and the board/column chain must be internally consistent ---
        Membership callerMembership = memberships.findByWorkspaceIdAndUserId(
                workspace.getId(), creator.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Caller has no membership in this workspace"));
        if (!board.getWorkspace().getId().equals(workspace.getId())) {
            throw new IllegalArgumentException("Board does not belong to the given workspace");
        }
        if (!column.getBoard().getId().equals(board.getId())) {
            throw new IllegalArgumentException("Column does not belong to the given board");
        }

        // --- 3. Claim next seq (pessimistic lock → single-row serialization) ---
        WorkspaceCounter counter = counters.lockByWorkspaceId(req.workspaceId());
        int seq = counter.getNextCardSeq();
        counter.setNextCardSeq(seq + 1);
        counters.save(counter);

        // --- 4. Compute rank from destination neighbors ---
        String loRank = neighborRank(req.afterCardId(), column);
        String hiRank = neighborRank(req.beforeCardId(), column);
        String rank = rankGen.between(loRank, hiRank);

        // --- 5. Persist ---
        Card card = Card.builder()
                .workspace(workspace)
                .board(board)
                .column(column)
                .seq(seq)
                .title(req.title())
                .description(req.description())
                .priority(req.priority() != null ? req.priority() : Priority.MEDIUM)
                .dueDate(req.dueDate())
                .rank(rank)
                .createdBy(creator)
                .build();

        Card saved = cards.save(card);

        // --- 6. Optional assignee — validate then insert into card_assignees ---
        if (req.assigneeId() != null) {
            KanbanUser assignee = users.findById(req.assigneeId())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee not found: " + req.assigneeId()));

            UUID callerDeptId = callerMembership.getDepartment() != null
                    ? callerMembership.getDepartment().getId()
                    : null;

            boolean valid = memberships.findByUserId(assignee.getId()).stream()
                    .anyMatch(m -> {
                        if (!m.getWorkspace().getId().equals(workspace.getId())) return false;
                        if (callerDeptId == null) return true;
                        UUID assigneeDeptId = m.getDepartment() != null
                                ? m.getDepartment().getId() : null;
                        return callerDeptId.equals(assigneeDeptId);
                    });

            if (!valid) {
                throw new IllegalArgumentException(
                        "Assignee is not in the caller's workspace/department");
            }

            cardAssignees.save(new CardAssignee(saved, assignee));

            // Mirror the new card's deadline into the assignee's Google calendar.
            // Best-effort: a Google failure must never roll back card creation.
            try {
                calendarSyncService.pushCardToGoogle(saved, assignee);
            } catch (Exception e) {
                log.warn("Google push on createCard failed for card {}: {}", saved.getId(), e.getMessage());
            }
        }

        return CardResponse.from(saved, workspace.getSlug());
    }

    // ------------------------------------------------------------------
    // moveCard
    // ------------------------------------------------------------------

    /**
     * Moves a card to a new column/position. The caller must be a member of
     * the card's workspace (same rule as {@link #deleteCard}).
     *
     * Rules:
     * - Only the moved card's column_id and rank are updated (no sibling renaming).
     * - Rank is computed server-side from destination neighbors.
     * - WIP limit is checked; behaviour on violation is governed by
     * {@code inkly.kanban.wip.strict}.
     */
    @Transactional
    public MoveCardResponse moveCard(MoveCardRequest req, String callerEmail) {
        Card card = cards.findById(req.cardId())
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + req.cardId()));

        KanbanUser caller = users.findByEmail(callerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Kanban user not found for: " + callerEmail));
        memberships.findByWorkspaceIdAndUserId(card.getWorkspace().getId(), caller.getId())
                .orElseThrow(() -> new IllegalArgumentException("Caller has no membership in this workspace"));

        BoardColumn targetCol = columns.findById(req.columnId())
                .orElseThrow(() -> new IllegalArgumentException("Column not found: " + req.columnId()));
        if (!targetCol.getBoard().getId().equals(card.getBoard().getId())) {
            throw new IllegalArgumentException("Column does not belong to the card's board");
        }

        // --- WIP check ---
        boolean overLimit = false;
        if (targetCol.getWipLimit() != null) {
            boolean movingToNewColumn = !card.getColumn().getId().equals(req.columnId());
            if (movingToNewColumn) {
                int count = cards.countByColumnId(req.columnId());
                if (count >= targetCol.getWipLimit()) {
                    if (wipStrict) {
                        throw new WipLimitExceededException(
                                "Column '" + targetCol.getName() + "' is at WIP limit " + targetCol.getWipLimit());
                    }
                    overLimit = true;
                }
            }
        }

        // --- Compute rank from neighbors (server-side only) ---
        String loRank = neighborRank(req.afterCardId(), targetCol);
        String hiRank = neighborRank(req.beforeCardId(), targetCol);
        String newRank = rankGen.between(loRank, hiRank);

        // --- Single-row update ---
        card.setColumn(targetCol);
        card.setRank(newRank);
        cards.save(card);

        return new MoveCardResponse(card.getId(), targetCol.getId(), newRank, overLimit);
    }

    // ------------------------------------------------------------------
    // deleteCard
    // ------------------------------------------------------------------

    /**
     * Permanently deletes a card. The caller must be a member of the card's
     * workspace. Child rows (assignees, labels, comments, attachments) are
     * removed via ON DELETE CASCADE at the database level.
     */
    @Transactional
    public void deleteCard(UUID cardId, String callerEmail) {
        Card card = cards.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + cardId));

        KanbanUser caller = users.findByEmail(callerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Kanban user not found for: " + callerEmail));

        memberships.findByWorkspaceIdAndUserId(card.getWorkspace().getId(), caller.getId())
                .orElseThrow(() -> new IllegalArgumentException("Caller has no membership in this workspace"));

        // Remove the card's mirror copy from every assignee's Google calendar,
        // then delete the card_assignees rows explicitly. Card does not map
        // assignees as a JPA collection, so deleting the card alone leaves these
        // managed rows referencing it — Hibernate's flush then fails (it does
        // not know about the DB-level ON DELETE CASCADE). Removing them through
        // the ORM keeps the persistence context consistent and works whether or
        // not the FK cascade is present.
        List<CardAssignee> assignees = cardAssignees.findByIdCardId(cardId);
        for (CardAssignee ca : assignees) {
            try {
                calendarSyncService.deleteCardFromGoogle(card, ca.getUser());
            } catch (Exception e) {
                log.warn("Google delete on deleteCard failed for card {}: {}", cardId, e.getMessage());
            }
        }
        cardAssignees.deleteAll(assignees);
        cardAssignees.flush();

        cards.delete(card);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * Resolves a rank neighbor's rank, enforcing that the neighbor actually
     * sits in the destination column — a foreign card id must not influence
     * ordering (or be probed for existence) across workspaces.
     */
    private String neighborRank(UUID neighborCardId, BoardColumn column) {
        if (neighborCardId == null) {
            return null;
        }
        Card neighbor = cards.findById(neighborCardId)
                .orElseThrow(() -> new IllegalArgumentException("Neighbor card not found"));
        if (!neighbor.getColumn().getId().equals(column.getId())) {
            throw new IllegalArgumentException("Neighbor card is not in the target column");
        }
        return neighbor.getRank();
    }

    // ------------------------------------------------------------------
    // Inner exception
    // ------------------------------------------------------------------

    public static class WipLimitExceededException extends RuntimeException {
        public WipLimitExceededException(String msg) {
            super(msg);
        }
    }
}
