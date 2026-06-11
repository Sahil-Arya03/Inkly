package com.calendar.service;

import com.calendar.domain.CalendarEvent;
import com.calendar.dto.AttendeeDto;
import com.calendar.dto.CalendarEventDto;
import com.calendar.repository.CalendarEventRepository;
import com.kanban.domain.Card;
import com.kanban.domain.KanbanUser;
import com.kanban.repository.CardAssigneeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Read side of the calendar: merges native {@code calendar_events} the user
 * attends with kanban card deadlines assigned to them, into one sorted list.
 */
@Service
@RequiredArgsConstructor
public class CalendarQueryService {

    private final CalendarEventRepository events;
    private final CardAssigneeRepository cardAssignees;

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsForUser(KanbanUser user, LocalDate from, LocalDate to) {
        Instant fromInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to.atStartOfDay().toInstant(ZoneOffset.UTC);

        List<CalendarEventDto> result = new ArrayList<>();

        // --- Query 1: native calendar events the user attends ---
        for (CalendarEvent ce : events.findForUserBetween(user.getId(), fromInstant, toInstant)) {
            List<AttendeeDto> attendeeDtos = ce.getAttendees().stream()
                    .map(a -> new AttendeeDto(
                            a.getUser().getId(),
                            a.getUser().getName(),
                            a.getUser().getEmail(),
                            a.getResponse()))
                    .toList();
            result.add(new CalendarEventDto(
                    ce.getId(),
                    ce.getId(),
                    "EVENT",
                    ce.getTitle(),
                    ce.getDescription(),
                    ce.getLocation(),
                    ce.getCategory(),
                    ce.getStartsAt(),
                    ce.getEndsAt(),
                    ce.isAllDay(),
                    ce.getSource(),
                    attendeeDtos,
                    ce.getCreatedBy().getName()));
        }

        // --- Query 2: kanban card deadlines assigned to the user ---
        cardAssignees.findByIdUserId(user.getId()).forEach(ca -> {
            Card card = ca.getCard();
            LocalDate due = card.getDueDate();
            if (due == null || due.isBefore(from) || !due.isBefore(to)) {
                return;
            }
            Instant startsAt = due.atTime(LocalTime.of(9, 0)).toInstant(ZoneOffset.UTC);
            Instant endsAt = due.atTime(LocalTime.of(9, 30)).toInstant(ZoneOffset.UTC);
            result.add(new CalendarEventDto(
                    card.getId(),
                    card.getId(),
                    "CARD",
                    card.getTitle(),
                    card.getDescription(),
                    null,
                    "deadline",
                    startsAt,
                    endsAt,
                    false,
                    "INKLY",
                    List.of(),
                    card.getCreatedBy() != null ? card.getCreatedBy().getName() : null));
        });

        result.sort(Comparator.comparing(CalendarEventDto::startsAt));
        return result;
    }
}
