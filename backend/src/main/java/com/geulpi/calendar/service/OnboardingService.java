package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.dto.OnboardingInput;
import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.repository.UserRepository;
import com.geulpi.calendar.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OnboardingService {
    
    private final UserService userService;
    private final UserRepository userRepository;
    private final OAuth2TokenService oauth2TokenService;
    private final CalendarSyncService calendarSyncService;
    private final CalendarAnalysisService calendarAnalysisService;
    private final LifePhilosophyAnalysisService lifePhilosophyAnalysisService;
    private final EventRepository eventRepository;
    
    @Transactional
    public User completeOnboarding(OnboardingInput input) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            log.info("Starting onboarding for user {}", userId);
            
            // Step 1: Save Google OAuth tokens
            saveGoogleTokens(user, input.getGoogleTokens());
            
            // Step 2: Create and save life philosophy
            user = userService.updateLifePhilosophy(input.getLifePhilosophy());
            
            // Step 3: Update user preferences
            updateUserPreferences(user, input.getPreferences());
            
            // Step 4: Sync existing Google Calendar data
            int syncedEvents = syncGoogleCalendarData(userId);
            log.info("Synced {} events from Google Calendar", syncedEvents);
            
            // Step 5: Analyze calendar data and generate patterns
            if (syncedEvents > 0) {
                analyzeAndGeneratePatterns(user);
            }
            
            // Step 6: Mark onboarding as completed
            user.setOnboardingCompleted(true);
            user = userRepository.save(user);
            
            log.info("Onboarding completed successfully for user {}", userId);
            
            return user;
            
        } catch (Exception e) {
            log.error("Error during onboarding: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to complete onboarding", e);
        }
    }
    
    private void saveGoogleTokens(User user, com.geulpi.calendar.dto.GoogleTokensInput tokens) {
        log.info("Saving Google OAuth tokens for user {}", user.getId());
        
        OAuth2Token oauth2Token = oauth2TokenService.getTokenByUserAndProvider(user.getId(), "google")
                .orElse(OAuth2Token.builder()
                        .user(user)
                        .provider("google")
                        .build());
        
        oauth2Token.setAccessToken(tokens.getAccessToken());
        oauth2Token.setRefreshToken(tokens.getRefreshToken());
        oauth2Token.setTokenType("Bearer");
        oauth2Token.setScope("https://www.googleapis.com/auth/calendar email profile");
        
        // Assume token expires in 1 hour if not specified
        oauth2Token.setExpiresAt(LocalDateTime.now().plusHours(1));
        
        oauth2TokenService.saveOrUpdateOAuth2Token(oauth2Token);
    }
    
    private void updateUserPreferences(User user, com.geulpi.calendar.dto.PreferencesInput preferencesInput) {
        log.info("Updating preferences for user {}", user.getId());
        
        UserPreferences preferences = user.getPreferences();
        if (preferences == null) {
            preferences = UserPreferences.builder()
                    .user(user)
                    .build();
            user.setPreferences(preferences);
        }
        
        // Update working hours
        if (preferencesInput.getWorkingHours() != null) {
            WorkingHours workingHours = WorkingHours.builder()
                    .start(preferencesInput.getWorkingHours().getStart())
                    .end(preferencesInput.getWorkingHours().getEnd())
                    .timezone(preferencesInput.getWorkingHours().getTimezone())
                    .build();
            preferences.setWorkingHours(workingHours);
        }
        
        // Update notification preferences
        if (preferencesInput.getNotifications() != null) {
            NotificationPreferences notifications = NotificationPreferences.builder()
                    .suggestions(preferencesInput.getNotifications().getSuggestions())
                    .insights(preferencesInput.getNotifications().getInsights())
                    .reminders(preferencesInput.getNotifications().getReminders())
                    .reminderMinutesBefore(preferencesInput.getNotifications().getReminderMinutesBefore())
                    .build();
            preferences.setNotifications(notifications);
        }
        
        // Update AI preferences
        if (preferencesInput.getAiAssistance() != null) {
            AIPreferences aiPreferences = AIPreferences.builder()
                    .proactivityLevel(preferencesInput.getAiAssistance().getProactivityLevel())
                    .autoScheduling(preferencesInput.getAiAssistance().getAutoScheduling())
                    .autoClassification(preferencesInput.getAiAssistance().getAutoClassification())
                    .build();
            preferences.setAiAssistance(aiPreferences);
        }
        
        // Update other preferences
        if (preferencesInput.getDefaultEventDuration() != null) {
            preferences.setDefaultEventDuration(preferencesInput.getDefaultEventDuration());
        }
        if (preferencesInput.getBufferTime() != null) {
            preferences.setBufferTime(preferencesInput.getBufferTime());
        }
        
        userRepository.save(user);
    }
    
    private int syncGoogleCalendarData(String userId) {
        try {
            // Sync last 3 months and next 3 months of calendar data
            LocalDateTime startDate = LocalDateTime.now().minusMonths(3);
            LocalDateTime endDate = LocalDateTime.now().plusMonths(3);
            
            return calendarSyncService.syncGoogleCalendarEvents(userId, startDate, endDate);
            
        } catch (Exception e) {
            log.warn("Failed to sync Google Calendar during onboarding: {}", e.getMessage());
            // Don't fail onboarding if calendar sync fails
            return 0;
        }
    }
    
    private void analyzeAndGeneratePatterns(User user) {
        try {
            log.info("Analyzing calendar data for user {}", user.getId());
            
            // Analyze last 3 months of data
            LocalDateTime startDate = LocalDateTime.now().minusMonths(3);
            LocalDateTime endDate = LocalDateTime.now();
            
            List<Pattern> patterns = calendarAnalysisService.analyzeCalendarData(user, startDate, endDate);
            
            log.info("Generated {} patterns for user {}", patterns.size(), user.getId());
            
            // Analyze life philosophy based on patterns and events
            if (!patterns.isEmpty()) {
                List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                        user.getId(), startDate, endDate);
                
                lifePhilosophyAnalysisService.analyzeAndSuggestLifeAreas(user, patterns, events);
                log.info("Completed life philosophy analysis for user {}", user.getId());
            }
            
        } catch (Exception e) {
            log.warn("Failed to analyze calendar patterns during onboarding: {}", e.getMessage());
            // Don't fail onboarding if pattern analysis fails
        }
    }
}