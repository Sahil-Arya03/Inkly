package com.calendar.dto;

import java.util.List;

/** Raw result of a Google Calendar incremental/full pull. */
public record GoogleSyncResult(
    List<com.google.api.services.calendar.model.Event> events,
    String newSyncToken
) {}
