package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.enums.Severity;
import com.geulpi.calendar.dto.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SubscriptionService {
    
    private final Map<String, Sinks.Many<Event>> eventSinks = new ConcurrentHashMap<>();
    private final Map<String, Sinks.Many<Suggestion>> suggestionSinks = new ConcurrentHashMap<>();
    private final Map<String, Sinks.Many<Insight>> insightSinks = new ConcurrentHashMap<>();
    private final Map<String, Sinks.Many<DashboardUpdate>> dashboardSinks = new ConcurrentHashMap<>();
    private final Map<String, Sinks.Many<BalanceAlert>> alertSinks = new ConcurrentHashMap<>();
    
    @PostConstruct
    public void init() {
        // Initialize any required resources
    }
    
    public Flux<Event> subscribeToEventUpdates(String userId) {
        Sinks.Many<Event> sink = eventSinks.computeIfAbsent(userId, 
            key -> Sinks.many().multicast().directBestEffort());
        
        return sink.asFlux()
            .doOnCancel(() -> eventSinks.remove(userId))
            .doOnTerminate(() -> eventSinks.remove(userId));
    }
    
    public Flux<Suggestion> subscribeToNewSuggestions(String userId) {
        Sinks.Many<Suggestion> sink = suggestionSinks.computeIfAbsent(userId,
            key -> Sinks.many().multicast().directBestEffort());
        
        return sink.asFlux()
            .doOnCancel(() -> suggestionSinks.remove(userId))
            .doOnTerminate(() -> suggestionSinks.remove(userId));
    }
    
    public Flux<Insight> subscribeToInsights(String userId) {
        Sinks.Many<Insight> sink = insightSinks.computeIfAbsent(userId,
            key -> Sinks.many().multicast().directBestEffort());
        
        return sink.asFlux()
            .doOnCancel(() -> insightSinks.remove(userId))
            .doOnTerminate(() -> insightSinks.remove(userId));
    }
    
    public Flux<DashboardUpdate> subscribeToDashboardUpdates(String userId) {
        Sinks.Many<DashboardUpdate> sink = dashboardSinks.computeIfAbsent(userId,
            key -> Sinks.many().multicast().directBestEffort());
        
        // Also emit periodic updates
        Flux<DashboardUpdate> periodicUpdates = Flux.interval(Duration.ofMinutes(5))
            .map(tick -> createPeriodicUpdate(userId));
        
        return Flux.merge(sink.asFlux(), periodicUpdates)
            .doOnCancel(() -> dashboardSinks.remove(userId))
            .doOnTerminate(() -> dashboardSinks.remove(userId));
    }
    
    public Flux<BalanceAlert> subscribeToBalanceAlerts(String userId) {
        Sinks.Many<BalanceAlert> sink = alertSinks.computeIfAbsent(userId,
            key -> Sinks.many().multicast().directBestEffort());
        
        return sink.asFlux()
            .doOnCancel(() -> alertSinks.remove(userId))
            .doOnTerminate(() -> alertSinks.remove(userId));
    }
    
    // Methods to emit updates
    public void emitEventUpdate(String userId, Event event) {
        Sinks.Many<Event> sink = eventSinks.get(userId);
        if (sink != null) {
            sink.tryEmitNext(event);
        }
        
        // Also emit dashboard update
        emitDashboardUpdate(userId, "EVENT_UPDATED", event, null, null);
    }
    
    public void emitNewSuggestion(String userId, Suggestion suggestion) {
        Sinks.Many<Suggestion> sink = suggestionSinks.get(userId);
        if (sink != null) {
            sink.tryEmitNext(suggestion);
        }
    }
    
    public void emitInsight(String userId, Insight insight) {
        Sinks.Many<Insight> sink = insightSinks.get(userId);
        if (sink != null) {
            sink.tryEmitNext(insight);
        }
        
        // Convert to AIInsight for dashboard
        AIInsight aiInsight = new AIInsight(
            insight.getId(),
            insight.getType(),
            insight.getDescription(),
            determinePriority(insight),
            insight.isActionable()
        );
        
        emitDashboardUpdate(userId, "NEW_INSIGHT", null, null, aiInsight);
    }
    
    public void emitDashboardUpdate(String userId, String updateType, Event event, 
                                    TimeBalance timeBalance, AIInsight insight) {
        Sinks.Many<DashboardUpdate> sink = dashboardSinks.get(userId);
        if (sink != null) {
            DashboardUpdate update = new DashboardUpdate(
                updateType, event, timeBalance, insight, LocalDateTime.now()
            );
            sink.tryEmitNext(update);
        }
    }
    
    public void emitBalanceAlert(String userId, String title, String message, 
                                Severity severity, AreaBalance affectedArea) {
        Sinks.Many<BalanceAlert> sink = alertSinks.get(userId);
        if (sink != null) {
            BalanceAlert alert = new BalanceAlert(
                UUID.randomUUID().toString(),
                title,
                message,
                severity,
                affectedArea,
                LocalDateTime.now()
            );
            sink.tryEmitNext(alert);
        }
    }
    
    private DashboardUpdate createPeriodicUpdate(String userId) {
        // This would fetch current state and create an update
        return new DashboardUpdate(
            "PERIODIC_UPDATE",
            null,
            null,
            null,
            LocalDateTime.now()
        );
    }
    
    private com.geulpi.calendar.domain.enums.Priority determinePriority(Insight insight) {
        switch (insight.getSeverity()) {
            case CRITICAL:
                return com.geulpi.calendar.domain.enums.Priority.CRITICAL;
            case ERROR:
                return com.geulpi.calendar.domain.enums.Priority.HIGH;
            case WARNING:
                return com.geulpi.calendar.domain.enums.Priority.MEDIUM;
            default:
                return com.geulpi.calendar.domain.enums.Priority.LOW;
        }
    }
}