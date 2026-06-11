package com.calendar.dto;

import java.time.Instant;

public record ConnectionStatusDto(
    boolean connected,
    String googleEmail,
    Instant lastSyncedAt
) {}
