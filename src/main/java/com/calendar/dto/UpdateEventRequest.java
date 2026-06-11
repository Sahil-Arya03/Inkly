package com.calendar.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;

/** All fields optional — only non-null fields are applied (PATCH semantics). */
public record UpdateEventRequest(
    @Size(max = 255) String title,
    @Size(max = 10_000) String description,
    @Size(max = 255) String location,
    String category,
    Instant startsAt,
    Instant endsAt,
    Boolean allDay
) {}
