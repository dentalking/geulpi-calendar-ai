package com.geulpi.calendar.external;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.OAuth2TokenRepository;
import com.google.api.client.auth.oauth2.BearerToken;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.CalendarList;
import com.google.api.services.calendar.model.CalendarListEntry;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleCalendarClient {
    
    private static final String APPLICATION_NAME = "Geulpi Calendar";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    
    private final OAuth2TokenRepository oauth2TokenRepository;
    
    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;
    
    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;
    
    public Calendar getCalendarService(User user) throws GeneralSecurityException, IOException {
        OAuth2Token token = oauth2TokenRepository.findByUserIdAndProvider(user.getId(), "google")
                .orElseThrow(() -> new IllegalStateException("Google OAuth2 token not found for user"));
        
        // Check if token is expired and refresh if needed
        if (token.isExpired() && token.getRefreshToken() != null) {
            refreshAccessToken(token);
        }
        
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        
        Credential credential = new Credential(BearerToken.authorizationHeaderAccessMethod())
                .setAccessToken(token.getAccessToken());
        
        return new Calendar.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }
    
    public List<Event> getUserCalendarEvents(User user, LocalDateTime startTime, LocalDateTime endTime) {
        try {
            Calendar service = getCalendarService(user);
            List<Event> allEvents = new ArrayList<>();
            
            // Get user's calendar list
            CalendarList calendarList = service.calendarList().list().execute();
            List<CalendarListEntry> calendars = calendarList.getItems();
            
            if (calendars != null) {
                for (CalendarListEntry calendarEntry : calendars) {
                    String calendarId = calendarEntry.getId();
                    
                    // Skip calendars that are hidden or not selected
                    if (calendarEntry.getSelected() == null || !calendarEntry.getSelected()) {
                        continue;
                    }
                    
                    try {
                        Events events = service.events().list(calendarId)
                                .setTimeMin(new DateTime(startTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()))
                                .setTimeMax(new DateTime(endTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()))
                                .setOrderBy("startTime")
                                .setSingleEvents(true)
                                .setMaxResults(1000)
                                .execute();
                        
                        List<Event> items = events.getItems();
                        if (items != null) {
                            allEvents.addAll(items);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to fetch events from calendar {}: {}", calendarId, e.getMessage());
                    }
                }
            }
            
            return allEvents;
            
        } catch (Exception e) {
            log.error("Failed to fetch calendar events for user {}: {}", user.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to fetch calendar events", e);
        }
    }
    
    @Transactional
    private void refreshAccessToken(OAuth2Token token) throws IOException {
        try {
            GoogleTokenResponse tokenResponse = new GoogleRefreshTokenRequest(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JSON_FACTORY,
                    token.getRefreshToken(),
                    clientId,
                    clientSecret
            ).execute();
            
            token.setAccessToken(tokenResponse.getAccessToken());
            
            if (tokenResponse.getExpiresInSeconds() != null) {
                token.setExpiresAt(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresInSeconds()));
            }
            
            // Update refresh token if provided
            if (tokenResponse.getRefreshToken() != null) {
                token.setRefreshToken(tokenResponse.getRefreshToken());
            }
            
            oauth2TokenRepository.save(token);
            
            log.info("Successfully refreshed access token for user {}", token.getUser().getId());
            
        } catch (Exception e) {
            log.error("Failed to refresh access token for user {}: {}", token.getUser().getId(), e.getMessage(), e);
            throw new IOException("Failed to refresh access token", e);
        }
    }
    
    public List<CalendarListEntry> getUserCalendars(User user) {
        try {
            Calendar service = getCalendarService(user);
            CalendarList calendarList = service.calendarList().list().execute();
            return calendarList.getItems();
        } catch (Exception e) {
            log.error("Failed to fetch calendars for user {}: {}", user.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to fetch calendars", e);
        }
    }
}