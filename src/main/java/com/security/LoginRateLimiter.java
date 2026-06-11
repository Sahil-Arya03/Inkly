package com.security;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force protection for the credential endpoints, keyed on
 * both client IP and submitted username so neither a single IP hammering
 * many accounts nor many IPs hammering one account goes unchecked.
 *
 * Rules:
 * - {@value #MAX_CONSECUTIVE_FAILURES} consecutive failures on a key locks
 *   it temporarily; repeated locks back off exponentially
 *   ({@link #BASE_LOCK} doubling up to {@link #MAX_LOCK}).
 * - Independent per-minute cap on total attempts per key, successful or not.
 * - A successful login clears the failure state for its keys.
 *
 * NOTE: this limiter is per-instance. When the app scales beyond one node,
 * swap the map for a shared store (e.g. Redis-backed buckets / Bucket4j with
 * a distributed proxy manager).
 */
@Component
public class LoginRateLimiter {

    static final int MAX_CONSECUTIVE_FAILURES = 5;
    static final int MAX_ATTEMPTS_PER_MINUTE = 20;
    static final Duration BASE_LOCK = Duration.ofSeconds(30);
    static final Duration MAX_LOCK = Duration.ofMinutes(15);
    private static final int SWEEP_THRESHOLD = 10_000;
    private static final Duration STALE_AFTER = Duration.ofHours(1);

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginRateLimiter() {
        this(Clock.systemUTC());
    }

    LoginRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * Registers an attempt for the IP (and username, if given) and throws
     * {@link RateLimitExceededException} when either key is locked or over
     * the per-minute cap. Call before checking credentials.
     */
    public void checkAttempt(String ip, String username) {
        sweepIfLarge();
        Instant now = clock.instant();
        checkKey(ipKey(ip), now);
        if (username != null && !username.isBlank()) {
            checkKey(userKey(username), now);
        }
    }

    /** Records a failed credential check (unknown user counts the same). */
    public void recordFailure(String ip, String username) {
        Instant now = clock.instant();
        failKey(ipKey(ip), now);
        if (username != null && !username.isBlank()) {
            failKey(userKey(username), now);
        }
    }

    /** Clears failure/lock state after a successful login. */
    public void recordSuccess(String ip, String username) {
        entries.remove(ipKey(ip));
        if (username != null && !username.isBlank()) {
            entries.remove(userKey(username));
        }
    }

    // ------------------------------------------------------------------

    private void checkKey(String key, Instant now) {
        Entry e = entries.computeIfAbsent(key, k -> new Entry());
        synchronized (e) {
            e.lastSeen = now;
            if (e.lockedUntil != null && now.isBefore(e.lockedUntil)) {
                throw new RateLimitExceededException(secondsUntil(now, e.lockedUntil));
            }
            while (!e.attempts.isEmpty()
                    && e.attempts.peekFirst().isBefore(now.minusSeconds(60))) {
                e.attempts.pollFirst();
            }
            if (e.attempts.size() >= MAX_ATTEMPTS_PER_MINUTE) {
                Instant oldest = e.attempts.peekFirst();
                throw new RateLimitExceededException(secondsUntil(now, oldest.plusSeconds(60)));
            }
            e.attempts.addLast(now);
        }
    }

    private void failKey(String key, Instant now) {
        Entry e = entries.computeIfAbsent(key, k -> new Entry());
        synchronized (e) {
            e.lastSeen = now;
            e.consecutiveFailures++;
            if (e.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                e.lockCount++;
                long factor = 1L << Math.min(e.lockCount - 1, 5); // 30s, 1m, 2m, 4m, 8m, 16m→cap
                Duration lock = BASE_LOCK.multipliedBy(factor);
                if (lock.compareTo(MAX_LOCK) > 0) {
                    lock = MAX_LOCK;
                }
                e.lockedUntil = now.plus(lock);
                e.consecutiveFailures = 0;
            }
        }
    }

    private void sweepIfLarge() {
        if (entries.size() <= SWEEP_THRESHOLD) {
            return;
        }
        Instant cutoff = clock.instant().minus(STALE_AFTER);
        entries.entrySet().removeIf(en -> {
            Entry e = en.getValue();
            synchronized (e) {
                return e.lastSeen.isBefore(cutoff)
                        && (e.lockedUntil == null || e.lockedUntil.isBefore(cutoff));
            }
        });
    }

    private static long secondsUntil(Instant now, Instant until) {
        return Math.max(1, Duration.between(now, until).getSeconds() + 1);
    }

    private static String ipKey(String ip) {
        return "ip:" + (ip == null ? "?" : ip);
    }

    private static String userKey(String username) {
        return "user:" + username.trim().toLowerCase();
    }

    private static class Entry {
        int consecutiveFailures;
        int lockCount;
        Instant lockedUntil;
        Instant lastSeen = Instant.EPOCH;
        final Deque<Instant> attempts = new ArrayDeque<>();
    }

    /** Mapped to 429 + Retry-After; the body must not reveal account state. */
    public static class RateLimitExceededException extends RuntimeException {
        private final long retryAfterSeconds;

        public RateLimitExceededException(long retryAfterSeconds) {
            super("Too many attempts");
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public long getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
