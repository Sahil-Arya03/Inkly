package com.calendar.service;

import com.calendar.domain.CalendarEvent;
import com.calendar.domain.EventAttendee;
import com.calendar.dto.AttendeeDto;
import com.calendar.dto.CalendarEventDto;
import com.calendar.dto.CreateEventRequest;
import com.calendar.dto.UpdateEventRequest;
import com.calendar.repository.CalendarEventRepository;
import com.calendar.repository.EventAttendeeRepository;
import com.kanban.domain.KanbanUser;
import com.kanban.domain.Membership;
import com.kanban.domain.Workspace;
import com.kanban.repository.KanbanUserRepository;
import com.kanban.repository.MembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Write side of native calendar events: create / update / soft-delete, plus
 * fan-out of each change to attendees' Google calendars (best-effort).
 */
@Service
@RequiredArgsConstructor
public class CalendarEventService {

    private final CalendarEventRepository events;
    private final EventAttendeeRepository attendees;
    private final KanbanUserRepository kanbanUsers;
    private final MembershipRepository memberships;
    private final CalendarSyncService syncService;

    @Transactional
    public CalendarEventDto createEvent(KanbanUser caller, CreateEventRequest req) {
        if (!req.startsAt().isBefore(req.endsAt())) {
            throw new IllegalArgumentException("startsAt must be before endsAt");
        }

        Workspace workspace = firstWorkspace(caller);

        CalendarEvent event = CalendarEvent.builder()
                .workspace(workspace)
                .createdBy(caller)
                .title(req.title())
                .description(req.description())
                .location(req.location())
                .category(req.category() != null && !req.category().isBlank() ? req.category() : "GENERAL")
                .startsAt(req.startsAt())
                .endsAt(req.endsAt())
                .allDay(req.allDay())
                .source("INKLY")
                .build();
        CalendarEvent saved = events.save(event);

        // Attendee set: the creator always attends, plus any requested users.
        Set<UUID> attendeeIds = new LinkedHashSet<>();
        attendeeIds.add(caller.getId());
        if (req.attendeeIds() != null) {
            attendeeIds.addAll(req.attendeeIds());
        }

        for (UUID uid : attendeeIds) {
            KanbanUser u = uid.equals(caller.getId())
                    ? caller
                    : kanbanUsers.findById(uid).orElse(null);
            if (u == null) {
                continue;
            }
            // Only members of the event's workspace may be attached as
            // attendees — a foreign user id must not receive the event.
            if (!uid.equals(caller.getId())
                    && memberships.findByWorkspaceIdAndUserId(workspace.getId(), uid).isEmpty()) {
                continue;
            }
            // CalendarEvent.attendees is cascade=ALL, so adding to the managed
            // collection persists the row on flush. Calling attendees.save(ea)
            // as well would persist a second instance with the same composite id
            // → NonUniqueObjectException. Let the cascade own the insert.
            EventAttendee ea = new EventAttendee(saved, u);
            saved.getAttendees().add(ea);
            syncService.pushEventToGoogle(saved, u);
        }

        return toDto(saved);
    }

    @Transactional
    public CalendarEventDto updateEvent(KanbanUser caller, UUID id, UpdateEventRequest req) {
        CalendarEvent event = events.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        List<EventAttendee> eventAttendees = attendees.findByIdEventId(id);
        boolean isCreator = event.getCreatedBy().getId().equals(caller.getId());
        boolean isAttendee = eventAttendees.stream()
                .anyMatch(a -> a.getUser().getId().equals(caller.getId()));
        if (!isCreator && !isAttendee) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to edit this event");
        }

        if (req.title() != null) event.setTitle(req.title());
        if (req.description() != null) event.setDescription(req.description());
        if (req.location() != null) event.setLocation(req.location());
        if (req.category() != null && !req.category().isBlank()) event.setCategory(req.category());
        if (req.startsAt() != null) event.setStartsAt(req.startsAt());
        if (req.endsAt() != null) event.setEndsAt(req.endsAt());
        if (req.allDay() != null) event.setAllDay(req.allDay());

        if (!event.getStartsAt().isBefore(event.getEndsAt())) {
            throw new IllegalArgumentException("startsAt must be before endsAt");
        }

        CalendarEvent saved = events.save(event);

        for (EventAttendee ea : eventAttendees) {
            syncService.pushEventToGoogle(saved, ea.getUser());
        }

        return toDto(saved);
    }

    @Transactional
    public void deleteEvent(KanbanUser caller, UUID id) {
        CalendarEvent event = events.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        if (!event.getCreatedBy().getId().equals(caller.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the creator can delete this event");
        }

        for (EventAttendee ea : attendees.findByIdEventId(id)) {
            syncService.deleteEventFromGoogle(event, ea.getUser());
        }

        event.setDeletedAt(Instant.now());
        events.save(event);
    }

    // ------------------------------------------------------------------

    private Workspace firstWorkspace(KanbanUser caller) {
        List<Membership> ms = memberships.findByUserId(caller.getId());
        if (ms.isEmpty()) {
            throw new IllegalArgumentException("Caller has no workspace membership");
        }
        return ms.get(0).getWorkspace();
    }

    private CalendarEventDto toDto(CalendarEvent event) {
        List<AttendeeDto> attendeeDtos = event.getAttendees().stream()
                .map(a -> new AttendeeDto(
                        a.getUser().getId(),
                        a.getUser().getName(),
                        a.getUser().getEmail(),
                        a.getResponse()))
                .toList();
        return new CalendarEventDto(
                event.getId(),
                event.getId(),
                "EVENT",
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getCategory(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.isAllDay(),
                event.getSource(),
                attendeeDtos,
                event.getCreatedBy().getName());
    }
}
