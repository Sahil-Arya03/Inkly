package com.calendar.repository;

import com.calendar.domain.EventAttendee;
import com.calendar.domain.EventAttendeeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventAttendeeRepository extends JpaRepository<EventAttendee, EventAttendeeId> {
    List<EventAttendee> findByIdEventId(UUID eventId);
}
