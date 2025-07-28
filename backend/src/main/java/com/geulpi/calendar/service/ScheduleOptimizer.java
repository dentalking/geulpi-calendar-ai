package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.TimeSlot;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.entity.UserPreferences;
import com.geulpi.calendar.domain.enums.Priority;
import com.geulpi.calendar.dto.AIInsight;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ScheduleOptimizer {
    
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    
    public ScheduleOptimizer(EventRepository eventRepository,
                           UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }
    
    public TodayAnalysis analyzeToday(String userId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
            userId, startOfDay, endOfDay
        );
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<BusyPeriod> busyPeriods = findBusyPeriods(events);
        List<TimeSlot> freeSlots = findFreeTimeSlots(events, startOfDay, endOfDay);
        List<String> optimizationSuggestions = generateSuggestions(events, user);
        
        return new TodayAnalysis(
            calculateBusyScore(events, user),
            suggestBreaks(busyPeriods, user.getPreferences()),
            findFocusSlots(freeSlots, user.getPreferences()),
            generateInsights(events, user)
        );
    }
    
    private List<BusyPeriod> findBusyPeriods(List<Event> events) {
        List<BusyPeriod> periods = new ArrayList<>();
        
        // Sort events by start time
        events.sort(Comparator.comparing(Event::getStartTime));
        
        // Find consecutive busy periods (less than 30 min break between events)
        LocalDateTime periodStart = null;
        LocalDateTime periodEnd = null;
        int eventCount = 0;
        
        for (Event event : events) {
            if (periodStart == null) {
                periodStart = event.getStartTime();
                periodEnd = event.getEndTime();
                eventCount = 1;
            } else {
                long gapMinutes = ChronoUnit.MINUTES.between(periodEnd, event.getStartTime());
                if (gapMinutes <= 30) {
                    // Extend current busy period
                    periodEnd = event.getEndTime();
                    eventCount++;
                } else {
                    // End current period and start new one
                    periods.add(new BusyPeriod(periodStart, periodEnd, eventCount));
                    periodStart = event.getStartTime();
                    periodEnd = event.getEndTime();
                    eventCount = 1;
                }
            }
        }
        
        if (periodStart != null) {
            periods.add(new BusyPeriod(periodStart, periodEnd, eventCount));
        }
        
        return periods;
    }
    
    private List<TimeSlot> findFreeTimeSlots(List<Event> events, LocalDateTime start, LocalDateTime end) {
        List<TimeSlot> freeSlots = new ArrayList<>();
        
        // Sort events by start time
        events.sort(Comparator.comparing(Event::getStartTime));
        
        LocalDateTime currentTime = start;
        for (Event event : events) {
            if (currentTime.isBefore(event.getStartTime())) {
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
        
        return freeSlots;
    }
    
    private double calculateBusyScore(List<Event> events, User user) {
        if (events.isEmpty()) return 0.0;
        
        long totalMinutes = events.stream()
            .mapToLong(e -> ChronoUnit.MINUTES.between(e.getStartTime(), e.getEndTime()))
            .sum();
        
        // Consider working hours (default 8 hours = 480 minutes)
        double workingMinutes = 480.0;
        if (user.getPreferences() != null && user.getPreferences().getWorkingHours() != null) {
            LocalTime start = user.getPreferences().getWorkingHours().getStart();
            LocalTime end = user.getPreferences().getWorkingHours().getEnd();
            workingMinutes = ChronoUnit.MINUTES.between(start, end);
        }
        
        return Math.min(100.0, (totalMinutes / workingMinutes) * 100);
    }
    
    private List<TimeSlot> suggestBreaks(List<BusyPeriod> busyPeriods, UserPreferences preferences) {
        List<TimeSlot> suggestedBreaks = new ArrayList<>();
        
        for (BusyPeriod period : busyPeriods) {
            long durationHours = ChronoUnit.HOURS.between(period.start, period.end);
            
            if (durationHours >= 3) {
                // Suggest a 15-minute break in the middle
                LocalDateTime breakStart = period.start.plusMinutes(
                    ChronoUnit.MINUTES.between(period.start, period.end) / 2
                );
                
                TimeSlot breakSlot = new TimeSlot();
                breakSlot.setStart(breakStart);
                breakSlot.setEnd(breakStart.plusMinutes(15));
                breakSlot.setAvailable(true);
                suggestedBreaks.add(breakSlot);
            }
        }
        
        return suggestedBreaks;
    }
    
    private List<TimeSlot> findFocusSlots(List<TimeSlot> freeSlots, UserPreferences preferences) {
        // Find slots that are at least 90 minutes for deep focus work
        return freeSlots.stream()
            .filter(slot -> ChronoUnit.MINUTES.between(slot.getStart(), slot.getEnd()) >= 90)
            .sorted((a, b) -> {
                // Prefer morning slots for focus work
                int hourA = a.getStart().getHour();
                int hourB = b.getStart().getHour();
                
                // Morning (9-12) is best for focus
                int scoreA = (hourA >= 9 && hourA <= 12) ? 10 : 5;
                int scoreB = (hourB >= 9 && hourB <= 12) ? 10 : 5;
                
                return Integer.compare(scoreB, scoreA);
            })
            .limit(3)
            .collect(Collectors.toList());
    }
    
    private List<AIInsight> generateInsights(List<Event> events, User user) {
        List<AIInsight> insights = new ArrayList<>();
        
        // Check for back-to-back meetings
        int backToBackCount = 0;
        for (int i = 0; i < events.size() - 1; i++) {
            if (events.get(i).getEndTime().equals(events.get(i + 1).getStartTime())) {
                backToBackCount++;
            }
        }
        
        if (backToBackCount >= 3) {
            insights.add(new AIInsight(
                UUID.randomUUID().toString(),
                com.geulpi.calendar.domain.enums.InsightType.OPTIMIZATION_OPPORTUNITY,
                "You have " + backToBackCount + " back-to-back meetings. Consider adding buffer time between meetings.",
                Priority.HIGH,
                true
            ));
        }
        
        // Check for late working hours
        Optional<Event> lateEvent = events.stream()
            .filter(e -> e.getEndTime().getHour() >= 19)
            .findAny();
        
        if (lateEvent.isPresent()) {
            insights.add(new AIInsight(
                UUID.randomUUID().toString(),
                com.geulpi.calendar.domain.enums.InsightType.BURNOUT_RISK,
                "You have events scheduled after 7 PM. Remember to maintain work-life balance.",
                Priority.MEDIUM,
                true
            ));
        }
        
        // Check for focus time
        List<TimeSlot> freeSlots = findFreeTimeSlots(events, 
            LocalDate.now().atStartOfDay(), 
            LocalDate.now().atTime(LocalTime.MAX)
        );
        
        boolean hasFocusTime = freeSlots.stream()
            .anyMatch(slot -> ChronoUnit.MINUTES.between(slot.getStart(), slot.getEnd()) >= 90);
        
        if (!hasFocusTime) {
            insights.add(new AIInsight(
                UUID.randomUUID().toString(),
                com.geulpi.calendar.domain.enums.InsightType.OPTIMIZATION_OPPORTUNITY,
                "No long focus time blocks available today. Consider blocking time for deep work.",
                Priority.HIGH,
                true
            ));
        }
        
        return insights;
    }
    
    private List<String> generateSuggestions(List<Event> events, User user) {
        List<String> suggestions = new ArrayList<>();
        
        // Analyze event distribution
        Map<Integer, Long> hourDistribution = events.stream()
            .collect(Collectors.groupingBy(
                e -> e.getStartTime().getHour(),
                Collectors.counting()
            ));
        
        // Check for overloaded hours
        hourDistribution.forEach((hour, count) -> {
            if (count >= 3) {
                suggestions.add(String.format(
                    "Hour %d:00-%d:00 has %d events. Consider redistributing some meetings.",
                    hour, hour + 1, count
                ));
            }
        });
        
        return suggestions;
    }
    
    public static class TodayAnalysis {
        private final double busyScore;
        private final List<TimeSlot> recommendedBreaks;
        private final List<TimeSlot> optimalFocusTime;
        private final List<AIInsight> aiInsights;
        
        public TodayAnalysis(double busyScore, List<TimeSlot> recommendedBreaks,
                           List<TimeSlot> optimalFocusTime, List<AIInsight> aiInsights) {
            this.busyScore = busyScore;
            this.recommendedBreaks = recommendedBreaks;
            this.optimalFocusTime = optimalFocusTime;
            this.aiInsights = aiInsights;
        }
        
        public double getBusyScore() { return busyScore; }
        public List<TimeSlot> getRecommendedBreaks() { return recommendedBreaks; }
        public List<TimeSlot> getOptimalFocusTime() { return optimalFocusTime; }
        public List<AIInsight> getAiInsights() { return aiInsights; }
    }
    
    private static class BusyPeriod {
        private final LocalDateTime start;
        private final LocalDateTime end;
        private final int eventCount;
        
        public BusyPeriod(LocalDateTime start, LocalDateTime end, int eventCount) {
            this.start = start;
            this.end = end;
            this.eventCount = eventCount;
        }
    }
}