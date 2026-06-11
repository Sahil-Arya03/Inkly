package com.security;

import com.entities.RevokedToken;
import com.repositories.RevokedTokenRepository;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;

/**
 * JWT denylist. Logout records the token's jti here; {@link JwtAuthFilter}
 * rejects any token whose jti is present, so a stolen cookie dies with the
 * session instead of living out its full expiry.
 */
@Service
@Slf4j
public class TokenRevocationService {

    private final RevokedTokenRepository revokedTokens;
    private final JwtUtil jwtUtil;

    public TokenRevocationService(RevokedTokenRepository revokedTokens, JwtUtil jwtUtil) {
        this.revokedTokens = revokedTokens;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Denylists the given token until its natural expiry. Invalid or
     * jti-less tokens are ignored (nothing redeemable to revoke).
     */
    @Transactional
    public void revoke(String token) {
        String jti;
        Date expiration;
        try {
            jti = jwtUtil.extractJti(token);
            expiration = jwtUtil.extractExpiration(token);
        } catch (JwtException e) {
            return; // not a valid token — nothing to revoke
        }
        if (jti == null || expiration == null) {
            return;
        }
        // Opportunistic prune: rows for naturally-expired tokens are dead weight.
        revokedTokens.deleteByExpiresAtBefore(Instant.now());
        if (!revokedTokens.existsById(jti)) {
            revokedTokens.save(new RevokedToken(jti, expiration.toInstant(), Instant.now()));
        }
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String jti) {
        return revokedTokens.existsById(jti);
    }
}
