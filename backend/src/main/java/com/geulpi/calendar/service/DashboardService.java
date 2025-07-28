package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.TimeSlot;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.enums.TimePeriod;
import com.geulpi.calendar.domain.enums.InsightType;
import com.geulpi.calendar.domain.enums.Priority;
import com.geulpi.calendar.dto.*;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.UserRepository;
import com.geulpi.calendar.repository.InsightRepository;
import com.geulpi.calendar.repository.LifeAreaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {
    
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final InsightRepository insightRepository;
    private final LifeAreaRepository lifeAreaRepository;
    private final TimeBalanceService timeBalanceService;
    private ScheduleOptimizer scheduleOptimizer;
    
    public DashboardService(EventRepository eventRepository, 
                           UserRepository userRepository,
                           InsightRepository insightRepository,
                           LifeAreaRepository lifeAreaRepository,
                           TimeBalanceService timeBalanceService) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.insightRepository = insightRepository;
        this.lifeAreaRepository = lifeAreaRepository;
        this.timeBalanceService = timeBalanceService;
    }
    
    public void setScheduleOptimizer(ScheduleOptimizer scheduleOptimizer) {
        this.scheduleOptimizer = scheduleOptimizer;
    }
    
    public TodaySchedule getTodaySchedule(String userId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        
        // Get today's events
        List<Event> todayEvents = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
            userId, startOfDay, endOfDay
        );
        
        // Calculate busy hours
        double busyHours = calculateBusyHours(todayEvents);
        
        // Find free time slots
        List<TimeSlot> freeSlots = findFreeTimeSlots(todayEvents, startOfDay, endOfDay);
        
        // Get daily goal from user preferences or generate one
        String dailyGoal = generateDailyGoal(userId, todayEvents);
        
        return new TodaySchedule(
            startOfDay,
            todayEvents,
            todayEvents.size(),
            busyHours,
            freeSlots,
            dailyGoal
        );
    }
    
    public LifeBalanceAnalytics getLifeBalanceAnalytics(String userId, TimePeriod period) {
        LocalDateTime startDate = getStartDateForPeriod(period);
        LocalDateTime endDate = LocalDateTime.now();
        
        // Get events for the period
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
            userId, startDate, endDate
        );
        
        // Get user's life areas
        List<LifeArea> lifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(userId);
        
        // Calculate balance for each area
        List<AreaBalance> areaBalances = calculateAreaBalances(events, lifeAreas);
        
        // Generate recommendations
        List<String> recommendations = generateRecommendations(areaBalances);
        
        // Calculate overall score
        double score = calculateBalanceScore(areaBalances);
        
        return new LifeBalanceAnalytics(areaBalances, recommendations, score);
    }
    
    public List<AIInsight> getDailyInsights(String userId) {
        // Get recent insights from database
        List<Insight> recentInsights = insightRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId);
        
        // Convert to DTOs
        List<AIInsight> aiInsights = recentInsights.stream()
            .map(this::convertToAIInsight)
            .collect(Collectors.toList());
        
        // Generate additional real-time insights if needed
        if (aiInsights.size() < 3) {
            aiInsights.addAll(generateRealTimeInsights(userId));
        }
        
        return aiInsights;
    }
    
    private double calculateBusyHours(List<Event> events) {
        return events.stream()
            .mapToLong(event -> ChronoUnit.MINUTES.between(
                event.getStartTime(), 
                event.getEndTime()
            ))
            .sum() / 60.0;
    }
    
    private List<TimeSlot> findFreeTimeSlots(List<Event> events, LocalDateTime start, LocalDateTime end) {
        List<TimeSlot> freeSlots = new ArrayList<>();
        
        // Sort events by start time
        events.sort(Comparator.comparing(Event::getStartTime));
        
        LocalDateTime currentTime = start;
        for (Event event : events) {
            if (currentTime.isBefore(event.getStartTime())) {
                // Found a free slot
                TimeSlot slot = new TimeSlot();
                slot.setStart(currentTime);
                slot.setEnd(event.getStartTime());
                slot.setAvailable(true);
                freeSlots.add(slot);
            }
            currentTime = event.getEndTime();
        }
        
        // Check for free time after last event
        if (currentTime.isBefore(end)) {
            TimeSlot slot = new TimeSlot();
            slot.setStart(currentTime);
            slot.setEnd(end);
            slot.setAvailable(true);
            freeSlots.add(slot);
        }
        
        // Filter out very short slots (less than 15 minutes)
        return freeSlots.stream()
            .filter(slot -> ChronoUnit.MINUTES.between(slot.getStart(), slot.getEnd()) >= 15)
            .collect(Collectors.toList());
    }
    
    private String generateDailyGoal(String userId, List<Event> events) {
        // This could be enhanced with AI analysis
        if (events.isEmpty()) {
            return "Take time to plan your day and set priorities";
        } else if (events.size() > 8) {
            return "Focus on completing high-priority tasks efficiently";
        } else {
            return "Balance productivity with well-being throughout the day";
        }
    }
    
    private LocalDateTime getStartDateForPeriod(TimePeriod period) {
        LocalDateTime now = LocalDateTime.now();
        switch (period) {
            case TODAY:
                return now.toLocalDate().atStartOfDay();
            case THIS_WEEK:
                return now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();
            case THIS_MONTH:
                return now.withDayOfMonth(1).toLocalDate().atStartOfDay();
            case LAST_7_DAYS:
                return now.minusDays(7);
            case LAST_30_DAYS:
                return now.minusDays(30);
            default:
                return now.minusDays(7);
        }
    }
    
    private List<AreaBalance> calculateAreaBalances(List<Event> events, List<LifeArea> lifeAreas) {
        Map<String, Integer> areaMinutes = new HashMap<>();
        int totalMinutes = 0;
        
        // Calculate minutes per area
        for (Event event : events) {
            if (event.getArea() != null) {
                long minutes = ChronoUnit.MINUTES.between(event.getStartTime(), event.getEndTime());
                areaMinutes.merge(event.getArea().getId(), (int) minutes, Integer::sum);
                totalMinutes += minutes;
            }
        }
        
        // Create balance for each area
        List<AreaBalance> balances = new ArrayList<>();
        for (LifeArea area : lifeAreas) {
            int minutes = areaMinutes.getOrDefault(area.getId(), 0);
            double actualPercentage = totalMinutes > 0 ? (minutes * 100.0 / totalMinutes) : 0;
            double deviation = actualPercentage - area.getTargetPercentage();
            
            AreaBalance balance = new AreaBalance(
                area,
                actualPercentage,
                area.getTargetPercentage(),
                deviation,
                minutes
            );
            balances.add(balance);
        }
        
        return balances;
    }
    
    private List<String> generateRecommendations(List<AreaBalance> areaBalances) {
        List<String> recommendations = new ArrayList<>();
        
        for (AreaBalance balance : areaBalances) {
            if (balance.getDeviation() < -10) {
                recommendations.add(String.format(
                    "Consider scheduling more time for %s (currently %.1f%% below target)",
                    balance.getArea().getName(),
                    Math.abs(balance.getDeviation())
                ));
            } else if (balance.getDeviation() > 20) {
                recommendations.add(String.format(
                    "%s is taking %.1f%% more time than planned - consider delegation or optimization",
                    balance.getArea().getName(),
                    balance.getDeviation()
                ));
            }
        }
        
        if (recommendations.isEmpty()) {
            recommendations.add("Great job maintaining balance across all life areas!");
        }
        
        return recommendations;
    }
    
    private double calculateBalanceScore(List<AreaBalance> areaBalances) {
        double totalDeviation = areaBalances.stream()
            .mapToDouble(b -> Math.abs(b.getDeviation()))
            .sum();
        
        // Score calculation: 100 - average deviation, minimum 0
        double averageDeviation = totalDeviation / areaBalances.size();
        return Math.max(0, 100 - averageDeviation);
    }
    
    private AIInsight convertToAIInsight(Insight insight) {
        return new AIInsight(
            insight.getId(),
            insight.getType(),
            insight.getDescription(),
            determinePriority(insight),
            insight.isActionable()
        );
    }
    
    private Priority determinePriority(Insight insight) {
        switch (insight.getSeverity()) {
            case CRITICAL:
                return Priority.CRITICAL;
            case ERROR:
                return Priority.HIGH;
            case WARNING:
                return Priority.MEDIUM;
            default:
                return Priority.LOW;
        }
    }
    
    private List<AIInsight> generateRealTimeInsights(String userId) {
        List<AIInsight> insights = new ArrayList<>();
        
        // Use ScheduleOptimizer if available for more sophisticated insights
        if (scheduleOptimizer != null) {
            ScheduleOptimizer.TodayAnalysis analysis = scheduleOptimizer.analyzeToday(userId);
            insights.addAll(analysis.getAiInsights());
        } else {
            // Fallback to basic insights
            TodaySchedule todaySchedule = getTodaySchedule(userId);
            
            if (todaySchedule.getBusyHours() > 10) {
                insights.add(new AIInsight(
                    UUID.randomUUID().toString(),
                    InsightType.BURNOUT_RISK,
                    "You have over 10 hours scheduled today. Consider rescheduling non-critical tasks.",
                    Priority.HIGH,
                    true
                ));
            }
            
            if (todaySchedule.getFreeTimeSlots().isEmpty()) {
                insights.add(new AIInsight(
                    UUID.randomUUID().toString(),
                    InsightType.OPTIMIZATION_OPPORTUNITY,
                    "No breaks scheduled today. Remember to take short breaks for better productivity.",
                    Priority.MEDIUM,
                    true
                ));
            }
        }
        
        return insights;
    }
}