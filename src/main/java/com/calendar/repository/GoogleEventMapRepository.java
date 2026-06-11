package com.calendar.repository;

import com.calendar.domain.GoogleEventMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoogleEventMapRepository extends JpaRepository<GoogleEventMap, UUID> {
    Optional<GoogleEventMap> findByUserIdAndCardId(UUID userId, UUID cardId);
    Optional<GoogleEventMap> findByUserIdAndEventId(UUID userId, UUID eventId);
    Optional<GoogleEventMap> findByUserIdAndGoogleEventId(UUID userId, String googleEventId);
}
