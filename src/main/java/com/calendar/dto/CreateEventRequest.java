package com.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateEventRequest(
    @NotBlank @Size(max = 255) String title,
    @Size(max = 10_000) String description,
    @Size(max = 255) String location,
    String category,
    @NotNull Instant startsAt,
    @NotNull Instant endsAt,
    boolean allDay,
    List<UUID> attendeeIds
) {}
