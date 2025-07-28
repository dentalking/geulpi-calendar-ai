package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.domain.enums.*;
import com.geulpi.calendar.dto.AIResponse;
import com.geulpi.calendar.dto.ml.MLResponse;
import com.geulpi.calendar.external.OpenAIClient;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.LifeAreaRepository;
import com.geulpi.calendar.repository.SuggestionRepository;
import com.geulpi.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NaturalLanguageProcessingService {
    
    private final OpenAIClient openAIClient;
    private final MLService mlService;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final LifeAreaRepository lifeAreaRepository;
    private final SuggestionRepository suggestionRepository;
    private final EventService eventService;
    
    @Transactional
    public AIResponse processNaturalLanguage(String userId, String input) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            // Step 1: Analyze intent with OpenAI
            OpenAIClient.NLPAnalysisResult analysisResult = openAIClient.analyzeIntent(input);
            
            log.info("OpenAI analysis - Intent: {}, Clarification needed: {}", 
                    analysisResult.intent, analysisResult.clarificationNeeded);
            
            // If clarification is needed, return immediately
            if (analysisResult.clarificationNeeded) {
                return AIResponse.builder()
                        .understood(true)
                        .intent(analysisResult.intent)
                        .events(new ArrayList<>())
                        .suggestions(new ArrayList<>())
                        .message(analysisResult.message)
                        .clarificationNeeded(true)
                        .clarificationPrompts(analysisResult.clarificationPrompts)
                        .build();
            }
            
            // Step 2: Send to ML server for detailed processing
            CompletableFuture<MLResponse.NLPResponse> mlFuture = mlService.processNLPRequest(
                    userId, input, analysisResult.intent.name(), analysisResult.entities
            );
            
            // Step 3: Process based on intent
            List<Event> events = new ArrayList<>();
            List<Suggestion> suggestions = new ArrayList<>();
            String responseMessage = analysisResult.message;
            
            switch (analysisResult.intent) {
                case CREATE_EVENT:
                    events = handleCreateEvent(user, analysisResult, mlFuture);
                    responseMessage = events.isEmpty() ? 
                            "I couldn't create the event. Please provide more details." :
                            "I've created the event \"" + events.get(0).getTitle() + "\" for you.";
                    break;
                    
                case UPDATE_EVENT:
                    events = handleUpdateEvent(user, analysisResult, mlFuture);
                    responseMessage = events.isEmpty() ? 
                            "I couldn't find the event to update." :
                            "I've updated the event for you.";
                    break;
                    
                case DELETE_EVENT:
                    boolean deleted = handleDeleteEvent(user, analysisResult);
                    responseMessage = deleted ? 
                            "I've deleted the event." :
                            "I couldn't find the event to delete.";
                    break;
                    
                case QUERY_SCHEDULE:
                    events = handleQuerySchedule(user, analysisResult);
                    responseMessage = events.isEmpty() ? 
                            "You don't have any events in the specified time range." :
                            "Here are your upcoming events.";
                    break;
                    
                case ANALYZE_TIME:
                    responseMessage = handleAnalyzeTime(user, analysisResult);
                    break;
                    
                case REQUEST_SUGGESTION:
                    suggestions = handleRequestSuggestion(user, analysisResult, mlFuture);
                    responseMessage = suggestions.isEmpty() ? 
                            "I don't have any suggestions at the moment." :
                            "Here are my suggestions for you.";
                    break;
                    
                default:
                    responseMessage = "I'm not sure how to help with that. Could you please rephrase?";
                    break;
            }
            
            return AIResponse.builder()
                    .understood(true)
                    .intent(analysisResult.intent)
                    .events(events)
                    .suggestions(suggestions)
                    .message(responseMessage)
                    .clarificationNeeded(false)
                    .clarificationPrompts(new ArrayList<>())
                    .build();
            
        } catch (Exception e) {
            log.error("Error processing natural language: {}", e.getMessage(), e);
            return AIResponse.builder()
                    .understood(false)
                    .intent(Intent.UNKNOWN)
                    .events(new ArrayList<>())
                    .suggestions(new ArrayList<>())
                    .message("I encountered an error processing your request. Please try again.")
                    .clarificationNeeded(false)
                    .clarificationPrompts(new ArrayList<>())
                    .build();
        }
    }
    
    private List<Event> handleCreateEvent(User user, OpenAIClient.NLPAnalysisResult analysisResult,
                                        CompletableFuture<MLResponse.NLPResponse> mlFuture) {
        List<Event> createdEvents = new ArrayList<>();
        
        try {
            // Wait for ML response with timeout
            MLResponse.NLPResponse mlResponse = mlFuture.get(5, java.util.concurrent.TimeUnit.SECONDS);
            
            if (mlResponse != null && mlResponse.getSuggestedEvents() != null) {
                // Create events from ML suggestions
                for (MLResponse.EventData eventData : mlResponse.getSuggestedEvents()) {
                    Event event = createEventFromMLData(user, eventData);
                    createdEvents.add(eventRepository.save(event));
                }
            } else {
                // Fallback to basic event creation from extracted entities
                Event event = createEventFromEntities(user, analysisResult.entities);
                if (event != null) {
                    createdEvents.add(eventRepository.save(event));
                }
            }
            
        } catch (Exception e) {
            log.warn("ML processing failed or timed out, using fallback: {}", e.getMessage());
            // Create basic event from extracted entities
            Event event = createEventFromEntities(user, analysisResult.entities);
            if (event != null) {
                createdEvents.add(eventRepository.save(event));
            }
        }
        
        return createdEvents;
    }
    
    private Event createEventFromMLData(User user, MLResponse.EventData eventData) {
        List<LifeArea> userLifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(user.getId());
        LifeArea lifeArea = userLifeAreas.isEmpty() ? null : userLifeAreas.get(0);
        
        if (eventData.getLifeAreaId() != null) {
            lifeArea = lifeAreaRepository.findById(eventData.getLifeAreaId()).orElse(lifeArea);
        }
        
        return Event.builder()
                .user(user)
                .title(eventData.getTitle())
                .description(eventData.getDescription())
                .startTime(eventData.getStartTime())
                .endTime(eventData.getEndTime())
                .allDay(eventData.getAllDay() != null ? eventData.getAllDay() : false)
                .area(lifeArea)
                .source(EventSource.AI_SUGGESTED)
                .createdBy(CreatedBy.AI)
                .aiConfidence(eventData.getAiConfidence() != null ? eventData.getAiConfidence() : 0.8f)
                .balanceImpact(0.0f)
                .attendees(eventData.getAttendees() != null ? eventData.getAttendees() : new ArrayList<>())
                .tags(eventData.getTags() != null ? eventData.getTags() : new ArrayList<>())
                .color(eventData.getColor())
                .build();
    }
    
    private Event createEventFromEntities(User user, OpenAIClient.ExtractedEntities entities) {
        if (entities.eventTitle == null || entities.startDateTime == null) {
            return null;
        }
        
        List<LifeArea> userLifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(user.getId());
        LifeArea defaultLifeArea = userLifeAreas.isEmpty() ? null : userLifeAreas.get(0);
        
        LocalDateTime startTime = parseDateTime(entities.startDateTime);
        LocalDateTime endTime = entities.endDateTime != null ? 
                parseDateTime(entities.endDateTime) : startTime.plusHours(1);
        
        return Event.builder()
                .user(user)
                .title(entities.eventTitle)
                .description(entities.eventDescription)
                .startTime(startTime)
                .endTime(endTime)
                .allDay(entities.allDay != null ? entities.allDay : false)
                .area(defaultLifeArea)
                .source(EventSource.AI_SUGGESTED)
                .createdBy(CreatedBy.AI)
                .aiConfidence(0.7f)
                .balanceImpact(0.0f)
                .attendees(entities.attendees != null ? entities.attendees : new ArrayList<>())
                .tags(entities.tags != null ? entities.tags : new ArrayList<>())
                .build();
    }
    
    private List<Event> handleUpdateEvent(User user, OpenAIClient.NLPAnalysisResult analysisResult,
                                        CompletableFuture<MLResponse.NLPResponse> mlFuture) {
        // Implementation for updating events
        // This would find the event and apply updates
        return new ArrayList<>();
    }
    
    private boolean handleDeleteEvent(User user, OpenAIClient.NLPAnalysisResult analysisResult) {
        if (analysisResult.entities.eventId != null) {
            eventRepository.findById(analysisResult.entities.eventId)
                    .filter(event -> event.getUser().getId().equals(user.getId()))
                    .ifPresent(eventRepository::delete);
            return true;
        }
        return false;
    }
    
    private List<Event> handleQuerySchedule(User user, OpenAIClient.NLPAnalysisResult analysisResult) {
        LocalDateTime start = analysisResult.entities.queryStartDate != null ?
                parseDateTime(analysisResult.entities.queryStartDate) : LocalDateTime.now();
        LocalDateTime end = analysisResult.entities.queryEndDate != null ?
                parseDateTime(analysisResult.entities.queryEndDate) : start.plusDays(7);
        
        return eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
                user.getId(), start, end
        );
    }
    
    private String handleAnalyzeTime(User user, OpenAIClient.NLPAnalysisResult analysisResult) {
        // Implementation for time analysis
        return "Based on your recent schedule, you've been focusing mostly on work. " +
               "Consider allocating more time for personal activities.";
    }
    
    private List<Suggestion> handleRequestSuggestion(User user, OpenAIClient.NLPAnalysisResult analysisResult,
                                                    CompletableFuture<MLResponse.NLPResponse> mlFuture) {
        List<Suggestion> suggestions = new ArrayList<>();
        
        try {
            MLResponse.NLPResponse mlResponse = mlFuture.get(5, java.util.concurrent.TimeUnit.SECONDS);
            
            if (mlResponse != null && mlResponse.getSuggestedEvents() != null) {
                // Convert ML suggested events to suggestions
                for (MLResponse.EventData eventData : mlResponse.getSuggestedEvents()) {
                    Suggestion suggestion = Suggestion.builder()
                            .type(SuggestionType.NEW_EVENT)
                            .title("Suggested: " + eventData.getTitle())
                            .description(eventData.getDescription())
                            .priority(Priority.MEDIUM)
                            .reasoning("AI suggested this event based on your request")
                            .user(user)
                            .build();
                    suggestions.add(suggestionRepository.save(suggestion));
                }
            }
            
        } catch (Exception e) {
            log.warn("Failed to get ML suggestions: {}", e.getMessage());
        }
        
        return suggestions;
    }
    
    private LocalDateTime parseDateTime(String dateTimeStr) {
        try {
            return LocalDateTime.parse(dateTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            // Try other formats
            try {
                return LocalDateTime.parse(dateTimeStr, DateTimeFormatter.ISO_DATE_TIME);
            } catch (Exception e2) {
                log.warn("Failed to parse datetime: {}", dateTimeStr);
                return LocalDateTime.now();
            }
        }
    }
    
    @Transactional
    public CompletableFuture<AIResponse> processNaturalLanguageAsync(String input) {
        return CompletableFuture.supplyAsync(() -> {
            // Get current user from security context
            String userId = getCurrentUserId();
            return processNaturalLanguage(userId, input);
        });
    }
    
    private String getCurrentUserId() {
        // This should get the user ID from the security context
        // For now, we'll return a placeholder
        return "current-user-id";
    }
}