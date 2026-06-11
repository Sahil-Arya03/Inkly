package com.calendar.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Unified calendar item returned to the frontend. Backs both native calendar
 * events ({@code objectType = "EVENT"}) and kanban card deadlines
 * ({@code objectType = "CARD"}).
 */
public record CalendarEventDto(
    UUID id,
    UUID sourceId,        // original event/card UUID
    String objectType,    // "EVENT" or "CARD"
    String title,
    String description,
    String location,
    String category,
    Instant startsAt,
    Instant endsAt,
    boolean allDay,
    String source,        // "INKLY" or "GOOGLE"
    List<AttendeeDto> attendees,
    String createdByName
) {}
