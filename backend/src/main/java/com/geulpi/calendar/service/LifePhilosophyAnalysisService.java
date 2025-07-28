package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.repository.LifeAreaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LifePhilosophyAnalysisService {
    
    private final LifeAreaRepository lifeAreaRepository;
    
    @Transactional
    public void analyzeAndSuggestLifeAreas(User user, List<Pattern> patterns, List<Event> events) {
        log.info("Analyzing life areas based on patterns for user {}", user.getId());
        
        LifePhilosophy lifePhilosophy = user.getLifePhilosophy();
        if (lifePhilosophy == null) {
            log.warn("User {} has no life philosophy set", user.getId());
            return;
        }
        
        // Analyze current time distribution from events
        Map<String, Float> currentDistribution = analyzeCurrentDistribution(events);
        
        // Suggest ideal balance based on patterns
        Map<String, Float> suggestedBalance = suggestIdealBalance(patterns, currentDistribution);
        
        // Update life philosophy with insights
        updateLifePhilosophyInsights(lifePhilosophy, currentDistribution, suggestedBalance);
        
        // Suggest missing life areas if needed
        suggestMissingLifeAreas(lifePhilosophy, patterns, currentDistribution);
    }
    
    private Map<String, Float> analyzeCurrentDistribution(List<Event> events) {
        Map<String, Long> areaEventCount = events.stream()
                .filter(e -> e.getArea() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getArea().getName(),
                        Collectors.counting()
                ));
        
        long totalEvents = areaEventCount.values().stream().mapToLong(Long::longValue).sum();
        
        Map<String, Float> distribution = new HashMap<>();
        for (Map.Entry<String, Long> entry : areaEventCount.entrySet()) {
            distribution.put(entry.getKey(), (float) entry.getValue() / totalEvents * 100);
        }
        
        return distribution;
    }
    
    private Map<String, Float> suggestIdealBalance(List<Pattern> patterns, Map<String, Float> currentDistribution) {
        Map<String, Float> suggestedBalance = new HashMap<>();
        
        // Base suggestions on detected patterns
        boolean hasWorkFocus = patterns.stream()
                .anyMatch(p -> p.getName().toLowerCase().contains("work") || 
                             p.getName().toLowerCase().contains("weekday focused"));
        
        boolean hasActiveWeekends = patterns.stream()
                .anyMatch(p -> p.getName().toLowerCase().contains("active weekends"));
        
        boolean isMorningPerson = patterns.stream()
                .anyMatch(p -> p.getName().toLowerCase().contains("morning person"));
        
        // Default balanced distribution
        suggestedBalance.put("Work", 35f);
        suggestedBalance.put("Personal", 25f);
        suggestedBalance.put("Health", 15f);
        suggestedBalance.put("Social", 15f);
        suggestedBalance.put("Learning", 10f);
        
        // Adjust based on patterns
        if (hasWorkFocus) {
            suggestedBalance.put("Work", 40f);
            suggestedBalance.put("Personal", 20f);
        }
        
        if (hasActiveWeekends) {
            suggestedBalance.put("Personal", suggestedBalance.get("Personal") + 5f);
            suggestedBalance.put("Health", suggestedBalance.get("Health") + 5f);
            suggestedBalance.put("Work", suggestedBalance.get("Work") - 10f);
        }
        
        if (isMorningPerson) {
            // Morning people often have better health habits
            suggestedBalance.put("Health", suggestedBalance.get("Health") + 5f);
        }
        
        // Normalize to 100%
        float total = suggestedBalance.values().stream().reduce(0f, Float::sum);
        suggestedBalance.replaceAll((k, v) -> v / total * 100);
        
        return suggestedBalance;
    }
    
    private void updateLifePhilosophyInsights(LifePhilosophy lifePhilosophy, 
                                            Map<String, Float> currentDistribution,
                                            Map<String, Float> suggestedBalance) {
        Map<String, Object> idealBalance = new HashMap<>();
        
        // Update ideal balance in life philosophy
        for (LifeArea area : lifePhilosophy.getAreas()) {
            String areaName = area.getName();
            
            // Get suggested percentage for this area
            Float suggested = suggestedBalance.getOrDefault(areaName, area.getTargetPercentage());
            Float current = currentDistribution.getOrDefault(areaName, 0f);
            
            idealBalance.put(areaName.toLowerCase(), Map.of(
                    "target", suggested,
                    "current", current,
                    "gap", Math.abs(suggested - current)
            ));
            
            // Update area target percentage
            area.setTargetPercentage(suggested);
        }
        
        lifePhilosophy.setIdealBalance(idealBalance);
    }
    
    private void suggestMissingLifeAreas(LifePhilosophy lifePhilosophy, 
                                        List<Pattern> patterns,
                                        Map<String, Float> currentDistribution) {
        Set<String> existingAreaNames = lifePhilosophy.getAreas().stream()
                .map(LifeArea::getName)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
        
        // Common life areas that might be missing
        Map<String, String> commonAreas = Map.of(
                "health", "#4CAF50",
                "learning", "#2196F3",
                "social", "#FF9800",
                "personal", "#9C27B0",
                "family", "#E91E63"
        );
        
        for (Map.Entry<String, String> entry : commonAreas.entrySet()) {
            String areaName = entry.getKey();
            String color = entry.getValue();
            
            if (!existingAreaNames.contains(areaName)) {
                // Check if patterns suggest this area should exist
                boolean shouldAdd = false;
                
                if (areaName.equals("health") && patterns.stream()
                        .anyMatch(p -> p.getName().toLowerCase().contains("morning"))) {
                    shouldAdd = true;
                } else if (areaName.equals("social") && currentDistribution.keySet().stream()
                        .anyMatch(k -> k.toLowerCase().contains("meeting"))) {
                    shouldAdd = true;
                }
                
                if (shouldAdd) {
                    LifeArea newArea = LifeArea.builder()
                            .lifePhilosophy(lifePhilosophy)
                            .name(areaName.substring(0, 1).toUpperCase() + areaName.substring(1))
                            .color(color)
                            .icon(getIconForArea(areaName))
                            .targetPercentage(10f)
                            .description("Auto-suggested based on your calendar patterns")
                            .build();
                    
                    lifeAreaRepository.save(newArea);
                    log.info("Added suggested life area '{}' for user {}", areaName, lifePhilosophy.getUser().getId());
                }
            }
        }
    }
    
    private String getIconForArea(String areaName) {
        return switch (areaName.toLowerCase()) {
            case "health" -> "heart";
            case "learning" -> "book";
            case "social" -> "users";
            case "personal" -> "user";
            case "family" -> "home";
            default -> "circle";
        };
    }
}