package com.kanban.service;

import com.kanban.domain.*;
import com.kanban.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkspaceSetupService {

    private static final String[] COL_RANKS = {"e", "j", "n", "s", "x"};
    private static final String[][] DEFAULT_COLS = {
        {"Backlog",     null},
        {"To Do",       "5"},
        {"In Progress", "3"},
        {"Review",      "2"},
        {"Done",        null},
    };

    private final KanbanUserRepository        kanbanUsers;
    private final WorkspaceRepository         workspaces;
    private final WorkspaceCounterRepository  counters;
    private final BoardRepository             boards;
    private final BoardColumnRepository       columns;
    private final MembershipRepository        memberships;
    private final DepartmentRepository        departments;

    /**
     * Creates the full kanban setup for a newly registered auth user.
     * Safe to call multiple times — skips if the kanban user already exists.
     */
    @Transactional
    public void bootstrap(String email, String name, String workspaceName) {
        // Idempotent guard — don't double-create if somehow called twice
        if (kanbanUsers.findByEmail(email).isPresent()) {
            log.debug("[onboard] Kanban user already exists for {}", email);
            return;
        }

        // 1. Kanban user
        KanbanUser user = kanbanUsers.save(
            KanbanUser.builder().email(email).name(name).build()
        );

        // 2. Workspace — derive a unique slug from the workspace name
        String baseSlug = slugify(workspaceName);
        String slug = baseSlug;
        int attempt = 1;
        while (workspaces.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + attempt++;
        }
        Workspace ws = workspaces.save(
            Workspace.builder().name(workspaceName).slug(slug).plan(WorkspacePlan.STARTER).build()
        );

        // 3. Counter (required before any createCard call)
        counters.save(new WorkspaceCounter(ws));

        // 4. Default department — idempotent; find or create
        Department dept = departments.findByWorkspaceIdAndName(ws.getId(), "General")
            .orElseGet(() -> departments.save(
                Department.builder().workspace(ws).name("General").build()
            ));

        // 5. Membership — include department from the start
        memberships.save(
            Membership.builder().workspace(ws).user(user).role(MembershipRole.OWNER).department(dept).build()
        );

        // 6. Board
        Board board = boards.save(
            Board.builder().workspace(ws).name("Project Board").description("").build()
        );

        // 7. Default columns
        for (int i = 0; i < DEFAULT_COLS.length; i++) {
            String colName = DEFAULT_COLS[i][0];
            Integer wip = DEFAULT_COLS[i][1] != null ? Integer.parseInt(DEFAULT_COLS[i][1]) : null;
            columns.save(
                BoardColumn.builder().board(board).name(colName).rank(COL_RANKS[i]).wipLimit(wip).build()
            );
        }

        log.info("[onboard] Bootstrapped kanban workspace='{}' for {}", slug, email);
    }

    private static String slugify(String name) {
        if (name == null || name.isBlank()) return "workspace";
        return name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
