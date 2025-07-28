package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.SuggestionStatus;
import com.geulpi.calendar.domain.enums.SuggestionType;
import com.geulpi.calendar.dto.SuggestionContext;
import com.geulpi.calendar.repository.SuggestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuggestionServiceTest {
    
    @Mock
    private SuggestionRepository suggestionRepository;
    
    @Mock
    private UserService userService;
    
    @InjectMocks
    private SuggestionService suggestionService;
    
    private User testUser;
    private List<Suggestion> testSuggestions;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        
        Suggestion suggestion1 = Suggestion.builder()
                .id("suggestion-1")
                .user(testUser)
                .type(SuggestionType.SCHEDULE_OPTIMIZATION)
                .status(SuggestionStatus.PENDING)
                .title("Optimize morning schedule")
                .description("Consider starting work earlier")
                .reasoning("High confidence optimization")
                .priority(com.geulpi.calendar.domain.enums.Priority.HIGH)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        
        Suggestion suggestion2 = Suggestion.builder()
                .id("suggestion-2")
                .user(testUser)
                .type(SuggestionType.NEW_EVENT)
                .status(SuggestionStatus.PENDING)
                .title("Add exercise time")
                .description("Schedule 30 minutes for exercise")
                .reasoning("Very high confidence suggestion")
                .priority(com.geulpi.calendar.domain.enums.Priority.HIGH)
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();
        
        testSuggestions = Arrays.asList(suggestion1, suggestion2);
    }
    
    @Test
    void getSuggestions_ReturnsActivePendingSuggestions() {
        SuggestionContext context = new SuggestionContext();
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(suggestionRepository.findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                any(LocalDateTime.class)))
                .thenReturn(testSuggestions);
        
        List<Suggestion> result = suggestionService.getSuggestions(context);
        
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyElementsOf(testSuggestions);
        assertThat(result.get(0).getStatus()).isEqualTo(SuggestionStatus.PENDING);
        assertThat(result.get(1).getStatus()).isEqualTo(SuggestionStatus.PENDING);
        
        verify(userService).getCurrentUser();
        verify(suggestionRepository).findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                any(LocalDateTime.class));
    }
    
    @Test
    void getSuggestions_WhenNoActiveSuggestions_ReturnsEmptyList() {
        SuggestionContext context = new SuggestionContext();
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(suggestionRepository.findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                any(LocalDateTime.class)))
                .thenReturn(Arrays.asList());
        
        List<Suggestion> result = suggestionService.getSuggestions(context);
        
        assertThat(result).isEmpty();
        
        verify(userService).getCurrentUser();
        verify(suggestionRepository).findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                any(LocalDateTime.class));
    }
    
    @Test
    void acceptSuggestion_CurrentlyReturnsNull() {
        // This test verifies the current TODO implementation
        // Should be updated when the actual implementation is added
        
        var result = suggestionService.acceptSuggestion("suggestion-1");
        
        assertThat(result).isNull();
    }
    
    @Test
    void rejectSuggestion_CurrentlyReturnsTrue() {
        // This test verifies the current TODO implementation
        // Should be updated when the actual implementation is added
        
        Boolean result = suggestionService.rejectSuggestion("suggestion-1", "Not interested");
        
        assertThat(result).isTrue();
    }
    
    @Test
    void batchAcceptSuggestions_CurrentlyReturnsEmptyList() {
        // This test verifies the current TODO implementation
        // Should be updated when the actual implementation is added
        
        List<String> suggestionIds = Arrays.asList("suggestion-1", "suggestion-2");
        var result = suggestionService.batchAcceptSuggestions(suggestionIds);
        
        assertThat(result).isEmpty();
    }
    
    @Test
    void getSuggestions_FiltersExpiredSuggestions() {
        // This test verifies that the repository method is called with current time
        // ensuring expired suggestions are filtered out
        
        SuggestionContext context = new SuggestionContext();
        LocalDateTime beforeCall = LocalDateTime.now().minusSeconds(1);
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(suggestionRepository.findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                any(LocalDateTime.class)))
                .thenReturn(testSuggestions);
        
        suggestionService.getSuggestions(context);
        
        verify(suggestionRepository).findByUserIdAndStatusAndExpiresAtAfter(
                eq(testUser.getId()), 
                eq(SuggestionStatus.PENDING), 
                argThat(dateTime -> dateTime.isAfter(beforeCall)));
    }
}