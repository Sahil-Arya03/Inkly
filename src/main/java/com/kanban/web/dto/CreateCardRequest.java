package com.kanban.web.dto;

import com.kanban.domain.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateCardRequest(
    @NotNull UUID workspaceId,
    @NotNull UUID boardId,
    @NotNull UUID columnId,
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 10_000) String description,
    Priority priority,
    LocalDate dueDate,
    UUID afterCardId,
    UUID beforeCardId,
    UUID assigneeId
) {}
