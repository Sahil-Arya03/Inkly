package com.calendar.service;

import com.calendar.domain.GoogleCalendarLink;
import com.calendar.dto.CalendarEventDto;
import com.calendar.dto.GoogleSyncResult;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Thin wrapper over the official Google Calendar v3 client. Each call builds a
 * short-lived {@link Calendar} instance from the user's freshly-refreshed
 * access token.
 */
@Service
@Slf4j
public class GoogleCalendarService {

    private final GoogleOAuthService oauthService;
    private final NetHttpTransport httpTransport;
    private final GsonFactory jsonFactory;

    @Value("${calendar.sync.initial-lookback-days:30}")
    private int lookbackDays;

    public GoogleCalendarService(GoogleOAuthService oauthService,
                                 NetHttpTransport httpTransport,
                                 GsonFactory jsonFactory) {
        this.oauthService = oauthService;
        this.httpTransport = httpTransport;
        this.jsonFactory = jsonFactory;
    }

    private Calendar buildCalendarClient(GoogleCalendarLink link) throws IOException {
        GoogleCalendarLink fresh = oauthService.refreshAccessTokenIfNeeded(link);
        String accessToken = fresh.getAccessToken();
        HttpRequestInitializer init = request ->
                request.getHeaders().setAuthorization("Bearer " + accessToken);
        return new Calendar.Builder(httpTransport, jsonFactory, init)
                .setApplicationName("Inkly")
                .build();
    }

    /** Inserts a new event into the user's calendar; returns the Google event id. */
    public String createEvent(GoogleCalendarLink link, CalendarEventDto dto) throws IOException {
        Calendar client = buildCalendarClient(link);
        Event created = client.events().insert(link.getCalendarId(), toGoogleEvent(dto)).execute();
        return created.getId();
    }

    /** Patches only the fields Inkly manages (summary, description, start, end). */
    public void updateEvent(GoogleCalendarLink link, String googleEventId, CalendarEventDto dto)
            throws IOException {
        Calendar client = buildCalendarClient(link);
        Event patch = new Event()
                .setSummary(dto.title())
                .setDescription(dto.description());
        applySchedule(patch, dto);
        client.events().patch(link.getCalendarId(), googleEventId, patch).execute();
    }

    /** Deletes an event; a 404 (already gone) is treated as success. */
    public void deleteEvent(GoogleCalendarLink link, String googleEventId) throws IOException {
        Calendar client = buildCalendarClient(link);
        try {
            client.events().delete(link.getCalendarId(), googleEventId).execute();
        } catch (GoogleJsonResponseException e) {
            if (e.getStatusCode() == 404 || e.getStatusCode() == 410) {
                log.debug("Google event {} already gone (status {})", googleEventId, e.getStatusCode());
                return;
            }
            throw e;
        }
    }

    /**
     * Pulls changes since the stored sync token (incremental) or, on first run /
     * after a 410, a full window back {@code lookbackDays}. Pages through results.
     */
    public GoogleSyncResult fetchChanges(GoogleCalendarLink link) throws IOException {
        Calendar client = buildCalendarClient(link);
        List<Event> all = new ArrayList<>();
        String syncToken = link.getSyncToken();
        String pageToken = null;
        String newSyncToken = null;

        do {
            Calendar.Events.List request = client.events().list(link.getCalendarId());
            if (syncToken != null) {
                request.setSyncToken(syncToken);
            } else {
                request.setTimeMin(new DateTime(
                        Date.from(Instant.now().minus(lookbackDays, ChronoUnit.DAYS))));
                request.setMaxResults(250).setSingleEvents(true).setOrderBy("startTime");
            }
            if (pageToken != null) {
                request.setPageToken(pageToken);
            }

            Events events;
            try {
                events = request.execute();
            } catch (GoogleJsonResponseException e) {
                if (e.getStatusCode() == 410) {
                    // Sync token expired — drop it and restart a full pull.
                    log.info("Google sync token expired for {}, doing full pull", link.getGoogleEmail());
                    link.setSyncToken(null);
                    syncToken = null;
                    pageToken = null;
                    all.clear();
                    continue;
                }
                throw e;
            }

            if (events.getItems() != null) {
                all.addAll(events.getItems());
            }
            newSyncToken = events.getNextSyncToken();
            pageToken = events.getNextPageToken();
        } while (pageToken != null);

        return new GoogleSyncResult(all, newSyncToken);
    }

    // ------------------------------------------------------------------
    // mapping helpers
    // ------------------------------------------------------------------

    private Event toGoogleEvent(CalendarEventDto dto) {
        Event event = new Event()
                .setSummary(dto.title())
                .setDescription(dto.description())
                .setLocation(dto.location());
        applySchedule(event, dto);
        return event;
    }

    private void applySchedule(Event event, CalendarEventDto dto) {
        if (dto.allDay()) {
            event.setStart(new EventDateTime().setDate(new DateTime(true, dto.startsAt().toEpochMilli(), 0)));
            event.setEnd(new EventDateTime().setDate(new DateTime(true, dto.endsAt().toEpochMilli(), 0)));
        } else {
            event.setStart(new EventDateTime()
                    .setDateTime(new DateTime(Date.from(dto.startsAt())))
                    .setTimeZone("UTC"));
            event.setEnd(new EventDateTime()
                    .setDateTime(new DateTime(Date.from(dto.endsAt())))
                    .setTimeZone("UTC"));
        }
    }
}
