package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.LifePhilosophy;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.AnalyticsPeriod;
import com.geulpi.calendar.dto.TimeBalance;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeBalanceService {
    
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    
    @Transactional(readOnly = true)
    @Cacheable(value = "timeBalance", key = "#root.target.getCurrentUserId() + ':' + #period.name()", 
               condition = "#root.target.isAuthenticationValid()")
    public TimeBalance getTimeBalance(AnalyticsPeriod period) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Calculate date range based on period
        LocalDateTime[] dateRange = getDateRange(period);
        LocalDateTime startDate = dateRange[0];
        LocalDateTime endDate = dateRange[1];
        
        // Fetch events in the period
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                userId, startDate, endDate);
        
        log.info("Analyzing {} events for period {} for user {}", events.size(), period, userId);
        
        // Calculate actual time distribution
        Map<String, Object> actualDistribution = calculateActualDistribution(events);
        
        // Get ideal distribution from life philosophy
        Map<String, Object> idealDistribution = getIdealDistribution(user);
        
        // Calculate deviation
        Map<String, Object> deviation = calculateDeviation(actualDistribution, idealDistribution);
        
        // Calculate balance score
        Float score = calculateBalanceScore(actualDistribution, idealDistribution);
        
        return TimeBalance.builder()
                .period(period)
                .actual(actualDistribution)
                .ideal(idealDistribution)
                .deviation(deviation)
                .score(score)
                .build();
    }
    
    private LocalDateTime[] getDateRange(AnalyticsPeriod period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate;
        LocalDateTime endDate = now;
        
        switch (period) {
            case DAY:
                startDate = now.toLocalDate().atStartOfDay();
                endDate = startDate.plusDays(1);
                break;
            case WEEK:
                startDate = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toLocalDate().atStartOfDay();
                endDate = startDate.plusWeeks(1);
                break;
            case MONTH:
                startDate = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
                endDate = startDate.plusMonths(1);
                break;
            case QUARTER:
                int currentMonth = now.getMonthValue();
                int quarterStartMonth = ((currentMonth - 1) / 3) * 3 + 1;
                startDate = now.withMonth(quarterStartMonth).withDayOfMonth(1).toLocalDate().atStartOfDay();
                endDate = startDate.plusMonths(3);
                break;
            case YEAR:
                startDate = now.withDayOfYear(1).toLocalDate().atStartOfDay();
                endDate = startDate.plusYears(1);
                break;
            default:
                startDate = now.minusDays(7);
        }
        
        return new LocalDateTime[]{startDate, endDate};
    }
    
    private Map<String, Object> calculateActualDistribution(List<Event> events) {
        Map<String, Double> timeByArea = new HashMap<>();
        double totalMinutes = 0;
        
        // Calculate total time spent in each life area
        for (Event event : events) {
            if (event.getArea() != null && event.getStartTime() != null && event.getEndTime() != null) {
                String areaName = event.getArea().getName();
                long minutes = ChronoUnit.MINUTES.between(event.getStartTime(), event.getEndTime());
                
                timeByArea.merge(areaName, (double) minutes, Double::sum);
                totalMinutes += minutes;
            }
        }
        
        // Convert to percentages
        Map<String, Object> distribution = new HashMap<>();
        
        if (totalMinutes > 0) {
            for (Map.Entry<String, Double> entry : timeByArea.entrySet()) {
                double percentage = (entry.getValue() / totalMinutes) * 100;
                distribution.put(entry.getKey(), Math.round(percentage * 10) / 10.0); // Round to 1 decimal
            }
        }
        
        // Add statistics
        distribution.put("totalHours", Math.round(totalMinutes / 60 * 10) / 10.0);
        distribution.put("eventsCount", events.size());
        
        return distribution;
    }
    
    private Map<String, Object> getIdealDistribution(User user) {
        Map<String, Object> idealDistribution = new HashMap<>();
        
        LifePhilosophy philosophy = user.getLifePhilosophy();
        if (philosophy != null) {
            // Get from life philosophy ideal balance if available
            if (philosophy.getIdealBalance() != null) {
                for (Map.Entry<String, Object> entry : philosophy.getIdealBalance().entrySet()) {
                    if (entry.getValue() instanceof Map) {
                        Map<String, Object> balanceData = (Map<String, Object>) entry.getValue();
                        Object target = balanceData.get("target");
                        if (target != null) {
                            idealDistribution.put(entry.getKey(), target);
                        }
                    }
                }
            }
            
            // Also add from life areas
            for (LifeArea area : philosophy.getAreas()) {
                if (!idealDistribution.containsKey(area.getName())) {
                    idealDistribution.put(area.getName(), area.getTargetPercentage());
                }
            }
        }
        
        // If no life philosophy, provide defaults
        if (idealDistribution.isEmpty()) {
            idealDistribution.put("Work", 35.0);
            idealDistribution.put("Personal", 25.0);
            idealDistribution.put("Health", 20.0);
            idealDistribution.put("Social", 10.0);
            idealDistribution.put("Learning", 10.0);
        }
        
        return idealDistribution;
    }
    
    private Map<String, Object> calculateDeviation(Map<String, Object> actual, Map<String, Object> ideal) {
        Map<String, Object> deviation = new HashMap<>();
        
        // Calculate deviation for each area
        for (Map.Entry<String, Object> entry : ideal.entrySet()) {
            String area = entry.getKey();
            if (area.equals("totalHours") || area.equals("eventsCount")) {
                continue;
            }
            
            double idealValue = convertToDouble(entry.getValue());
            double actualValue = convertToDouble(actual.getOrDefault(area, 0.0));
            double deviationValue = actualValue - idealValue;
            
            deviation.put(area, Math.round(deviationValue * 10) / 10.0);
        }
        
        // Calculate overall deviation score
        double totalDeviation = 0;
        int count = 0;
        for (Object value : deviation.values()) {
            if (value instanceof Number) {
                totalDeviation += Math.abs(((Number) value).doubleValue());
                count++;
            }
        }
        
        if (count > 0) {
            deviation.put("average", Math.round(totalDeviation / count * 10) / 10.0);
        }
        
        return deviation;
    }
    
    private Float calculateBalanceScore(Map<String, Object> actual, Map<String, Object> ideal) {
        double totalDeviation = 0;
        int count = 0;
        
        for (Map.Entry<String, Object> entry : ideal.entrySet()) {
            String area = entry.getKey();
            if (area.equals("totalHours") || area.equals("eventsCount")) {
                continue;
            }
            
            double idealValue = convertToDouble(entry.getValue());
            double actualValue = convertToDouble(actual.getOrDefault(area, 0.0));
            
            // Calculate deviation as a percentage of ideal
            if (idealValue > 0) {
                double deviation = Math.abs(actualValue - idealValue) / idealValue;
                totalDeviation += deviation;
                count++;
            }
        }
        
        if (count == 0) {
            return 50.0f; // Default score if no data
        }
        
        // Calculate score (100 = perfect balance, 0 = completely off)
        double averageDeviation = totalDeviation / count;
        double score = Math.max(0, 100 * (1 - averageDeviation));
        
        return (float) Math.round(score);
    }
    
    private double convertToDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }
    
    @Cacheable(value = "analytics", key = "'weeklyReport:' + #userId", 
               unless = "#result == null")
    public Map<String, Object> generateWeeklyReport(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        LocalDateTime weekStart = LocalDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate().atStartOfDay();
        LocalDateTime weekEnd = weekStart.plusWeeks(1);
        
        List<Event> weekEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                userId, weekStart, weekEnd);
        
        Map<String, Object> report = new HashMap<>();
        
        // Basic statistics
        report.put("totalEvents", weekEvents.size());
        report.put("totalHours", calculateTotalHours(weekEvents));
        
        // Busiest day
        Map<DayOfWeek, Long> eventsByDay = weekEvents.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getStartTime().getDayOfWeek(),
                        Collectors.counting()
                ));
        
        eventsByDay.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .ifPresent(entry -> report.put("busiestDay", entry.getKey().toString()));
        
        // Most active time
        Map<Integer, Long> eventsByHour = weekEvents.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getStartTime().getHour(),
                        Collectors.counting()
                ));
        
        eventsByHour.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .ifPresent(entry -> report.put("mostActiveHour", entry.getKey()));
        
        // Life area breakdown
        Map<String, Object> areaBreakdown = calculateActualDistribution(weekEvents);
        report.put("areaDistribution", areaBreakdown);
        
        // Compare with previous week
        LocalDateTime prevWeekStart = weekStart.minusWeeks(1);
        LocalDateTime prevWeekEnd = weekEnd.minusWeeks(1);
        List<Event> prevWeekEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                userId, prevWeekStart, prevWeekEnd);
        
        report.put("weekOverWeekChange", Map.of(
                "events", weekEvents.size() - prevWeekEvents.size(),
                "hours", calculateTotalHours(weekEvents) - calculateTotalHours(prevWeekEvents)
        ));
        
        return report;
    }
    
    @Cacheable(value = "analytics", key = "'monthlyReport:' + #userId", 
               unless = "#result == null")
    public Map<String, Object> generateMonthlyReport(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        LocalDateTime monthStart = LocalDateTime.now()
                .withDayOfMonth(1)
                .toLocalDate().atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        
        List<Event> monthEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                userId, monthStart, monthEnd);
        
        Map<String, Object> report = new HashMap<>();
        
        // Basic statistics
        report.put("totalEvents", monthEvents.size());
        report.put("totalHours", calculateTotalHours(monthEvents));
        report.put("averageEventsPerDay", monthEvents.size() / 30.0);
        
        // Weekly breakdown
        Map<Integer, List<Event>> eventsByWeek = new HashMap<>();
        for (Event event : monthEvents) {
            int weekOfMonth = ((event.getStartTime().getDayOfMonth() - 1) / 7) + 1;
            eventsByWeek.computeIfAbsent(weekOfMonth, k -> new ArrayList<>()).add(event);
        }
        
        Map<String, Object> weeklyBreakdown = new HashMap<>();
        for (Map.Entry<Integer, List<Event>> entry : eventsByWeek.entrySet()) {
            weeklyBreakdown.put("week" + entry.getKey(), Map.of(
                    "events", entry.getValue().size(),
                    "hours", calculateTotalHours(entry.getValue())
            ));
        }
        report.put("weeklyBreakdown", weeklyBreakdown);
        
        // Goal achievement
        LifePhilosophy philosophy = user.getLifePhilosophy();
        if (philosophy != null) {
            Map<String, Object> goalAchievement = new HashMap<>();
            Map<String, Object> actualDist = calculateActualDistribution(monthEvents);
            
            for (LifeArea area : philosophy.getAreas()) {
                double actual = convertToDouble(actualDist.getOrDefault(area.getName(), 0.0));
                double target = area.getTargetPercentage();
                double achievement = target > 0 ? (actual / target) * 100 : 0;
                
                goalAchievement.put(area.getName(), Map.of(
                        "target", target,
                        "actual", actual,
                        "achievement", Math.round(achievement)
                ));
            }
            report.put("goalAchievement", goalAchievement);
        }
        
        // Trends
        report.put("trends", analyzeTrends(monthEvents));
        
        return report;
    }
    
    private double calculateTotalHours(List<Event> events) {
        return events.stream()
                .filter(e -> e.getStartTime() != null && e.getEndTime() != null)
                .mapToLong(e -> ChronoUnit.MINUTES.between(e.getStartTime(), e.getEndTime()))
                .sum() / 60.0;
    }
    
    private Map<String, Object> analyzeTrends(List<Event> events) {
        Map<String, Object> trends = new HashMap<>();
        
        // Group events by week
        Map<Integer, List<Event>> eventsByWeek = events.stream()
                .collect(Collectors.groupingBy(e -> 
                        e.getStartTime().get(java.time.temporal.WeekFields.ISO.weekOfMonth())
                ));
        
        // Check if workload is increasing/decreasing
        List<Integer> weeklyCounts = new ArrayList<>();
        for (int week = 1; week <= 4; week++) {
            weeklyCounts.add(eventsByWeek.getOrDefault(week, Collections.emptyList()).size());
        }
        
        boolean increasing = true;
        boolean decreasing = true;
        for (int i = 1; i < weeklyCounts.size(); i++) {
            if (weeklyCounts.get(i) < weeklyCounts.get(i - 1)) {
                increasing = false;
            }
            if (weeklyCounts.get(i) > weeklyCounts.get(i - 1)) {
                decreasing = false;
            }
        }
        
        if (increasing) {
            trends.put("workload", "increasing");
        } else if (decreasing) {
            trends.put("workload", "decreasing");
        } else {
            trends.put("workload", "stable");
        }
        
        // Weekend activity
        long weekendEvents = events.stream()
                .filter(e -> e.getStartTime().getDayOfWeek() == DayOfWeek.SATURDAY || 
                           e.getStartTime().getDayOfWeek() == DayOfWeek.SUNDAY)
                .count();
        
        trends.put("weekendActivity", weekendEvents > events.size() * 0.2 ? "active" : "light");
        
        return trends;
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