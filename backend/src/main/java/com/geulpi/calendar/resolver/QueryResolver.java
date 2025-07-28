package com.geulpi.calendar.resolver;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.domain.enums.AnalyticsPeriod;
import com.geulpi.calendar.domain.enums.TimePeriod;
import com.geulpi.calendar.dto.*;
import com.geulpi.calendar.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class QueryResolver {
    
    private final UserService userService;
    private final EventService eventService;
    private final AnalyticsService analyticsService;
    private final SuggestionService suggestionService;
    private final InsightService insightService;
    private final PatternService patternService;
    private final DashboardService dashboardService;
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public User me() {
        return userService.getCurrentUser();
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public User userProfile(@Argument String id) {
        return userService.getUserById(id);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Event> events(@Argument EventFilter filter) {
        return eventService.getEvents(filter);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public Event event(@Argument String id) {
        return eventService.getEventById(id);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Event> upcomingEvents(@Argument Integer limit) {
        int actualLimit = limit != null ? limit : 5;
        return eventService.getUpcomingEvents(actualLimit);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public TimeBalance timeBalance(@Argument AnalyticsPeriod period) {
        return analyticsService.getTimeBalance(period);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Insight> insights(@Argument Integer limit) {
        int actualLimit = limit != null ? limit : 5;
        return insightService.getInsights(actualLimit);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Pattern> patterns() {
        return patternService.getPatterns();
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Suggestion> suggestions(@Argument SuggestionContext context) {
        return suggestionService.getSuggestions(context);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public OptimizationResult scheduleOptimization(@Argument LocalDate date) {
        return suggestionService.optimizeSchedule(date);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Event> searchEvents(@Argument String query) {
        return eventService.searchEvents(query);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public TodaySchedule getTodaySchedule(@Argument String userId) {
        return dashboardService.getTodaySchedule(userId);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public LifeBalanceAnalytics getLifeBalanceAnalytics(@Argument String userId, @Argument TimePeriod period) {
        return dashboardService.getLifeBalanceAnalytics(userId, period);
    }
    
    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<AIInsight> getDailyInsights(@Argument String userId) {
        return dashboardService.getDailyInsights(userId);
    }
}