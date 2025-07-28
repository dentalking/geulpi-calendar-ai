package com.geulpi.calendar.resolver;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.dto.*;
import com.geulpi.calendar.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Controller
@RequiredArgsConstructor
public class MutationResolver {
    
    private final UserService userService;
    private final EventService eventService;
    private final AIService aiService;
    private final SuggestionService suggestionService;
    private final OnboardingService onboardingService;
    private final SyncService syncService;
    private final VoiceService voiceService;
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public User updateProfile(@Argument UpdateProfileInput input) {
        return userService.updateProfile(input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public User updateLifePhilosophy(@Argument LifePhilosophyInput input) {
        return userService.updateLifePhilosophy(input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public Event createEvent(@Argument CreateEventInput input) {
        return eventService.createEvent(input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public Event updateEvent(@Argument String id, @Argument UpdateEventInput input) {
        return eventService.updateEvent(id, input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public Boolean deleteEvent(@Argument String id) {
        return eventService.deleteEvent(id);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public List<Event> batchCreateEvents(@Argument List<CreateEventInput> inputs) {
        return eventService.batchCreateEvents(inputs);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public AIResponse processNaturalLanguage(@Argument String input) {
        return aiService.processNaturalLanguage(input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public AIResponse processOCR(@Argument String imageBase64) {
        return aiService.processOCR(imageBase64);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public AIResponse processSpeech(@Argument String audioBase64) {
        return aiService.processSpeech(audioBase64);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public CompletableFuture<VoiceCommandResult> processVoiceCommand(@Argument String audioBase64) {
        return voiceService.processVoiceCommand(audioBase64);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public Event acceptSuggestion(@Argument String id) {
        return suggestionService.acceptSuggestion(id);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public Boolean rejectSuggestion(@Argument String id, @Argument String reason) {
        return suggestionService.rejectSuggestion(id, reason);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public List<Event> batchAcceptSuggestions(@Argument List<String> ids) {
        return suggestionService.batchAcceptSuggestions(ids);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public User completeOnboarding(@Argument OnboardingInput input) {
        return onboardingService.completeOnboarding(input);
    }
    
    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public SyncResult syncGoogleCalendar() {
        User currentUser = userService.getCurrentUser();
        return syncService.syncGoogleCalendar(currentUser.getId());
    }
}