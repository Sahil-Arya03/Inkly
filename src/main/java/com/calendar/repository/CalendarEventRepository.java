package com.calendar.repository;

import com.calendar.domain.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    /**
     * Events the user attends, starting within [from, to). Soft-deleted events
     * are excluded automatically by the entity-level @SQLRestriction.
     */
    @Query("""
        SELECT DISTINCT ce FROM CalendarEvent ce
        JOIN ce.attendees ea
        WHERE ea.id.userId = :userId
          AND ce.startsAt >= :from
          AND ce.startsAt < :to
        ORDER BY ce.startsAt ASC
        """)
    List<CalendarEvent> findForUserBetween(@Param("userId") UUID userId,
                                           @Param("from") Instant from,
                                           @Param("to") Instant to);
}
