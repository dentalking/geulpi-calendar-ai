package com.geulpi.calendar.service;

import com.geulpi.calendar.dto.SyncResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {
    
    private final UserService userService;
    private final CalendarSyncService calendarSyncService;
    
    public SyncResult syncGoogleCalendar(String userId) {
        List<String> errors = new ArrayList<>();
        int eventsImported = 0;
        boolean success = false;
        
        try {
            // Check if user has valid Google token
            if (!calendarSyncService.hasValidGoogleToken(userId)) {
                errors.add("User does not have valid Google Calendar authorization");
                return SyncResult.builder()
                        .success(false)
                        .eventsImported(0)
                        .eventsUpdated(0)
                        .errors(errors)
                        .lastSyncAt(LocalDateTime.now())
                        .build();
            }
            
            // Sync events from last 30 days and next 90 days
            LocalDateTime startDate = LocalDateTime.now().minusDays(30);
            LocalDateTime endDate = LocalDateTime.now().plusDays(90);
            
            eventsImported = calendarSyncService.syncGoogleCalendarEvents(userId, startDate, endDate);
            success = true;
            
            log.info("Successfully synced {} Google Calendar events for user {}", eventsImported, userId);
            
        } catch (Exception e) {
            log.error("Failed to sync Google Calendar for user {}: {}", userId, e.getMessage(), e);
            errors.add("Failed to sync Google Calendar: " + e.getMessage());
        }
        
        return SyncResult.builder()
                .success(success)
                .eventsImported(eventsImported)
                .eventsUpdated(0) // Currently not tracking updates
                .errors(errors)
                .lastSyncAt(LocalDateTime.now())
                .build();
    }
    
    public SyncResult syncGoogleCalendar(String userId, LocalDateTime startDate, LocalDateTime endDate) {
        List<String> errors = new ArrayList<>();
        int eventsImported = 0;
        boolean success = false;
        
        try {
            // Check if user has valid Google token
            if (!calendarSyncService.hasValidGoogleToken(userId)) {
                errors.add("User does not have valid Google Calendar authorization");
                return SyncResult.builder()
                        .success(false)
                        .eventsImported(0)
                        .eventsUpdated(0)
                        .errors(errors)
                        .lastSyncAt(LocalDateTime.now())
                        .build();
            }
            
            eventsImported = calendarSyncService.syncGoogleCalendarEvents(userId, startDate, endDate);
            success = true;
            
            log.info("Successfully synced {} Google Calendar events for user {} from {} to {}", 
                    eventsImported, userId, startDate, endDate);
            
        } catch (Exception e) {
            log.error("Failed to sync Google Calendar for user {} from {} to {}: {}", 
                    userId, startDate, endDate, e.getMessage(), e);
            errors.add("Failed to sync Google Calendar: " + e.getMessage());
        }
        
        return SyncResult.builder()
                .success(success)
                .eventsImported(eventsImported)
                .eventsUpdated(0) // Currently not tracking updates
                .errors(errors)
                .lastSyncAt(LocalDateTime.now())
                .build();
    }
}