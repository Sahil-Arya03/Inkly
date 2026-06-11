package com.calendar.repository;

import com.calendar.domain.OAuthState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface OAuthStateRepository extends JpaRepository<OAuthState, String> {

    /** Opportunistic cleanup of states that can no longer be redeemed. */
    @Transactional
    void deleteByCreatedAtBefore(Instant cutoff);
}
