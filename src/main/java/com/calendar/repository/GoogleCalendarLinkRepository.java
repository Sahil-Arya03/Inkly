package com.calendar.repository;

import com.calendar.domain.GoogleCalendarLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GoogleCalendarLinkRepository extends JpaRepository<GoogleCalendarLink, UUID> {
}
