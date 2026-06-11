package com.kanban;

import com.kanban.domain.*;
import com.kanban.repository.*;
import com.kanban.service.CardService;
import com.kanban.web.dto.CardResponse;
import com.kanban.web.dto.CreateCardRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.LocalDate;
import java.util.List;

/**
 * Development seed data — active only under the "seed" Spring profile.
 * Run with: --spring.profiles.active=seed
 *
 * Produces: 1 workspace, 3 users, 1 membership each, 1 board,
 * 5 columns (Backlog→Completed) with WIP limits, and 6 cards in rank order.
 */
@Configuration
@Slf4j
public class KanbanSeeder {

    // Column ranks — evenly spaced in 'a'-'z': e(4), j(9), n(13), s(18), x(23)
    private static final String[] COL_RANKS = {"e", "j", "n", "s", "x"};

    @Bean
    @Profile("seed")
    CommandLineRunner seed(
        WorkspaceRepository    workspaceRepo,
        KanbanUserRepository   userRepo,
        MembershipRepository   membershipRepo,
        WorkspaceCounterRepository counterRepo,
        BoardRepository        boardRepo,
        BoardColumnRepository  columnRepo,
        CardService            cardService
    ) {
        return args -> {
            workspaceRepo.findBySlug("northwind").ifPresent(existing -> {
                boolean hasBoard = !boardRepo.findByWorkspaceId(existing.getId()).isEmpty();
                if (hasBoard) {
                    log.info("[seed] Northwind workspace already fully seeded — skipping.");
                    return;
                }
                // Workspace exists but board is missing (partial seed from a previous crashed run).
                // Cascade-delete it so we start clean.
                log.info("[seed] Northwind workspace found but board is missing — cleaning up for re-seed.");
                workspaceRepo.delete(existing);
                workspaceRepo.flush();
            });
            // Re-check after potential cleanup
            if (workspaceRepo.findBySlug("northwind").isPresent()) {
                log.info("[seed] Northwind workspace already fully seeded — skipping.");
                return;
            }

            // ---- workspace ----
            Workspace ws = workspaceRepo.save(Workspace.builder()
                .name("Northwind Studio")
                .slug("northwind")
                .plan(WorkspacePlan.STARTER)
                .build());

            // Initialize workspace counter (required before any createCard call)
            counterRepo.save(new WorkspaceCounter(ws));

            // ---- users ----
            KanbanUser avery = userRepo.save(KanbanUser.builder()
                .email("avery@inkly.team").name("Avery Walsh").build());
            KanbanUser maren = userRepo.save(KanbanUser.builder()
                .email("maren@inkly.team").name("Maren Olsson").build());
            KanbanUser devon = userRepo.save(KanbanUser.builder()
                .email("devon@inkly.team").name("Devon Park").build());

            // ---- memberships ----
            membershipRepo.save(Membership.builder().workspace(ws).user(avery).role(MembershipRole.OWNER).build());
            membershipRepo.save(Membership.builder().workspace(ws).user(maren).role(MembershipRole.ADMIN).build());
            membershipRepo.save(Membership.builder().workspace(ws).user(devon).role(MembershipRole.MEMBER).build());

            // ---- board ----
            Board board = boardRepo.save(Board.builder()
                .workspace(ws).name("Project Inkly")
                .description("Main product kanban board")
                .build());

            // ---- columns ----
            record ColDef(String name, Integer wip) {}
            List<ColDef> colDefs = List.of(
                new ColDef("Backlog",     null),
                new ColDef("To Do",       5),
                new ColDef("In Progress", 3),
                new ColDef("Review",      2),
                new ColDef("Completed",   null)
            );

            BoardColumn[] cols = new BoardColumn[5];
            for (int i = 0; i < colDefs.size(); i++) {
                ColDef def = colDefs.get(i);
                cols[i] = columnRepo.save(BoardColumn.builder()
                    .board(board).name(def.name()).rank(COL_RANKS[i]).wipLimit(def.wip())
                    .build());
            }

            // ---- cards (created via CardService for proper seq assignment) ----
            // Each subsequent card in the same column passes afterCardId=prev.id() so ranks are unique.

            // Backlog — 2 cards
            CardResponse b1 = cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[0].getId(),
                "Investigate cold-start latency on EU region",
                "P95 has crept past 800ms after Friday's deploy.",
                Priority.HIGH, LocalDate.now().plusDays(4), null, null, null), devon.getEmail());

            cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[0].getId(),
                "Migrate billing webhooks to v3 contract",
                "Replace deprecated endpoints; coordinate with finance.",
                Priority.MEDIUM, LocalDate.now().plusDays(10), b1.id(), null, null), devon.getEmail());

            // To Do — 1 card
            cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[1].getId(),
                "Onboarding empty state for solo workspaces",
                "First-run flow when user creates workspace without teammates.",
                Priority.HIGH, LocalDate.now().plusDays(3), null, null, null), avery.getEmail());

            // In Progress — 2 cards
            CardResponse ip1 = cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[2].getId(),
                "Drag-to-reorder for nested pages",
                "Reorder + reparent in one gesture.",
                Priority.HIGH, LocalDate.now().plusDays(2), null, null, null), avery.getEmail());

            cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[2].getId(),
                "Workspace SSO setup wizard v2",
                "OIDC + SAML in 3 steps.",
                Priority.HIGH, LocalDate.now().plusDays(5), ip1.id(), null, null), maren.getEmail());

            // Review — 1 card
            cardService.createCard(new CreateCardRequest(
                ws.getId(), board.getId(), cols[3].getId(),
                "Inline citations in AI-summary blocks",
                "Sources rendered as superscript links.",
                Priority.MEDIUM, LocalDate.now().plusDays(1), null, null, null), avery.getEmail());

            log.info("[seed] Seeded workspace='{}' board='{}' with {} columns and 6 cards.",
                ws.getSlug(), board.getName(), cols.length);
        };
    }
}