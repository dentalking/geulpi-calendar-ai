package com.geulpi.calendar.resolver;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.enums.Priority;
import com.geulpi.calendar.domain.enums.Severity;
import com.geulpi.calendar.domain.enums.InsightType;
import com.geulpi.calendar.dto.DashboardUpdate;
import com.geulpi.calendar.dto.BalanceAlert;
import com.geulpi.calendar.dto.AIInsight;
import com.geulpi.calendar.dto.AreaBalance;
import com.geulpi.calendar.dto.TimeBalance;
import com.geulpi.calendar.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.reactivestreams.Publisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SubscriptionResolver Unit Tests")
class SubscriptionResolverTest {

    @Mock
    private SubscriptionService subscriptionService;

    @InjectMocks
    private SubscriptionResolver subscriptionResolver;

    private String userId;
    private Event testEvent;
    private Suggestion testSuggestion;
    private Insight testInsight;
    private DashboardUpdate testDashboardUpdate;
    private BalanceAlert testBalanceAlert;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID().toString();
        
        // Initialize test event
        testEvent = Event.builder()
                .id(UUID.randomUUID().toString())
                .title("Test Event")
                .description("Test Description")
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                .build();
        
        // Initialize test suggestion
        testSuggestion = new Suggestion();
        testSuggestion.setId(UUID.randomUUID().toString());
        testSuggestion.setTitle("Test Suggestion");
        testSuggestion.setDescription("Test suggestion description");
        
        // Initialize test insight
        testInsight = new Insight();
        testInsight.setId(UUID.randomUUID().toString());
        testInsight.setContent("Test insight content");
        testInsight.setActionable(true);
        
        // Initialize test dashboard update
        testDashboardUpdate = new DashboardUpdate(
                "EVENT_UPDATED",
                testEvent,
                null,
                null,
                LocalDateTime.now()
        );
        
