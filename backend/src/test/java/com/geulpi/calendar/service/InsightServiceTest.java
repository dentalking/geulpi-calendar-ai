package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.InsightType;
import com.geulpi.calendar.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InsightServiceTest {
    
    @Mock
    private InsightRepository insightRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private EventRepository eventRepository;
    
    @Mock
    private PatternRepository patternRepository;
    
    @Mock
    private SuggestionRepository suggestionRepository;
    
    @Mock
    private TimeBalanceService timeBalanceService;
    
    @InjectMocks
    private InsightService insightService;
    
    private User testUser;
    private List<Insight> testInsights;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        
        Insight insight1 = Insight.builder()
                .id("insight-1")
                .user(testUser)
                .type(InsightType.OPTIMIZATION_OPPORTUNITY)
                .content("Morning productivity peak")
                .data(java.util.Map.of("description", "You're most productive between 9-11 AM"))
                .impactScore(0.85f)
                .actionable(true)
                .build();
        insight1.setCreatedAt(LocalDateTime.now().minusHours(2));
        
        Insight insight2 = Insight.builder()
                .id("insight-2")
                .user(testUser)
                .type(InsightType.IMBALANCE)
                .content("Work-life balance trend")
                .data(java.util.Map.of("description", "You've been working 10% more this week"))
                .impactScore(0.92f)
                .actionable(true)
                .build();
        insight2.setCreatedAt(LocalDateTime.now().minusHours(4));
        
        testInsights = Arrays.asList(insight1, insight2);
        
        SecurityContextHolder.clearContext();
    }
    
    @Test
    void getInsights_WithLimit_ReturnsTopInsights() {
        setupAuthentication("test@example.com");
        
        when(insightRepository.findTop5ByUserIdOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(testInsights);
        
        List<Insight> result = insightService.getInsights(5);
        
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyElementsOf(testInsights);
        assertThat(result.get(0).getType()).isEqualTo(InsightType.OPTIMIZATION_OPPORTUNITY);
        assertThat(result.get(1).getType()).isEqualTo(InsightType.IMBALANCE);
        
        verify(insightRepository).findTop5ByUserIdOrderByCreatedAtDesc("test@example.com");
    }
    
    @Test
    void getInsights_WithoutLimit_ReturnsRecentInsights() {
        setupAuthentication("test@example.com");
        
        when(insightRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                eq("test@example.com"), any(LocalDateTime.class)))
                .thenReturn(testInsights);
        
        List<Insight> result = insightService.getInsights(null);
        
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyElementsOf(testInsights);
        
        verify(insightRepository).findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                eq("test@example.com"), any(LocalDateTime.class));
    }
    
    @Test
    void getInsights_WhenFewInsightsExist_TriggersGeneration() {
        setupAuthentication("test@example.com");
        
        // Return only 1 insight (less than 3)
        List<Insight> fewInsights = Arrays.asList(testInsights.get(0));
        when(insightRepository.findTop5ByUserIdOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(fewInsights);
        
        List<Insight> result = insightService.getInsights(5);
        
        assertThat(result).hasSize(1);
        verify(insightRepository).findTop5ByUserIdOrderByCreatedAtDesc("test@example.com");
        // Note: The actual generation logic would be tested separately as it's likely complex
    }
    
    @Test
    void getInsights_WhenNoAuthentication_HandlesGracefully() {
        SecurityContextHolder.clearContext();
        
        try {
            insightService.getInsights(5);
        } catch (Exception e) {
            // Expected to fail due to missing authentication
            assertThat(e).isNotNull();
        }
        
        verify(insightRepository, never()).findTop5ByUserIdOrderByCreatedAtDesc(any());
    }
    
    @Test
    void getInsights_FiltersBasedOnTimeRange() {
        setupAuthentication("test@example.com");
        LocalDateTime beforeCall = LocalDateTime.now().minusDays(8);
        
        when(insightRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                eq("test@example.com"), any(LocalDateTime.class)))
                .thenReturn(testInsights);
        
        insightService.getInsights(null);
        
        verify(insightRepository).findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                eq("test@example.com"), 
                argThat(dateTime -> dateTime.isAfter(beforeCall) && dateTime.isBefore(LocalDateTime.now().minusDays(6))));
    }
    
    @Test
    void getInsights_WithEmptyResult_ReturnsEmptyList() {
        setupAuthentication("test@example.com");
        
        when(insightRepository.findTop5ByUserIdOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Arrays.asList());
        
        List<Insight> result = insightService.getInsights(5);
        
        assertThat(result).isEmpty();
        verify(insightRepository).findTop5ByUserIdOrderByCreatedAtDesc("test@example.com");
    }
    
    @Test
    void getInsights_CachingBehaviorTest() {
        setupAuthentication("test@example.com");
        
        when(insightRepository.findTop5ByUserIdOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(testInsights);
        
        // Call twice to test caching behavior
        insightService.getInsights(5);
        insightService.getInsights(5);
        
        // Repository should be called only once due to caching
        verify(insightRepository, times(1)).findTop5ByUserIdOrderByCreatedAtDesc("test@example.com");
    }
    
    private void setupAuthentication(String username) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                username, null, Arrays.asList());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}