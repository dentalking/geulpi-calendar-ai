package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.LifePhilosophy;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class EventRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private EventRepository eventRepository;
    
    private User testUser;
    private LifeArea testLifeArea;
    
    @BeforeEach
    void setUp() {
        // Create test user
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        testUser = entityManager.persistAndFlush(testUser);
        
        // Create life philosophy
        LifePhilosophy philosophy = LifePhilosophy.builder()
                .user(testUser)
                .build();
        philosophy = entityManager.persistAndFlush(philosophy);
        
        // Create life area
        testLifeArea = LifeArea.builder()
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(philosophy)
                .build();
        testLifeArea = entityManager.persistAndFlush(testLifeArea);
    }
    
    @Test
    void findByUserIdAndStartTimeBetween_ReturnsEventsInTimeRange() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        
        Event event1 = createAndSaveEvent("Event 1", now.plusDays(1));
        Event event2 = createAndSaveEvent("Event 2", now.plusDays(3));
        Event event3 = createAndSaveEvent("Event 3", now.plusDays(10)); // Outside range
        
        // When
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                testUser.getId(), now, now.plusDays(7)
        );
        
        // Then
        assertThat(events).hasSize(2);
        assertThat(events).extracting(Event::getTitle)
                .containsExactly("Event 1", "Event 2");
    }
    
    @Test
    void existsByGoogleEventId_ReturnsTrueWhenExists() {
        // Given
        Event event = Event.builder()
                .user(testUser)
                .title("Google Event")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(1))
                .googleEventId("google-123")
                .area(testLifeArea)
                .source(EventSource.GOOGLE_CALENDAR)
                .createdBy(CreatedBy.IMPORT)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
        entityManager.persistAndFlush(event);
        
        // When
        boolean exists = eventRepository.existsByGoogleEventId("google-123");
        boolean notExists = eventRepository.existsByGoogleEventId("google-456");
        
        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }
    
    @Test
    void findByUserIdAndGoogleEventIdIsNotNull_ReturnsOnlyGoogleEvents() {
        // Given
        Event googleEvent = Event.builder()
                .user(testUser)
                .title("Google Event")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(1))
                .googleEventId("google-123")
                .area(testLifeArea)
                .source(EventSource.GOOGLE_CALENDAR)
                .createdBy(CreatedBy.IMPORT)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
        
        Event normalEvent = Event.builder()
                .user(testUser)
                .title("Normal Event")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(1))
                .area(testLifeArea)
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
        
        entityManager.persistAndFlush(googleEvent);
        entityManager.persistAndFlush(normalEvent);
        
        // When
        List<Event> googleEvents = eventRepository.findByUserIdAndGoogleEventIdIsNotNull(testUser.getId());
        
        // Then
        assertThat(googleEvents).hasSize(1);
        assertThat(googleEvents.get(0).getGoogleEventId()).isEqualTo("google-123");
    }
    
    @Test
    void searchEventsByUserIdAndQuery_FindsMatchingEvents() {
        // Given
        Event event1 = createAndSaveEvent("Team Meeting", LocalDateTime.now());
        Event event2 = createAndSaveEvent("Client Presentation", LocalDateTime.now());
        Event event3 = createAndSaveEvent("Meeting with Manager", LocalDateTime.now());
        
        // When
        List<Event> results = eventRepository.searchByTitleOrDescription(testUser.getId(), "meeting");
        
        // Then
        assertThat(results).hasSize(2);
        assertThat(results).extracting(Event::getTitle)
                .containsExactlyInAnyOrder("Team Meeting", "Meeting with Manager");
    }
    
    @Test
    void findUpcomingEvents_ReturnsOnlyFutureEvents() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        Event pastEvent = createAndSaveEvent("Past Event", now.minusDays(1));
        Event futureEvent1 = createAndSaveEvent("Future Event 1", now.plusHours(1));
        Event futureEvent2 = createAndSaveEvent("Future Event 2", now.plusDays(1));
        
        // When
        List<Event> upcomingEvents = eventRepository.findTop5ByUserIdAndStartTimeAfterOrderByStartTime(
                testUser.getId(), now
        );
        
        // Then
        assertThat(upcomingEvents).hasSize(2);
        assertThat(upcomingEvents).extracting(Event::getTitle)
                .containsExactly("Future Event 1", "Future Event 2");
    }
    
    private Event createAndSaveEvent(String title, LocalDateTime startTime) {
        Event event = Event.builder()
                .user(testUser)
                .title(title)
                .startTime(startTime)
                .endTime(startTime.plusHours(1))
                .area(testLifeArea)
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f)
                .build();
        return entityManager.persistAndFlush(event);
    }
}