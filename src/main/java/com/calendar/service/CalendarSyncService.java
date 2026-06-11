package com.calendar.service;

import com.calendar.domain.CalendarEvent;
import com.calendar.domain.EventAttendee;
import com.calendar.domain.GoogleCalendarLink;
import com.calendar.domain.GoogleEventMap;
import com.calendar.dto.CalendarEventDto;
import com.calendar.dto.GoogleSyncResult;
import com.calendar.repository.CalendarEventRepository;
import com.calendar.repository.EventAttendeeRepository;
import com.calendar.repository.GoogleCalendarLinkRepository;
import com.calendar.repository.GoogleEventMapRepository;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.kanban.domain.Card;
import com.kanban.domain.KanbanUser;
import com.kanban.domain.Membership;
import com.kanban.domain.Workspace;
import com.kanban.repository.KanbanUserRepository;
import com.kanban.repository.MembershipRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Two-way bridge between Inkly and Google Calendar:
 * <ul>
 *   <li>push: card deadlines are mirrored into each assignee's Google calendar</li>
 *   <li>pull: changes from Google are imported as native {@code GOOGLE} events</li>
 * </ul>
 * Every public method swallows its own exceptions — a Google outage must never
 * roll back a kanban transaction or break the scheduled job.
 */
@Service
@Slf4j
public class CalendarSyncService {

    private static final String INKLY_PREFIX = "[INKLY]";

    private final GoogleCalendarLinkRepository links;
    private final GoogleCalendarService googleCalendar;
    private final GoogleEventMapRepository eventMap;
    private final CalendarEventRepository events;
    private final EventAttendeeRepository attendees;
    private final KanbanUserRepository kanbanUsers;
    private final MembershipRepository memberships;

    public CalendarSyncService(GoogleCalendarLinkRepository links,
                               GoogleCalendarService googleCalendar,
                               GoogleEventMapRepository eventMap,
                               CalendarEventRepository events,
                               EventAttendeeRepository attendees,
                               KanbanUserRepository kanbanUsers,
                               MembershipRepository memberships) {
        this.links = links;
        this.googleCalendar = googleCalendar;
        this.eventMap = eventMap;
        this.events = events;
        this.attendees = attendees;
        this.kanbanUsers = kanbanUsers;
        this.memberships = memberships;
    }

    // ------------------------------------------------------------------
    // push: Inkly card -> Google
    // ------------------------------------------------------------------

    @Transactional
    public void pushCardToGoogle(Card card, KanbanUser assignee) {
        try {
            if (assignee == null || card.getDueDate() == null) {
                return;
            }
            GoogleCalendarLink link = links.findById(assignee.getId()).orElse(null);
            if (link == null) {
                return;
            }

            CalendarEventDto dto = cardToDto(card);
            Optional<GoogleEventMap> existing =
                    eventMap.findByUserIdAndCardId(assignee.getId(), card.getId());

            if (existing.isPresent()) {
                googleCalendar.updateEvent(link, existing.get().getGoogleEventId(), dto);
                GoogleEventMap m = existing.get();
                m.setLastSyncedAt(Instant.now());
                eventMap.save(m);
            } else {
                String googleEventId = googleCalendar.createEvent(link, dto);
                eventMap.save(GoogleEventMap.builder()
                        .userId(assignee.getId())
                        .cardId(card.getId())
                        .googleEventId(googleEventId)
                        .lastSyncedAt(Instant.now())
                        .build());
            }
        } catch (Exception e) {
            log.warn("pushCardToGoogle failed for card {} / user {}: {}",
                    card.getId(), assignee != null ? assignee.getId() : null, e.getMessage());
        }
    }

    @Transactional
    public void deleteCardFromGoogle(Card card, KanbanUser assignee) {
        try {
            if (assignee == null) {
                return;
            }
            GoogleCalendarLink link = links.findById(assignee.getId()).orElse(null);
            Optional<GoogleEventMap> existing =
                    eventMap.findByUserIdAndCardId(assignee.getId(), card.getId());
            if (existing.isEmpty()) {
                return;
            }
            if (link != null) {
                googleCalendar.deleteEvent(link, existing.get().getGoogleEventId());
            }
            eventMap.delete(existing.get());
        } catch (Exception e) {
            log.warn("deleteCardFromGoogle failed for card {} / user {}: {}",
                    card.getId(), assignee != null ? assignee.getId() : null, e.getMessage());
        }
    }

