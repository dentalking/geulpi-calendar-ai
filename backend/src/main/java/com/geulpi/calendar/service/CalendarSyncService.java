package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.external.GoogleCalendarClient;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarSyncService {
    
    private final GoogleCalendarClient googleCalendarClient;
    private final GoogleCalendarEventConverter eventConverter;
    private final OAuth2TokenService oauth2TokenService;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    
    @Transactional
    public int syncGoogleCalendarEvents(String userId, LocalDateTime startDate, LocalDateTime endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        // Check if user has valid Google token
        if (!hasValidGoogleToken(userId)) {
            throw new IllegalStateException("User does not have valid Google Calendar authorization");
        }
        
        try {
            // Fetch events from Google Calendar
            List<com.google.api.services.calendar.model.Event> googleEvents = 
                    googleCalendarClient.getUserCalendarEvents(user, startDate, endDate);
            
            log.info("Fetched {} events from Google Calendar for user {}", googleEvents.size(), userId);
            
            // Convert Google events to our Event entities
            List<Event> events = eventConverter.convertGoogleEventsToEvents(googleEvents, user);
            
            // Filter out events that already exist (based on googleEventId)
            List<Event> newEvents = events.stream()
                    .filter(event -> !eventRepository.existsByGoogleEventId(event.getGoogleEventId()))
                    .toList();
            
            log.info("Found {} new events to import for user {}", newEvents.size(), userId);
            
            // Save new events
            if (!newEvents.isEmpty()) {
                eventRepository.saveAll(newEvents);
                log.info("Successfully imported {} events for user {}", newEvents.size(), userId);
            }
            
            return newEvents.size();
            
        } catch (Exception e) {
            log.error("Failed to sync Google Calendar events for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to sync calendar events", e);
        }
    }
    
    public boolean hasValidGoogleToken(String userId) {
        return oauth2TokenService.hasValidToken(userId, "google");
    }
    
    @Transactional
    public void storeGoogleToken(String userId, String accessToken, String refreshToken, Long expiresIn) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        Optional<OAuth2Token> existingToken = oauth2TokenService.getTokenByUserAndProvider(userId, "google");
        
        OAuth2Token token;
        if (existingToken.isPresent()) {
            token = existingToken.get();
        } else {
            token = OAuth2Token.builder()
                    .user(user)
                    .provider("google")
                    .build();
        }
        
        token.setAccessToken(accessToken);
        token.setTokenType("Bearer");
        
        if (refreshToken != null) {
            token.setRefreshToken(refreshToken);
        }
        
        if (expiresIn != null) {
            token.setExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));
        }
        
        // Set the scope for Google Calendar
        token.setScope("https://www.googleapis.com/auth/calendar email profile");
        
        oauth2TokenService.saveOrUpdateOAuth2Token(token);
        
        log.info("Stored Google token for user {}", userId);
    }
    
    @Transactional(readOnly = true)
    public List<Event> getImportedGoogleEvents(String userId) {
        return eventRepository.findByUserIdAndGoogleEventIdIsNotNull(userId);
    }
    
    @Transactional
    public void removeGoogleCalendarSync(String userId) {
        oauth2TokenService.deleteTokenByUserAndProvider(userId, "google");
        
        // Optionally, you might want to delete imported events or mark them differently
        // For now, we'll keep the events but they won't be updated anymore
        
        log.info("Removed Google Calendar sync for user {}", userId);
    }
}