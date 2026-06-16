package com.calendar.web;

import com.calendar.domain.GoogleCalendarLink;
import com.calendar.dto.CalendarEventDto;
import com.calendar.dto.ConnectionStatusDto;
import com.calendar.dto.CreateEventRequest;
import com.calendar.dto.UpdateEventRequest;
import com.calendar.repository.GoogleCalendarLinkRepository;
import com.calendar.service.CalendarEventService;
import com.calendar.service.CalendarQueryService;
import com.calendar.service.CalendarSyncService;
import com.kanban.domain.KanbanUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarQueryService queryService;
    private final CalendarEventService eventService;
    private final CalendarSyncService syncService;
    private final GoogleCalendarLinkRepository links;

    /** Events + card deadlines for the caller in [from, to). */
    @GetMapping("/events")
    public List<CalendarEventDto> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        return queryService.getEventsForUser(requireKanbanUser(request), from, to);
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public CalendarEventDto createEvent(@Valid @RequestBody CreateEventRequest req,
                                        HttpServletRequest request) {
        return eventService.createEvent(requireKanbanUser(request), req);
    }

    @PatchMapping("/events/{id}")
    public CalendarEventDto updateEvent(@PathVariable UUID id,
                                        @Valid @RequestBody UpdateEventRequest req,
                                        HttpServletRequest request) {
        return eventService.updateEvent(requireKanbanUser(request), id, req);
    }

    @DeleteMapping("/events/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEvent(@PathVariable UUID id, HttpServletRequest request) {
        eventService.deleteEvent(requireKanbanUser(request), id);
    }

    @PostMapping("/sync")
    public Map<String, Object> sync(HttpServletRequest request) {
        KanbanUser caller = requireKanbanUser(request);
        syncService.syncFromGoogle(caller);
        Instant lastSyncedAt = links.findById(caller.getId())
                .map(GoogleCalendarLink::getLastSyncedAt)
                .orElse(null);
        // Map.of rejects null values; lastSyncedAt is null until the first sync
        // completes (or when no Google account is linked), so use a null-tolerant map.
        Map<String, Object> body = new HashMap<>();
        body.put("synced", true);
        body.put("lastSyncedAt", lastSyncedAt);
        return body;
    }

    @GetMapping("/connection")
    public ConnectionStatusDto connection(HttpServletRequest request) {
        KanbanUser caller = requireKanbanUser(request);
        return links.findById(caller.getId())
                .map(l -> new ConnectionStatusDto(true, l.getGoogleEmail(), l.getLastSyncedAt()))
                .orElse(new ConnectionStatusDto(false, null, null));
    }

    private KanbanUser requireKanbanUser(HttpServletRequest request) {
        KanbanUser user = (KanbanUser) request.getAttribute("kanbanUser");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No kanban user for session");
        }
        return user;
    }
}