    @Transactional
    public void pushEventToGoogle(CalendarEvent event, KanbanUser attendee) {
        try {
            if (attendee == null) {
                return;
            }
            GoogleCalendarLink link = links.findById(attendee.getId()).orElse(null);
            if (link == null) {
                return;
            }
            CalendarEventDto dto = eventToDto(event);
            Optional<GoogleEventMap> existing =
                    eventMap.findByUserIdAndEventId(attendee.getId(), event.getId());

            if (existing.isPresent()) {
                googleCalendar.updateEvent(link, existing.get().getGoogleEventId(), dto);
                GoogleEventMap m = existing.get();
                m.setLastSyncedAt(Instant.now());
                eventMap.save(m);
            } else {
                String googleEventId = googleCalendar.createEvent(link, dto);
                eventMap.save(GoogleEventMap.builder()
                        .userId(attendee.getId())
                        .eventId(event.getId())
                        .googleEventId(googleEventId)
                        .lastSyncedAt(Instant.now())
                        .build());
            }
        } catch (Exception e) {
            log.warn("pushEventToGoogle failed for event {} / user {}: {}",
                    event.getId(), attendee != null ? attendee.getId() : null, e.getMessage());
        }
    }

    @Transactional
    public void deleteEventFromGoogle(CalendarEvent event, KanbanUser attendee) {
        try {
            if (attendee == null) {
                return;
            }
            Optional<GoogleEventMap> existing =
                    eventMap.findByUserIdAndEventId(attendee.getId(), event.getId());
            if (existing.isEmpty()) {
                return;
            }
            GoogleCalendarLink link = links.findById(attendee.getId()).orElse(null);
            if (link != null) {
                googleCalendar.deleteEvent(link, existing.get().getGoogleEventId());
            }
            eventMap.delete(existing.get());
        } catch (Exception e) {
            log.warn("deleteEventFromGoogle failed for event {} / user {}: {}",
                    event.getId(), attendee != null ? attendee.getId() : null, e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // pull: Google -> Inkly
    // ------------------------------------------------------------------

    @Transactional
    public void syncFromGoogle(KanbanUser user) {
        GoogleCalendarLink link = links.findById(user.getId()).orElse(null);
        if (link == null) {
            return;
        }
        try {
            GoogleSyncResult result = googleCalendar.fetchChanges(link);

            for (Event ge : result.events()) {
                String summary = ge.getSummary();
                // Skip our own mirrored card deadlines (when summary is present).
                if (summary != null && summary.startsWith(INKLY_PREFIX)) {
                    continue;
                }

                if ("cancelled".equals(ge.getStatus())) {
                    handleCancelled(user, ge.getId());
                    continue;
                }

                upsertGoogleEvent(user, link, ge);
            }

            if (result.newSyncToken() != null) {
                link.setSyncToken(result.newSyncToken());
            }
            link.setLastSyncedAt(Instant.now());
            links.save(link);
        } catch (Exception e) {
            log.warn("syncFromGoogle failed for user {}: {}", user.getId(), e.getMessage());
        }
    }

    private void handleCancelled(KanbanUser user, String googleEventId) {
        eventMap.findByUserIdAndGoogleEventId(user.getId(), googleEventId).ifPresent(m -> {
            if (m.getEventId() != null) {
                events.findById(m.getEventId()).ifPresent(ev -> {
                    ev.setDeletedAt(Instant.now());
                    events.save(ev);
                });
            }
            eventMap.delete(m);
        });
    }

    private void upsertGoogleEvent(KanbanUser user, GoogleCalendarLink link, Event ge) {
        Instant startsAt = toInstant(ge.getStart());
        Instant endsAt = toInstant(ge.getEnd());
        if (startsAt == null || endsAt == null) {
            return; // not a schedulable event
        }
        boolean allDay = isAllDay(ge.getStart());

        Optional<GoogleEventMap> mapping =
                eventMap.findByUserIdAndGoogleEventId(user.getId(), ge.getId());

        if (mapping.isPresent() && mapping.get().getEventId() != null) {
            events.findById(mapping.get().getEventId()).ifPresent(ev -> {
                ev.setTitle(safeTitle(ge.getSummary()));
                ev.setDescription(ge.getDescription());
                ev.setLocation(ge.getLocation());
                ev.setStartsAt(startsAt);
                ev.setEndsAt(endsAt);
                ev.setAllDay(allDay);
                events.save(ev);
            });
            GoogleEventMap m = mapping.get();
            m.setEtag(ge.getEtag());
            m.setLastSyncedAt(Instant.now());
            eventMap.save(m);
            return;
        }

        // New event from Google — needs a workspace to land in.
        Workspace workspace = firstWorkspace(user);
        if (workspace == null) {
            log.warn("User {} has no workspace; skipping imported Google event {}",
                    user.getId(), ge.getId());
            return;
        }

        CalendarEvent ev = CalendarEvent.builder()
                .workspace(workspace)
                .createdBy(user)
                .title(safeTitle(ge.getSummary()))
                .description(ge.getDescription())
                .location(ge.getLocation())
                .category("GENERAL")
                .startsAt(startsAt)
                .endsAt(endsAt)
                .allDay(allDay)
                .source("GOOGLE")
                .build();
        CalendarEvent saved = events.save(ev);

        attendees.save(new EventAttendee(saved, user));

        eventMap.save(GoogleEventMap.builder()
                .userId(user.getId())
                .eventId(saved.getId())
                .googleEventId(ge.getId())
                .etag(ge.getEtag())
                .lastSyncedAt(Instant.now())
                .build());
    }

    // ------------------------------------------------------------------
    // scheduled job
    // ------------------------------------------------------------------

    @Scheduled(fixedDelayString = "${calendar.sync.interval-ms:300000}")
    public void scheduledSync() {
        List<GoogleCalendarLink> all = links.findAll();
        for (GoogleCalendarLink link : all) {
            try {
                kanbanUsers.findById(link.getUserId()).ifPresent(this::syncFromGoogle);
            } catch (Exception e) {
                log.warn("Scheduled sync failed for user {}: {}", link.getUserId(), e.getMessage());
            }
        }
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private CalendarEventDto cardToDto(Card card) {
        Instant startsAt = card.getDueDate().atTime(LocalTime.of(9, 0)).toInstant(ZoneOffset.UTC);
        Instant endsAt = card.getDueDate().atTime(LocalTime.of(9, 30)).toInstant(ZoneOffset.UTC);
        String description = (card.getDescription() != null ? card.getDescription() : "")
                + "\n\nBoard task: #" + card.getSeq();
        return new CalendarEventDto(
                null, card.getId(), "CARD",
                INKLY_PREFIX + " " + card.getTitle(),
                description, null, "deadline",
                startsAt, endsAt, false, "INKLY", List.of(), null);
    }

    private CalendarEventDto eventToDto(CalendarEvent event) {
        return new CalendarEventDto(
                event.getId(), event.getId(), "EVENT",
                event.getTitle(), event.getDescription(), event.getLocation(),
                event.getCategory(), event.getStartsAt(), event.getEndsAt(),
                event.isAllDay(), event.getSource(), List.of(), null);
    }

    private Workspace firstWorkspace(KanbanUser user) {
        List<Membership> ms = memberships.findByUserId(user.getId());
        return ms.isEmpty() ? null : ms.get(0).getWorkspace();
    }

    private static String safeTitle(String summary) {
        return (summary == null || summary.isBlank()) ? "(untitled)" : summary;
    }

    private static Instant toInstant(EventDateTime edt) {
        if (edt == null) {
            return null;
        }
        DateTime dt = edt.getDateTime() != null ? edt.getDateTime() : edt.getDate();
        return dt == null ? null : Instant.ofEpochMilli(dt.getValue());
    }

    private static boolean isAllDay(EventDateTime edt) {
        return edt != null && edt.getDateTime() == null && edt.getDate() != null;
    }
}
