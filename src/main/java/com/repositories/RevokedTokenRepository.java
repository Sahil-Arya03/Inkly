package com.repositories;

import com.entities.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    /** Prunes rows for tokens that have expired on their own. */
    @Transactional
    void deleteByExpiresAtBefore(Instant cutoff);
}
