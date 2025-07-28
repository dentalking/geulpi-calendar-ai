package com.geulpi.calendar.controller;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.dto.EventFilter;
import com.geulpi.calendar.resolver.QueryResolver;
import com.geulpi.calendar.service.EventService;
import com.geulpi.calendar.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.graphql.test.tester.GraphQlTester;
import org.springframework.security.test.context.support.WithMockUser;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@GraphQlTest(QueryResolver.class)
@WithMockUser(username = "test-user-id")
class QueryResolverTest {
    
    @Autowired
    private GraphQlTester graphQlTester;
    
    @MockBean
    private UserService userService;
    
    @MockBean
    private EventService eventService;
    
    private User testUser;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
    }
    
    @Test
    void me_ReturnsCurrentUser() {
        // Given
        when(userService.getCurrentUser()).thenReturn(testUser);
        
        // When & Then
        graphQlTester.documentName("me")
                .execute()
                .path("me.id").entity(String.class).isEqualTo("test-user-id")
                .path("me.email").entity(String.class).isEqualTo("test@example.com")
                .path("me.name").entity(String.class).isEqualTo("Test User");
    }
    
    @Test
    void events_ReturnsFilteredEvents() {
        // Given
        List<Event> mockEvents = Arrays.asList(
                Event.builder()
                        .id("event-1")
                        .title("Meeting 1")
                        .startTime(LocalDateTime.now().plusDays(1))
                        .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                        .build(),
                Event.builder()
                        .id("event-2")
                        .title("Meeting 2")
                        .startTime(LocalDateTime.now().plusDays(2))
                        .endTime(LocalDateTime.now().plusDays(2).plusHours(1))
                        .build()
        );
        
        when(eventService.getEvents(any(EventFilter.class)))
                .thenReturn(mockEvents);
        
        // When & Then
        graphQlTester.documentName("events")
                .variable("startDate", LocalDate.now())
                .variable("endDate", LocalDate.now().plusDays(7))
                .execute()
                .path("events").entityList(Object.class).hasSize(2)
                .path("events[0].title").entity(String.class).isEqualTo("Meeting 1")
                .path("events[1].title").entity(String.class).isEqualTo("Meeting 2");
    }
    
    @Test
    void upcomingEvents_ReturnsLimitedEvents() {
        // Given
        List<Event> mockEvents = Arrays.asList(
                Event.builder()
                        .id("event-1")
                        .title("Upcoming 1")
                        .startTime(LocalDateTime.now().plusHours(1))
                        .build(),
                Event.builder()
                        .id("event-2")
                        .title("Upcoming 2")
                        .startTime(LocalDateTime.now().plusHours(2))
                        .build()
        );
        
        when(eventService.getUpcomingEvents(eq(3)))
                .thenReturn(mockEvents);
        
        // When & Then
        graphQlTester.documentName("upcomingEvents")
                .variable("limit", 3)
                .execute()
                .path("upcomingEvents").entityList(Object.class).hasSize(2);
    }
    
    @Test
    void searchEvents_ReturnsMatchingEvents() {
        // Given
        List<Event> mockEvents = Arrays.asList(
                Event.builder()
                        .id("event-1")
                        .title("Team Meeting")
                        .build()
        );
        
        when(eventService.searchEvents("meeting"))
                .thenReturn(mockEvents);
        
        // When & Then
        graphQlTester.documentName("searchEvents")
                .variable("query", "meeting")
                .execute()
                .path("searchEvents").entityList(Object.class).hasSize(1)
                .path("searchEvents[0].title").entity(String.class).isEqualTo("Team Meeting");
    }
}