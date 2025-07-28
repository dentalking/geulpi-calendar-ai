package com.geulpi.calendar.resolver;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.dto.*;
import com.geulpi.calendar.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SimpleMutationResolverTest {

    @Mock
    private UserService userService;

    @Mock
    private EventService eventService;

    @Mock
    private AIService aiService;

    @Mock
    private SuggestionService suggestionService;

    @Mock
    private OnboardingService onboardingService;

    @Mock
    private SyncService syncService;

    @Mock
    private VoiceService voiceService;

    @InjectMocks
    private MutationResolver mutationResolver;

    private User testUser;
    private Event testEvent;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();

        testEvent = Event.builder()
                .id("test-event-id")
                .title("Test Event")
                .description("Test Description")
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                .user(testUser)
                .build();
    }

    @Test
    void updateProfile_Success() {
        // Given
        User updatedUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Updated User")
                .onboardingCompleted(true)
                .build();

        when(userService.updateProfile(any(UpdateProfileInput.class)))
                .thenReturn(updatedUser);

        // When
        UpdateProfileInput input = new UpdateProfileInput();
        input.setName("Updated User");
        User result = mutationResolver.updateProfile(input);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("test-user-id");
        assertThat(result.getName()).isEqualTo("Updated User");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void createEvent_Success() {
        // Given
        when(eventService.createEvent(any(CreateEventInput.class)))
                .thenReturn(testEvent);

        // When
        CreateEventInput input = new CreateEventInput();
        input.setTitle("Test Event");
        input.setDescription("Test Description");
        Event result = mutationResolver.createEvent(input);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("test-event-id");
        assertThat(result.getTitle()).isEqualTo("Test Event");
        assertThat(result.getDescription()).isEqualTo("Test Description");
    }

    @Test
    void updateEvent_Success() {
        // Given
        Event updatedEvent = Event.builder()
                .id("test-event-id")
                .title("Updated Event")
                .description("Updated Description")
                .startTime(testEvent.getStartTime())
                .endTime(testEvent.getEndTime())
                .user(testUser)
                .build();

        when(eventService.updateEvent(any(String.class), any(UpdateEventInput.class)))
                .thenReturn(updatedEvent);

        // When
        UpdateEventInput input = new UpdateEventInput();
        input.setTitle("Updated Event");
        input.setDescription("Updated Description");
        Event result = mutationResolver.updateEvent("test-event-id", input);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("test-event-id");
        assertThat(result.getTitle()).isEqualTo("Updated Event");
        assertThat(result.getDescription()).isEqualTo("Updated Description");
    }

    @Test
    void deleteEvent_Success() {
        // Given
        when(eventService.deleteEvent("test-event-id")).thenReturn(true);

        // When
        Boolean result = mutationResolver.deleteEvent("test-event-id");

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void acceptSuggestion_Success() {
        // Given
        when(suggestionService.acceptSuggestion("suggestion-id")).thenReturn(testEvent);

        // When
        Event result = mutationResolver.acceptSuggestion("suggestion-id");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("test-event-id");
    }

    @Test
    void rejectSuggestion_Success() {
        // Given
        when(suggestionService.rejectSuggestion("suggestion-id", "Not relevant")).thenReturn(true);

        // When
        Boolean result = mutationResolver.rejectSuggestion("suggestion-id", "Not relevant");

        // Then
        assertThat(result).isTrue();
    }
}