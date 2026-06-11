package com.calendar.domain;

import com.kanban.domain.KanbanUser;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "event_attendees")
@Getter @Setter @NoArgsConstructor
public class EventAttendee {

    @EmbeddedId
    private EventAttendeeId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("eventId")
    @JoinColumn(name = "event_id")
    private CalendarEvent event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private KanbanUser user;

    @Column(nullable = false)
    private String response = "NEEDS_ACTION";

    public EventAttendee(CalendarEvent event, KanbanUser user) {
        this.event = event;
        this.user  = user;
        this.id    = new EventAttendeeId(event.getId(), user.getId());
    }
}
