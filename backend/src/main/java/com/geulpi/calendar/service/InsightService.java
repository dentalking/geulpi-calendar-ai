package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.domain.enums.*;
import com.geulpi.calendar.dto.TimeBalance;
import com.geulpi.calendar.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InsightService {
    
    private final InsightRepository insightRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PatternRepository patternRepository;
    private final SuggestionRepository suggestionRepository;
    private final TimeBalanceService timeBalanceService;
    
    @Transactional(readOnly = true)
    @Cacheable(value = "insights", key = "#root.target.getCurrentUserId() + ':insights:' + (#limit ?: 'all')",
               condition = "#root.target.isAuthenticationValid()")
    public List<Insight> getInsights(Integer limit) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        
        // Get recent insights
        List<Insight> insights = limit != null ? 
                insightRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId) :
                insightRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, 
                        LocalDateTime.now().minusDays(7));
        
        // Generate new insights if needed
        if (insights.size() < 3) {
            generateInsightsForUser(userId);
            insights = insightRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId);
        }
        
        return insights;
    }
    
    @Transactional
    @CacheEvict(value = "insights", key = "#userId + ':insights:*'", allEntries = true)
    public void generateInsightsForUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        log.info("Generating insights for user {}", userId);
        
        List<Insight> newInsights = new ArrayList<>();
        
        // 1. Check for life balance
        Insight balanceInsight = checkLifeBalance(user);
        if (balanceInsight != null) {
            newInsights.add(balanceInsight);
        }
        
        // 2. Check for burnout risk
        Insight burnoutInsight = checkBurnoutRisk(user);
        if (burnoutInsight != null) {
            newInsights.add(burnoutInsight);
        }
        
        // 3. Check for optimization opportunities
        List<Insight> optimizationInsights = findOptimizationOpportunities(user);
        newInsights.addAll(optimizationInsights);
        
        // 4. Detect new patterns
        Insight patternInsight = detectNewPatterns(user);
        if (patternInsight != null) {
            newInsights.add(patternInsight);
        }
        
        // 5. Check goal deviation
        Insight goalInsight = checkGoalDeviation(user);
        if (goalInsight != null) {
            newInsights.add(goalInsight);
        }
        
        // Save all new insights
        if (!newInsights.isEmpty()) {
            insightRepository.saveAll(newInsights);
            log.info("Generated {} new insights for user {}", newInsights.size(), userId);
        }
    }
    
    private Insight checkLifeBalance(User user) {
        TimeBalance weekBalance = timeBalanceService.getTimeBalance(AnalyticsPeriod.WEEK);
        
        if (weekBalance.getScore() < 60) {
            Map<String, Object> deviation = weekBalance.getDeviation();
            
            // Find the most imbalanced area
            String mostImbalancedArea = null;
            double maxDeviation = 0;
            
            for (Map.Entry<String, Object> entry : deviation.entrySet()) {
                if (entry.getValue() instanceof Number) {
                    double dev = Math.abs(((Number) entry.getValue()).doubleValue());
                    if (dev > maxDeviation && !entry.getKey().equals("average")) {
                        maxDeviation = dev;
                        mostImbalancedArea = entry.getKey();
                    }
                }
            }
            
            if (mostImbalancedArea != null && maxDeviation > 15) {
                Insight insight = Insight.builder()
                        .user(user)
                        .type(InsightType.IMBALANCE)
                        .content(String.format(
                                "Life Balance Alert: Your '%s' area is %.0f%% off target. Your current balance score is %.0f/100. " +
                                "Consider adjusting your schedule to align better with your goals.",
                                mostImbalancedArea, maxDeviation, weekBalance.getScore()))
                        .impactScore(weekBalance.getScore() < 40 ? 0.7f : 0.5f)
                        .actionable(true)
                        .build();
                
                // Create suggestions
                List<Suggestion> suggestions = createBalanceSuggestions(user, mostImbalancedArea, deviation);
                insight.setSuggestedActions(suggestions);
                
                return insight;
            }
        }
        
        return null;
    }
    
    private Insight checkBurnoutRisk(User user) {
        // Analyze last 2 weeks
        LocalDateTime twoWeeksAgo = LocalDateTime.now().minusWeeks(2);
        List<Event> recentEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                user.getId(), twoWeeksAgo, LocalDateTime.now());
        
        // Calculate work hours per day
        Map<LocalDateTime, Double> dailyWorkHours = new HashMap<>();
        
        for (Event event : recentEvents) {
            if (event.getArea() != null && event.getArea().getName().equalsIgnoreCase("work")) {
                LocalDateTime day = event.getStartTime().toLocalDate().atStartOfDay();
                double hours = ChronoUnit.MINUTES.between(event.getStartTime(), event.getEndTime()) / 60.0;
                dailyWorkHours.merge(day, hours, Double::sum);
            }
        }
        
        // Check for burnout indicators
        long daysOver8Hours = dailyWorkHours.values().stream().filter(hours -> hours > 8).count();
        long weekendWork = recentEvents.stream()
                .filter(e -> e.getArea() != null && e.getArea().getName().equalsIgnoreCase("work"))
                .filter(e -> e.getStartTime().getDayOfWeek() == DayOfWeek.SATURDAY || 
                           e.getStartTime().getDayOfWeek() == DayOfWeek.SUNDAY)
                .count();
        
        double avgDailyWork = dailyWorkHours.values().stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);
        
        boolean burnoutRisk = daysOver8Hours > 5 || weekendWork > 2 || avgDailyWork > 9;
        
        if (burnoutRisk) {
            Insight insight = Insight.builder()
                    .user(user)
                    .type(InsightType.BURNOUT_RISK)
                    .content(String.format(
                            "Burnout Risk Detected: You've been working an average of %.1f hours per day with %d days over 8 hours " +
                            "and %d weekend work sessions. Consider taking breaks and setting boundaries.",
                            avgDailyWork, daysOver8Hours, weekendWork))
                    .impactScore(avgDailyWork > 10 ? 0.9f : 0.7f)
                    .actionable(true)
                    .build();
            
            // Create recovery suggestions
            List<Suggestion> suggestions = createBurnoutRecoverySuggestions(user);
            insight.setSuggestedActions(suggestions);
            
            return insight;
        }
        
        return null;
    }
    
    private List<Insight> findOptimizationOpportunities(User user) {
        List<Insight> insights = new ArrayList<>();
        
        // Check for meeting clustering opportunities
        LocalDateTime lastWeek = LocalDateTime.now().minusWeeks(1);
        List<Event> recentEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                user.getId(), lastWeek, LocalDateTime.now());
        
        // Group events by day
        Map<LocalDateTime, List<Event>> eventsByDay = recentEvents.stream()
                .collect(Collectors.groupingBy(e -> e.getStartTime().toLocalDate().atStartOfDay()));
        
        for (Map.Entry<LocalDateTime, List<Event>> entry : eventsByDay.entrySet()) {
            List<Event> dayEvents = entry.getValue();
            
            // Check for fragmented schedule
            if (dayEvents.size() >= 3) {
                double totalGapTime = 0;
                int gaps = 0;
                
                for (int i = 1; i < dayEvents.size(); i++) {
                    Event prev = dayEvents.get(i - 1);
                    Event curr = dayEvents.get(i);
                    long gapMinutes = ChronoUnit.MINUTES.between(prev.getEndTime(), curr.getStartTime());
                    
                    if (gapMinutes > 0 && gapMinutes < 60) { // Gaps less than 1 hour
                        totalGapTime += gapMinutes;
                        gaps++;
                    }
                }
                
                if (gaps >= 2 && totalGapTime > 60) {
                    Insight insight = Insight.builder()
                            .user(user)
                            .type(InsightType.OPTIMIZATION_OPPORTUNITY)
                            .content(String.format(
                                    "Schedule Optimization Available: You had %d small gaps totaling %.0f minutes on %s. " +
                                    "Consider clustering meetings to create longer focus blocks.",
                                    gaps, totalGapTime, entry.getKey().toLocalDate()))
                            .impactScore(0.6f)
                            .actionable(true)
                            .build();
                    
                    insights.add(insight);
                    break; // Only one optimization insight per check
                }
            }
        }
        
        return insights;
    }
    
    private Insight detectNewPatterns(User user) {
        // Get recent patterns
        List<Pattern> patterns = patternRepository.findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc(
                user.getId(), 0.7f);
        
        if (!patterns.isEmpty()) {
            Pattern topPattern = patterns.get(0);
            
            // Check if this pattern was already reported
            boolean alreadyReported = insightRepository.findByUserIdAndTypeAndCreatedAtAfter(
                    user.getId(), InsightType.PATTERN_DETECTED, LocalDateTime.now().minusDays(7))
                    .stream()
                    .anyMatch(i -> i.getContent().contains(topPattern.getName()));
            
            if (!alreadyReported) {
                return Insight.builder()
                        .user(user)
                        .type(InsightType.PATTERN_DETECTED)
                        .content(String.format(
                                "New Pattern Detected: %s (occurring %.0f%% of the time with %.0f%% confidence)",
                                topPattern.getDescription(), 
                                topPattern.getFrequency() * 100,
                                topPattern.getConfidence() * 100))
                        .impactScore(0.5f)
                        .actionable(false)
                        .build();
            }
        }
        
        return null;
    }
    
    private Insight checkGoalDeviation(User user) {
        LifePhilosophy philosophy = user.getLifePhilosophy();
        if (philosophy == null || philosophy.getAreas().isEmpty()) {
            return null;
        }
        
        TimeBalance monthBalance = timeBalanceService.getTimeBalance(AnalyticsPeriod.MONTH);
        Map<String, Object> actual = monthBalance.getActual();
        
        // Find areas significantly below target
        List<String> underperformingAreas = new ArrayList<>();
        
        for (LifeArea area : philosophy.getAreas()) {
            double actualPercentage = convertToDouble(actual.getOrDefault(area.getName(), 0.0));
            double target = area.getTargetPercentage();
            
            if (actualPercentage < target * 0.5) { // Less than 50% of target
                underperformingAreas.add(area.getName());
            }
        }
        
        if (!underperformingAreas.isEmpty()) {
            return Insight.builder()
                    .user(user)
                    .type(InsightType.GOAL_DEVIATION)
                    .content(String.format(
                            "Goal Tracking Alert: You're significantly behind on your goals for: %s. " +
                            "This month you've allocated less than 50%% of your target time to these areas.",
                            String.join(", ", underperformingAreas)))
                    .impactScore(underperformingAreas.size() > 2 ? 0.7f : 0.5f)
                    .actionable(true)
                    .build();
        }
        
        return null;
    }
    
    private List<Suggestion> createBalanceSuggestions(User user, String imbalancedArea, Map<String, Object> deviation) {
        List<Suggestion> suggestions = new ArrayList<>();
        
        double areaDeviation = convertToDouble(deviation.get(imbalancedArea));
        
        if (areaDeviation < -10) { // Under-allocated area
            Suggestion suggestion = Suggestion.builder()
                    .user(user)
                    .type(SuggestionType.NEW_EVENT)
                    .title("Add " + imbalancedArea + " Time")
                    .description(String.format(
                            "Schedule at least 2-3 hours this week for %s activities to improve balance",
                            imbalancedArea))
                    .reasoning("This area is significantly under your target allocation")
                    .priority(Priority.HIGH)
                    .status(SuggestionStatus.PENDING)
                    .build();
            
            suggestions.add(suggestionRepository.save(suggestion));
        } else if (areaDeviation > 10) { // Over-allocated area
            Suggestion suggestion = Suggestion.builder()
                    .user(user)
                    .type(SuggestionType.SCHEDULE_OPTIMIZATION)
                    .title("Reduce " + imbalancedArea + " Time")
                    .description(String.format(
                            "Consider delegating or rescheduling some %s activities to create space for other priorities",
                            imbalancedArea))
                    .reasoning("This area is consuming more time than your target")
                    .priority(Priority.MEDIUM)
                    .status(SuggestionStatus.PENDING)
                    .build();
            
            suggestions.add(suggestionRepository.save(suggestion));
        }
        
        return suggestions;
    }
    
    private List<Suggestion> createBurnoutRecoverySuggestions(User user) {
        List<Suggestion> suggestions = new ArrayList<>();
        
        // Suggest break time
        Suggestion breakSuggestion = Suggestion.builder()
                .user(user)
                .type(SuggestionType.NEW_EVENT)
                .title("Schedule Recovery Time")
                .description("Block out 2 hours this week for relaxation or a favorite hobby")
                .reasoning("Regular breaks are essential for preventing burnout")
                .priority(Priority.CRITICAL)
                .status(SuggestionStatus.PENDING)
                .build();
        
        suggestions.add(suggestionRepository.save(breakSuggestion));
        
        // Suggest boundary setting
        Suggestion boundarySuggestion = Suggestion.builder()
                .user(user)
                .type(SuggestionType.SCHEDULE_OPTIMIZATION)
                .title("Set Work Boundaries")
                .description("Define clear work hours and avoid scheduling work activities outside these times")
                .reasoning("Clear boundaries help maintain work-life balance")
                .priority(Priority.HIGH)
                .status(SuggestionStatus.PENDING)
                .build();
        
        suggestions.add(suggestionRepository.save(boundarySuggestion));
        
        return suggestions;
    }
    
    private double convertToDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }
    
    // Scheduled job to generate insights periodically
    @Scheduled(cron = "0 0 9 * * MON") // Every Monday at 9 AM
    @Transactional
    public void generateWeeklyInsights() {
        log.info("Starting weekly insight generation");
        
        List<User> activeUsers = userRepository.findAll().stream()
                .filter(User::getOnboardingCompleted)
                .collect(Collectors.toList());
        
        for (User user : activeUsers) {
            try {
                generateInsightsForUser(user.getId());
            } catch (Exception e) {
                log.error("Failed to generate insights for user {}: {}", user.getId(), e.getMessage());
            }
        }
        
        log.info("Completed weekly insight generation for {} users", activeUsers.size());
    }
    
    // Helper methods for caching
    public String getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            return authentication != null ? authentication.getName() : null;
        } catch (Exception e) {
            return null;
        }
    }
    
    public boolean isAuthenticationValid() {
        try {
            return SecurityContextHolder.getContext().getAuthentication() != null &&
                   SecurityContextHolder.getContext().getAuthentication().isAuthenticated();
        } catch (Exception e) {
            return false;
        }
    }
}