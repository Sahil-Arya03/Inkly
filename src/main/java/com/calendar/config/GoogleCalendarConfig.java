package com.calendar.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.CalendarScopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Wires the Google OAuth2 authorization-code flow and the shared HTTP/JSON
 * transports. We use Google's {@link GsonFactory} (not JacksonFactory) so no
 * Jackson 2.x is dragged onto the Spring Boot 4 (Jackson 3.x) classpath.
 */
@Configuration
public class GoogleCalendarConfig {

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    @Bean
    public NetHttpTransport httpTransport() throws Exception {
        return GoogleNetHttpTransport.newTrustedTransport();
    }

    @Bean
    public GsonFactory googleJsonFactory() {
        return GsonFactory.getDefaultInstance();
    }

    @Bean
    public GoogleAuthorizationCodeFlow googleAuthFlow(NetHttpTransport httpTransport,
                                                      GsonFactory googleJsonFactory) {
        // CALENDAR = full read/write/delete; openid+email so the callback's
        // id_token carries the connected Google address.
        List<String> scopes = List.of(CalendarScopes.CALENDAR, "openid", "email");
        return new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, googleJsonFactory, clientId, clientSecret, scopes)
                .setAccessType("offline")        // request a refresh token
                .setApprovalPrompt("force")      // always return a refresh token
                .build();
    }
}