        // Initialize test balance alert
        testBalanceAlert = new BalanceAlert(
                UUID.randomUUID().toString(),
                "Balance Alert",
                "Your work-life balance needs attention",
                Severity.WARNING,
                new AreaBalance(),
                LocalDateTime.now()
        );
    }

    @Test
    @WithMockUser
    @DisplayName("Should subscribe to event updates and return Publisher")
    void testEventUpdated_Success() {
        // Given
        Flux<Event> mockFlux = Flux.just(testEvent);
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        assertThat(result).isNotNull();
        StepVerifier.create(result)
                .expectNext(testEvent)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle empty event stream")
    void testEventUpdated_EmptyStream() {
        // Given
        Flux<Event> emptyFlux = Flux.empty();
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(emptyFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle service error in event subscription")
    void testEventUpdated_ServiceError() {
        // Given
        Flux<Event> errorFlux = Flux.error(new RuntimeException("Service error"));
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(errorFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result)
                .expectError(RuntimeException.class)
                .verify();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should subscribe to new suggestions")
    void testNewSuggestion_Success() {
        // Given
        Flux<Suggestion> mockFlux = Flux.just(testSuggestion);
        when(subscriptionService.subscribeToNewSuggestions(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<Suggestion> result = subscriptionResolver.newSuggestion(userId);

        // Then
        assertThat(result).isNotNull();
        StepVerifier.create(result)
                .expectNext(testSuggestion)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToNewSuggestions(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle multiple suggestions in stream")
    void testNewSuggestion_MultipleItems() {
        // Given
        Suggestion secondSuggestion = new Suggestion();
        secondSuggestion.setId(UUID.randomUUID().toString());
        secondSuggestion.setTitle("Second Suggestion");
        secondSuggestion.setDescription("Second suggestion description");
        
        Flux<Suggestion> mockFlux = Flux.just(testSuggestion, secondSuggestion);
        when(subscriptionService.subscribeToNewSuggestions(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<Suggestion> result = subscriptionResolver.newSuggestion(userId);

        // Then
        StepVerifier.create(result)
                .expectNext(testSuggestion)
                .expectNext(secondSuggestion)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToNewSuggestions(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should subscribe to insights")
    void testInsightGenerated_Success() {
        // Given
        Flux<Insight> mockFlux = Flux.just(testInsight);
        when(subscriptionService.subscribeToInsights(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<Insight> result = subscriptionResolver.insightGenerated(userId);

        // Then
        assertThat(result).isNotNull();
        StepVerifier.create(result)
                .expectNext(testInsight)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToInsights(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle delayed insight emission")
    void testInsightGenerated_DelayedEmission() {
        // Given
        Flux<Insight> delayedFlux = Flux.just(testInsight)
                .delayElements(Duration.ofMillis(100));
        when(subscriptionService.subscribeToInsights(userId))
                .thenReturn(delayedFlux);

        // When
        Publisher<Insight> result = subscriptionResolver.insightGenerated(userId);

        // Then
        StepVerifier.create(result)
                .expectNext(testInsight)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToInsights(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should subscribe to dashboard updates")
    void testDashboardUpdates_Success() {
        // Given
        Flux<DashboardUpdate> mockFlux = Flux.just(testDashboardUpdate);
        when(subscriptionService.subscribeToDashboardUpdates(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<DashboardUpdate> result = subscriptionResolver.dashboardUpdates(userId);

        // Then
        assertThat(result).isNotNull();
        StepVerifier.create(result)
                .expectNext(testDashboardUpdate)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToDashboardUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle different dashboard update types")
    void testDashboardUpdates_DifferentTypes() {
        // Given
        DashboardUpdate eventUpdate = new DashboardUpdate(
                "EVENT_UPDATED", testEvent, null, null, LocalDateTime.now());
        DashboardUpdate timeBalanceUpdate = new DashboardUpdate(
                "BALANCE_UPDATED", null, new TimeBalance(), null, LocalDateTime.now());
        DashboardUpdate insightUpdate = new DashboardUpdate(
                "NEW_INSIGHT", null, null, 
                new AIInsight("insight-id", InsightType.OPTIMIZATION_OPPORTUNITY, "Test insight", Priority.HIGH, true),
                LocalDateTime.now());
        
        Flux<DashboardUpdate> mockFlux = Flux.just(eventUpdate, timeBalanceUpdate, insightUpdate);
        when(subscriptionService.subscribeToDashboardUpdates(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<DashboardUpdate> result = subscriptionResolver.dashboardUpdates(userId);

        // Then
        StepVerifier.create(result)
                .assertNext(update -> {
                    assertThat(update.getUpdateType()).isEqualTo("EVENT_UPDATED");
                    assertThat(update.getEvent()).isEqualTo(testEvent);
                    assertThat(update.getTimeBalance()).isNull();
                    assertThat(update.getInsight()).isNull();
                })
                .assertNext(update -> {
                    assertThat(update.getUpdateType()).isEqualTo("BALANCE_UPDATED");
                    assertThat(update.getEvent()).isNull();
                    assertThat(update.getTimeBalance()).isNotNull();
                    assertThat(update.getInsight()).isNull();
                })
                .assertNext(update -> {
                    assertThat(update.getUpdateType()).isEqualTo("NEW_INSIGHT");
                    assertThat(update.getEvent()).isNull();
                    assertThat(update.getTimeBalance()).isNull();
                    assertThat(update.getInsight()).isNotNull();
                    assertThat(update.getInsight().getId()).isEqualTo("insight-id");
                })
                .verifyComplete();
        
        verify(subscriptionService).subscribeToDashboardUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should subscribe to balance alerts")
    void testBalanceAlerts_Success() {
        // Given
        Flux<BalanceAlert> mockFlux = Flux.just(testBalanceAlert);
        when(subscriptionService.subscribeToBalanceAlerts(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<BalanceAlert> result = subscriptionResolver.balanceAlerts(userId);

        // Then
        assertThat(result).isNotNull();
        StepVerifier.create(result)
                .expectNext(testBalanceAlert)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToBalanceAlerts(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle balance alerts with different severities")
    void testBalanceAlerts_DifferentSeverities() {
        // Given
        BalanceAlert criticalAlert = new BalanceAlert(
                UUID.randomUUID().toString(),
                "Critical Alert",
                "Critical balance issue",
                Severity.CRITICAL,
                new AreaBalance(),
                LocalDateTime.now()
        );
        
        BalanceAlert infoAlert = new BalanceAlert(
                UUID.randomUUID().toString(),
                "Info Alert",
                "Info message",
                Severity.INFO,
                new AreaBalance(),
                LocalDateTime.now()
        );
        
        Flux<BalanceAlert> mockFlux = Flux.just(criticalAlert, testBalanceAlert, infoAlert);
        when(subscriptionService.subscribeToBalanceAlerts(userId))
                .thenReturn(mockFlux);

        // When
        Publisher<BalanceAlert> result = subscriptionResolver.balanceAlerts(userId);

        // Then
        StepVerifier.create(result)
                .assertNext(alert -> {
                    assertThat(alert.getSeverity()).isEqualTo(Severity.CRITICAL);
                    assertThat(alert.getTitle()).isEqualTo("Critical Alert");
                })
                .assertNext(alert -> {
                    assertThat(alert.getSeverity()).isEqualTo(Severity.WARNING);
                    assertThat(alert.getTitle()).isEqualTo("Balance Alert");
                })
                .assertNext(alert -> {
                    assertThat(alert.getSeverity()).isEqualTo(Severity.INFO);
                    assertThat(alert.getTitle()).isEqualTo("Info Alert");
                })
                .verifyComplete();
        
        verify(subscriptionService).subscribeToBalanceAlerts(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle infinite streams with take operator")
    void testSubscriptions_WithTakeOperator() {
        // Given
        Flux<Event> infiniteFlux = Flux.interval(Duration.ofMillis(100))
                .map(i -> {
                    Event event = new Event();
                    event.setId("event-" + i);
                    event.setTitle("Event " + i);
                    return event;
                });
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(infiniteFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(Flux.from(result).take(3))
                .assertNext(event -> assertThat(event.getId()).isEqualTo("event-0"))
                .assertNext(event -> assertThat(event.getId()).isEqualTo("event-1"))
                .assertNext(event -> assertThat(event.getId()).isEqualTo("event-2"))
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should pass through user ID parameter correctly")
    void testUserIdParameterPassing() {
        // Given
        String specificUserId = "specific-user-123";
        Flux<Event> mockFlux = Flux.just(testEvent);
        when(subscriptionService.subscribeToEventUpdates(specificUserId))
                .thenReturn(mockFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(specificUserId);

        // Then
        StepVerifier.create(result)
                .expectNext(testEvent)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(specificUserId);
        verify(subscriptionService, never()).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle null userId gracefully")
    void testNullUserId() {
        // Given
        Flux<Event> errorFlux = Flux.error(new IllegalArgumentException("User ID cannot be null"));
        when(subscriptionService.subscribeToEventUpdates(null))
                .thenReturn(errorFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(null);

        // Then
        StepVerifier.create(result)
                .expectError(IllegalArgumentException.class)
                .verify();
        
        verify(subscriptionService).subscribeToEventUpdates(null);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle empty string userId")
    void testEmptyStringUserId() {
        // Given
        String emptyUserId = "";
        Flux<Event> errorFlux = Flux.error(new IllegalArgumentException("User ID cannot be empty"));
        when(subscriptionService.subscribeToEventUpdates(emptyUserId))
                .thenReturn(errorFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(emptyUserId);

        // Then
        StepVerifier.create(result)
                .expectError(IllegalArgumentException.class)
                .verify();
        
        verify(subscriptionService).subscribeToEventUpdates(emptyUserId);
    }

    // Note: Authentication tests would be better suited for integration tests
    // since @PreAuthorize annotations require Spring Security context to be fully configured

    // Performance and concurrency tests
    @Test
    @WithMockUser
    @DisplayName("Should handle high-frequency emissions")
    void testHighFrequencyEmissions() {
        // Given 
        Event[] events = new Event[100];
        for (int i = 0; i < 100; i++) {
            events[i] = Event.builder()
                    .id("event-" + i)
                    .title("Event " + i)
                    .build();
        }
        
        Flux<Event> highFrequencyFlux = Flux.fromArray(events);
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(highFrequencyFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result)
                .expectNextCount(100)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle subscription cancellation")
    void testSubscriptionCancellation() {
        // Given
        Flux<Event> infiniteFlux = Flux.interval(Duration.ofMillis(10))
                .map(i -> {
                    Event event = new Event();
                    event.setId("event-" + i);
                    return event;
                });
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(infiniteFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result)
                .expectNextCount(5)
                .thenCancel()
                .verify();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle service timeout scenarios")
    void testServiceTimeout() {
        // Given
        Flux<Event> timeoutFlux = Flux.just(testEvent)
                .delayElements(Duration.ofSeconds(10))
                .timeout(Duration.ofSeconds(5));
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(timeoutFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result)
                .expectError()
                .verify(Duration.ofSeconds(6));
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should maintain subscription isolation between different users")
    void testSubscriptionIsolation() {
        // Given
        String user1Id = "user-1";
        String user2Id = "user-2";
        
        Event user1Event = Event.builder().id("user1-event").title("User 1 Event").build();
        Event user2Event = Event.builder().id("user2-event").title("User 2 Event").build();
        
        when(subscriptionService.subscribeToEventUpdates(user1Id))
                .thenReturn(Flux.just(user1Event));
        when(subscriptionService.subscribeToEventUpdates(user2Id))
                .thenReturn(Flux.just(user2Event));

        // When
        Publisher<Event> result1 = subscriptionResolver.eventUpdated(user1Id);
        Publisher<Event> result2 = subscriptionResolver.eventUpdated(user2Id);

        // Then
        StepVerifier.create(result1)
                .expectNext(user1Event)
                .verifyComplete();
                
        StepVerifier.create(result2)
                .expectNext(user2Event)
                .verifyComplete();
        
        verify(subscriptionService).subscribeToEventUpdates(user1Id);
        verify(subscriptionService).subscribeToEventUpdates(user2Id);
    }

    @Test
    @WithMockUser
    @DisplayName("Should handle backpressure scenarios")
    void testBackpressureHandling() {
        // Given
        Flux<Event> backpressureFlux = Flux.range(1, 1000)
                .map(i -> {
                    Event event = new Event();
                    event.setId("event-" + i);
                    return event;
                })
                .onBackpressureBuffer(100);
        
        when(subscriptionService.subscribeToEventUpdates(userId))
                .thenReturn(backpressureFlux);

        // When
        Publisher<Event> result = subscriptionResolver.eventUpdated(userId);

        // Then
        StepVerifier.create(result, 10) // Request only 10 items
                .expectNextCount(10)
                .thenCancel()
                .verify();
        
        verify(subscriptionService).subscribeToEventUpdates(userId);
    }

    @Test
    @WithMockUser
    @DisplayName("Should verify return types are Publishers")
    void testReturnTypesArePublishers() {
        // Given
        when(subscriptionService.subscribeToEventUpdates(anyString()))
                .thenReturn(Flux.empty());
        when(subscriptionService.subscribeToNewSuggestions(anyString()))
                .thenReturn(Flux.empty());
        when(subscriptionService.subscribeToInsights(anyString()))
                .thenReturn(Flux.empty());
        when(subscriptionService.subscribeToDashboardUpdates(anyString()))
                .thenReturn(Flux.empty());
        when(subscriptionService.subscribeToBalanceAlerts(anyString()))
                .thenReturn(Flux.empty());

        // When & Then
        assertThat(subscriptionResolver.eventUpdated(userId))
                .isInstanceOf(Publisher.class);
        assertThat(subscriptionResolver.newSuggestion(userId))
                .isInstanceOf(Publisher.class);
        assertThat(subscriptionResolver.insightGenerated(userId))
                .isInstanceOf(Publisher.class);
        assertThat(subscriptionResolver.dashboardUpdates(userId))
                .isInstanceOf(Publisher.class);
        assertThat(subscriptionResolver.balanceAlerts(userId))
                .isInstanceOf(Publisher.class);
    }
}