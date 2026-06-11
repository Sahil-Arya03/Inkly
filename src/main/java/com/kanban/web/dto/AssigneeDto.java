package com.kanban.web.dto;

import java.util.UUID;

public record AssigneeDto(UUID id, String name, String email) {}
