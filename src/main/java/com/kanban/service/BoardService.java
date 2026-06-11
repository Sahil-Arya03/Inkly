package com.kanban.service;

import com.kanban.domain.*;
import com.kanban.repository.*;
import com.kanban.web.dto.BoardLoadResponse;
import com.kanban.web.dto.CardResponse;
import com.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final UserRepository      authUserRepo;   // auth APP_USERS table
    private final WorkspaceRepository workspaceRepo;
    private final BoardRepository     boardRepo;
    private final BoardColumnRepository columnRepo;
    private final CardRepository      cardRepo;

    /**
     * Finds the first board for the authenticated user's workspace. Never
     * falls back to another workspace's board — if the caller's workspace or
     * board cannot be resolved, that's a 404.
     */
    @Transactional(readOnly = true)
    public BoardLoadResponse loadBoardForUser(String email) {
        Board board = authUserRepo.findByEmail(email)
            .flatMap(u -> workspaceRepo.findBySlug(slugify(u.getWorkspace())))
            .flatMap(ws -> boardRepo.findByWorkspaceId(ws.getId()).stream().findFirst())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No board found for your workspace"));

        return buildResponse(board);
    }

    private BoardLoadResponse buildResponse(Board board) {
        // Access slug within transaction — triggers one lazy load
        String slug = board.getWorkspace().getSlug();

        List<BoardColumn> cols = columnRepo.findByBoardIdOrderByRankAsc(board.getId());
        List<Card> allCards   = cardRepo.findByBoardIdOrderByColumnIdAscRankAsc(board.getId());

        Map<UUID, List<CardResponse>> byCol = allCards.stream()
            .collect(Collectors.groupingBy(
                c -> c.getColumn().getId(),
                Collectors.mapping(c -> CardResponse.from(c, slug), Collectors.toList())
            ));

        List<BoardLoadResponse.ColumnWithCards> colDtos = cols.stream()
            .map(col -> new BoardLoadResponse.ColumnWithCards(
                col.getId(),
                col.getName(),
                col.getRank(),
                col.getWipLimit(),
                byCol.getOrDefault(col.getId(), List.of())
            ))
            .toList();

        return new BoardLoadResponse(board.getWorkspace().getId(), board.getId(), board.getName(), colDtos);
    }

    private static String slugify(String name) {
        if (name == null) return "";
        return name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}