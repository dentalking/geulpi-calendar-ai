package com.geulpi.calendar.util;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.domain.enums.*;
import static com.geulpi.calendar.domain.enums.Priority.*;

import java.time.LocalDateTime;
import java.util.Arrays;

public class TestDataFactory {
    
    public static User createTestUser() {
        return User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
    }
    
    public static User createTestUser(String email, String name) {
        return User.builder()
                .email(email)
                .name(name)
                .onboardingCompleted(true)
                .build();
    }
    
    public static LifePhilosophy createTestLifePhilosophy(User user) {
        return LifePhilosophy.builder()
                .user(user)
                .idealBalance(java.util.Map.of("work", 60, "personal", 40))
                .build();
    }
    
    public static LifeArea createTestLifeArea(LifePhilosophy philosophy, String name) {
        return LifeArea.builder()
                .name(name)
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(philosophy)
                .build();
    }
    
    public static Event createTestEvent(User user, LifeArea area) {
        return Event.builder()
                .user(user)
                .title("Test Event")
                .description("Test Description")
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                .area(area)
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
    }
    
    public static Event createTestEvent(User user, LifeArea area, String title, LocalDateTime startTime) {
        return Event.builder()
                .user(user)
                .title(title)
                .description("Test Description")
                .startTime(startTime)
                .endTime(startTime.plusHours(1))
                .area(area)
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
    }
    
    public static Suggestion createTestSuggestion(User user) {
        return Suggestion.builder()
                .user(user)
                .type(SuggestionType.NEW_EVENT)
                .status(SuggestionStatus.PENDING)
                .title("Test Suggestion")
                .description("Test suggestion description")
                .reasoning("Test suggestion reasoning")
                .priority(Priority.MEDIUM)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
    }
    
    public static Insight createTestInsight(User user) {
        return Insight.builder()
                .user(user)
                .type(InsightType.OPTIMIZATION_OPPORTUNITY)
                .content("Test Insight")
                .data(java.util.Map.of("description", "Test insight description"))
                .impactScore(0.9f)
                .actionable(true)
                .build();
    }
    
    public static Pattern createTestPattern(User user) {
        Pattern pattern = Pattern.builder()
                .user(user)
                .name("Test Pattern")
                .description("Test pattern description")
                .frequency(5.0f)
                .confidence(0.85f)
                .build();
        
        TimeSlot timeSlot = TimeSlot.builder()
                .start(LocalDateTime.now().withHour(9).withMinute(0))
                .end(LocalDateTime.now().withHour(10).withMinute(0))
                .available(true)
                .build();
        
        pattern.setTimeSlots(Arrays.asList(timeSlot));
        return pattern;
    }
    
    public static OAuth2Token createTestOAuth2Token(User user, String provider) {
        return OAuth2Token.builder()
                .user(user)
                .provider(provider)
                .accessToken("test-access-token")
                .refreshToken("test-refresh-token")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .scope("email profile calendar")
                .build();
    }
    
    public static UserPreferences createTestUserPreferences(User user) {
        return UserPreferences.builder()
                .user(user)
                .defaultEventDuration(60)
                .bufferTime(15)
                .build();
    }
}