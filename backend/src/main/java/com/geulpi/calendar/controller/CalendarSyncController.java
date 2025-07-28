package com.geulpi.calendar.controller;

import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.service.CalendarSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@Slf4j
public class CalendarSyncController {
    
    private final CalendarSyncService calendarSyncService;
    
    @PostMapping("/sync/google")
    public ResponseEntity<?> syncGoogleCalendar(
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate) {
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            // Default to sync last 30 days and next 30 days if dates not provided
            if (startDate == null) {
                startDate = LocalDateTime.now().minusDays(30);
            }
            if (endDate == null) {
                endDate = LocalDateTime.now().plusDays(30);
            }
            
            int syncedEvents = calendarSyncService.syncGoogleCalendarEvents(userId, startDate, endDate);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Google Calendar events synced successfully",
                    "syncedEvents", syncedEvents
            ));
            
        } catch (Exception e) {
            log.error("Failed to sync Google Calendar events: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to sync calendar events: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/sync/status")
    public ResponseEntity<?> getSyncStatus() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            boolean hasValidToken = calendarSyncService.hasValidGoogleToken(userId);
            
            return ResponseEntity.ok(Map.of(
                    "hasValidToken", hasValidToken,
                    "canSync", hasValidToken
            ));
            
        } catch (Exception e) {
            log.error("Failed to get sync status: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to get sync status: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/authorize/google")
    public ResponseEntity<?> authorizeGoogleCalendar(@RequestParam String accessToken,
                                                    @RequestParam(required = false) String refreshToken,
                                                    @RequestParam(required = false) Long expiresIn) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            calendarSyncService.storeGoogleToken(userId, accessToken, refreshToken, expiresIn);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Google Calendar authorization successful"
            ));
            
        } catch (Exception e) {
            log.error("Failed to store Google token: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to authorize Google Calendar: " + e.getMessage()
            ));
        }
    }
}