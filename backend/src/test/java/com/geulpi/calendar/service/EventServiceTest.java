package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import com.geulpi.calendar.dto.CreateEventInput;
import com.geulpi.calendar.dto.EventFilter;
import com.geulpi.calendar.dto.UpdateEventInput;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.LifeAreaRepository;
import com.geulpi.calendar.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {
    
    @Mock
    private EventRepository eventRepository;
    
    @Mock
    private LifeAreaRepository lifeAreaRepository;
    
    @Mock
    private UserService userService;
    
    @InjectMocks
    private EventService eventService;
    
    private User testUser;
    private LifeArea testLifeArea;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .build();
        
        testLifeArea = LifeArea.builder()
                .id("test-area-id")
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .build();
    }
    
    @Test
    void createEvent_Success() {
        // Given
        CreateEventInput input = new CreateEventInput();
        input.setTitle("Team Meeting");
        input.setDescription("Weekly team sync");
        input.setStartTime(LocalDateTime.now().plusDays(1));
        input.setEndTime(LocalDateTime.now().plusDays(1).plusHours(1));
        input.setAreaId(testLifeArea.getId());
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(lifeAreaRepository.findById(testLifeArea.getId())).thenReturn(Optional.of(testLifeArea));
        when(eventRepository.save(any(Event.class))).thenAnswer(i -> {
            Event event = i.getArgument(0);
            event.setId("generated-event-id");
            return event;
        });
        
        // When
        Event createdEvent = eventService.createEvent(input);
        
        // Then
        assertThat(createdEvent).isNotNull();
        assertThat(createdEvent.getTitle()).isEqualTo("Team Meeting");
        assertThat(createdEvent.getUser()).isEqualTo(testUser);
        assertThat(createdEvent.getArea()).isEqualTo(testLifeArea);
        assertThat(createdEvent.getSource()).isEqualTo(EventSource.USER);
        assertThat(createdEvent.getCreatedBy()).isEqualTo(CreatedBy.USER);
        
        verify(eventRepository).save(any(Event.class));
    }
    
    @Test
    void createEvent_UserNotFound_ThrowsException() {
        // Given
        CreateEventInput input = new CreateEventInput();
        input.setTitle("Team Meeting");
        input.setStartTime(LocalDateTime.now().plusDays(1));
        input.setEndTime(LocalDateTime.now().plusDays(1).plusHours(1));
        
        when(userService.getCurrentUser()).thenThrow(new RuntimeException("User not found"));
        
        // When/Then
        assertThatThrownBy(() -> eventService.createEvent(input))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("User not found");
    }
    
    @Test
    void updateEvent_Success() {
        // Given
        Event existingEvent = Event.builder()
                .id("event-id")
                .title("Old Title")
                .user(testUser)
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(1))
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .build();
        
        UpdateEventInput input = new UpdateEventInput();
        input.setTitle("New Title");
        input.setDescription("Updated description");
        
        when(eventRepository.findById("event-id")).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(i -> i.getArgument(0));
        
        // When
        Event updatedEvent = eventService.updateEvent("event-id", input);
        
        // Then
        assertThat(updatedEvent.getTitle()).isEqualTo("New Title");
        assertThat(updatedEvent.getDescription()).isEqualTo("Updated description");
        verify(eventRepository).save(existingEvent);
    }
    
    @Test
    void deleteEvent_Success() {
        // Given
        Event event = Event.builder()
                .id("event-id")
                .user(testUser)
                .build();
        
        // When
        boolean result = eventService.deleteEvent("event-id");
        
        // Then
        assertThat(result).isTrue();
        verify(eventRepository).deleteById("event-id");
    }
    
    @Test
    void getEvents_WithFilter_Success() {
        // Given
        EventFilter filter = new EventFilter();
        filter.setStartDate(LocalDate.now());
        filter.setEndDate(LocalDate.now().plusDays(7));
        
        List<Event> expectedEvents = Arrays.asList(
                Event.builder().id("1").title("Event 1").build(),
                Event.builder().id("2").title("Event 2").build()
        );
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                eq("test-user-id"), 
                any(LocalDateTime.class), 
                any(LocalDateTime.class)))
                .thenReturn(expectedEvents);
        
        // When
        List<Event> events = eventService.getEvents(filter);
        
        // Then
        assertThat(events).hasSize(2);
        assertThat(events).isEqualTo(expectedEvents);
    }
    
    @Test
    void searchEvents_Success() {
        // Given
        String searchQuery = "meeting";
        List<Event> expectedEvents = Arrays.asList(
                Event.builder().id("1").title("Team Meeting").build(),
                Event.builder().id("2").title("Client Meeting").build()
        );
        
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(eventRepository.searchByTitleOrDescription("test-user-id", searchQuery))
                .thenReturn(expectedEvents);
        
        // When
        List<Event> events = eventService.searchEvents(searchQuery);
        
        // Then
        assertThat(events).hasSize(2);
        assertThat(events).allMatch(e -> e.getTitle().toLowerCase().contains("meeting"));
    }
}