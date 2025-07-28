package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.PatternRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarAnalysisService {
    
    private final EventRepository eventRepository;
    private final PatternRepository patternRepository;
    
    @Transactional
    public List<Pattern> analyzeCalendarData(User user, LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Analyzing calendar data for user {} from {} to {}", 
                user.getId(), startDate, endDate);
        
        // Fetch all events in the date range
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                user.getId(), startDate, endDate);
        
        if (events.isEmpty()) {
            log.info("No events found for analysis");
            return new ArrayList<>();
        }
        
        List<Pattern> patterns = new ArrayList<>();
        
        // Analyze different types of patterns
        patterns.addAll(analyzeRecurringMeetings(user, events));
        patterns.addAll(analyzeTimePreferences(user, events));
        patterns.addAll(analyzeLifeAreaDistribution(user, events));
        patterns.addAll(analyzeWorkPatterns(user, events));
        patterns.addAll(analyzeMeetingDurations(user, events));
        
        // Save all patterns
        return patternRepository.saveAll(patterns);
    }
    
    private List<Pattern> analyzeRecurringMeetings(User user, List<Event> events) {
        List<Pattern> patterns = new ArrayList<>();
        
        // Group events by title (case-insensitive)
        Map<String, List<Event>> eventsByTitle = events.stream()
                .filter(e -> e.getTitle() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getTitle().toLowerCase().trim()
                ));
        
        for (Map.Entry<String, List<Event>> entry : eventsByTitle.entrySet()) {
            List<Event> similarEvents = entry.getValue();
            
            if (similarEvents.size() >= 3) { // At least 3 occurrences to be a pattern
                // Analyze time patterns
                Map<DayOfWeek, List<Event>> byDayOfWeek = similarEvents.stream()
                        .collect(Collectors.groupingBy(
                                e -> e.getStartTime().getDayOfWeek()
                        ));
                
                for (Map.Entry<DayOfWeek, List<Event>> dayEntry : byDayOfWeek.entrySet()) {
                    if (dayEntry.getValue().size() >= 2) {
                        // Calculate average time
                        double avgHour = dayEntry.getValue().stream()
                                .mapToInt(e -> e.getStartTime().getHour() * 60 + e.getStartTime().getMinute())
                                .average()
                                .orElse(0);
                        
                        int hour = (int) (avgHour / 60);
                        int minute = (int) (avgHour % 60);
                        
                        Pattern pattern = Pattern.builder()
                                .user(user)
                                .name("Recurring: " + entry.getKey())
                                .description(String.format("You often have '%s' on %s around %02d:%02d",
                                        entry.getKey(), dayEntry.getKey(), hour, minute))
                                .frequency((float) dayEntry.getValue().size() / similarEvents.size())
                                .confidence(0.8f)
                                .timeSlots(List.of(TimeSlot.builder()
                                        .start(LocalDateTime.now()
                                                .with(dayEntry.getKey())
                                                .withHour(hour)
                                                .withMinute(minute)
                                                .withSecond(0)
                                                .withNano(0))
                                        .end(LocalDateTime.now()
                                                .with(dayEntry.getKey())
                                                .withHour(hour)
                                                .withMinute(minute)
                                                .withSecond(0)
                                                .withNano(0)
                                                .plusHours(1))
                                        .available(false)
                                        .build()))
                                .build();
                        
                        patterns.add(pattern);
                    }
                }
            }
        }
        
        return patterns;
    }
    
    private List<Pattern> analyzeTimePreferences(User user, List<Event> events) {
        List<Pattern> patterns = new ArrayList<>();
        
        // Analyze morning vs afternoon vs evening preferences
        Map<String, Integer> timeOfDayCount = new HashMap<>();
        timeOfDayCount.put("morning", 0);    // 6-12
        timeOfDayCount.put("afternoon", 0);  // 12-17
        timeOfDayCount.put("evening", 0);    // 17-22
        
        for (Event event : events) {
            int hour = event.getStartTime().getHour();
            if (hour >= 6 && hour < 12) {
                timeOfDayCount.put("morning", timeOfDayCount.get("morning") + 1);
            } else if (hour >= 12 && hour < 17) {
                timeOfDayCount.put("afternoon", timeOfDayCount.get("afternoon") + 1);
            } else if (hour >= 17 && hour < 22) {
                timeOfDayCount.put("evening", timeOfDayCount.get("evening") + 1);
            }
        }
        
        int total = events.size();
        for (Map.Entry<String, Integer> entry : timeOfDayCount.entrySet()) {
            if (entry.getValue() > total * 0.4) { // More than 40% in this time period
                Pattern pattern = Pattern.builder()
                        .user(user)
                        .name(entry.getKey().substring(0, 1).toUpperCase() + entry.getKey().substring(1) + " Person")
                        .description("You tend to schedule most activities in the " + entry.getKey())
                        .frequency((float) entry.getValue() / total)
                        .confidence(0.7f)
                        .timeSlots(new ArrayList<>())
                        .build();
                
                patterns.add(pattern);
            }
        }
        
        return patterns;
    }
    
    private List<Pattern> analyzeLifeAreaDistribution(User user, List<Event> events) {
        List<Pattern> patterns = new ArrayList<>();
        
        // Group by life area
        Map<LifeArea, Long> areaCount = events.stream()
                .filter(e -> e.getArea() != null)
                .collect(Collectors.groupingBy(Event::getArea, Collectors.counting()));
        
        if (!areaCount.isEmpty()) {
            long total = areaCount.values().stream().mapToLong(Long::longValue).sum();
            
            for (Map.Entry<LifeArea, Long> entry : areaCount.entrySet()) {
                float percentage = (float) entry.getValue() / total;
                
                if (percentage > 0.3f) { // More than 30% in this area
                    Pattern pattern = Pattern.builder()
                            .user(user)
                            .name(entry.getKey().getName() + " Focus")
                            .description(String.format("%.0f%% of your time is spent on %s activities",
                                    percentage * 100, entry.getKey().getName()))
                            .frequency(percentage)
                            .confidence(0.9f)
                            .timeSlots(new ArrayList<>())
                            .build();
                    
                    patterns.add(pattern);
                }
            }
        }
        
        return patterns;
    }
    
    private List<Pattern> analyzeWorkPatterns(User user, List<Event> events) {
        List<Pattern> patterns = new ArrayList<>();
        
        // Analyze working days
        Map<DayOfWeek, Long> dayCount = events.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getStartTime().getDayOfWeek(),
                        Collectors.counting()
                ));
        
        // Find busiest days
        long maxEvents = dayCount.values().stream().max(Long::compare).orElse(0L);
        
        for (Map.Entry<DayOfWeek, Long> entry : dayCount.entrySet()) {
            if (entry.getValue() >= maxEvents * 0.8) { // Within 80% of max
                Pattern pattern = Pattern.builder()
                        .user(user)
                        .name("Busy " + entry.getKey())
                        .description(entry.getKey() + " is typically your busiest day")
                        .frequency((float) entry.getValue() / events.size())
                        .confidence(0.75f)
                        .timeSlots(List.of(TimeSlot.builder()
                                .start(LocalDateTime.now()
                                        .with(entry.getKey())
                                        .withHour(9)
                                        .withMinute(0)
                                        .withSecond(0)
                                        .withNano(0))
                                .end(LocalDateTime.now()
                                        .with(entry.getKey())
                                        .withHour(18)
                                        .withMinute(0)
                                        .withSecond(0)
                                        .withNano(0))
                                .available(true)
                                .build()))
                        .build();
                
                patterns.add(pattern);
            }
        }
        
        // Analyze work-life balance by time
        long weekdayEvents = events.stream()
                .filter(e -> e.getStartTime().getDayOfWeek().getValue() <= 5)
                .count();
        long weekendEvents = events.size() - weekdayEvents;
        
        if (weekendEvents > 0 && weekdayEvents > 0) {
            float weekendRatio = (float) weekendEvents / events.size();
            
            if (weekendRatio < 0.1) {
                Pattern pattern = Pattern.builder()
                        .user(user)
                        .name("Weekday Focused")
                        .description("You rarely schedule activities on weekends")
                        .frequency(1 - weekendRatio)
                        .confidence(0.8f)
                        .timeSlots(new ArrayList<>())
                        .build();
                
                patterns.add(pattern);
            } else if (weekendRatio > 0.3) {
                Pattern pattern = Pattern.builder()
                        .user(user)
                        .name("Active Weekends")
                        .description("You maintain an active schedule even on weekends")
                        .frequency(weekendRatio)
                        .confidence(0.8f)
                        .timeSlots(new ArrayList<>())
                        .build();
                
                patterns.add(pattern);
            }
        }
        
        return patterns;
    }
    
    private List<Pattern> analyzeMeetingDurations(User user, List<Event> events) {
        List<Pattern> patterns = new ArrayList<>();
        
        // Calculate average meeting duration
        List<Long> durations = events.stream()
                .filter(e -> e.getStartTime() != null && e.getEndTime() != null)
                .map(e -> ChronoUnit.MINUTES.between(e.getStartTime(), e.getEndTime()))
                .filter(d -> d > 0 && d <= 480) // Between 0 and 8 hours
                .collect(Collectors.toList());
        
        if (!durations.isEmpty()) {
            double avgDuration = durations.stream()
                    .mapToLong(Long::longValue)
                    .average()
                    .orElse(0);
            
            // Count meetings by duration buckets
            Map<String, Long> durationBuckets = new HashMap<>();
            durationBuckets.put("short", durations.stream().filter(d -> d <= 30).count());
            durationBuckets.put("medium", durations.stream().filter(d -> d > 30 && d <= 60).count());
            durationBuckets.put("long", durations.stream().filter(d -> d > 60).count());
            
            // Find dominant duration type
            String dominantType = durationBuckets.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("medium");
            
            String description = switch (dominantType) {
                case "short" -> "You prefer quick, focused meetings (usually under 30 minutes)";
                case "long" -> "You tend to have longer, in-depth meetings (over 1 hour)";
                default -> "Your meetings typically last 30-60 minutes";
            };
            
            Pattern pattern = Pattern.builder()
                    .user(user)
                    .name("Meeting Duration Preference")
                    .description(description)
                    .frequency((float) durationBuckets.get(dominantType) / durations.size())
                    .confidence(0.85f)
                    .timeSlots(new ArrayList<>())
                    .build();
            
            patterns.add(pattern);
        }
        
        return patterns;
    }
}