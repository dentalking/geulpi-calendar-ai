package com.geulpi.calendar.external;

import com.fasterxml.jackson.annotation.JsonClassDescription;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.geulpi.calendar.domain.enums.Intent;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class OpenAIClient {
    
    private OpenAiService openAiService;
    
    @Value("${openai.api.key}")
    private String apiKey;
    
    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${OPENAI_API_KEY}")) {
            log.warn("OpenAI API key is not properly configured. Natural language processing will not work until openai.api.key is set.");
        } else {
            log.info("OpenAI service initialized successfully");
        }
    }
    
    private OpenAiService getService() {
        if (openAiService == null) {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                throw new IllegalStateException("OpenAI API key is not configured. Please set openai.api.key in application properties.");
            }
            openAiService = new OpenAiService(apiKey);
        }
        return openAiService;
    }
    
    public NLPAnalysisResult analyzeIntent(String input) {
        try {
            String systemPrompt = """
                You are an AI assistant specialized in understanding user intentions for calendar and schedule management.
                Analyze the user input and determine:
                1. The primary intent (CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT, QUERY_SCHEDULE, ANALYZE_TIME, REQUEST_SUGGESTION, or UNKNOWN)
                2. Extract relevant entities like dates, times, event names, participants
                3. Determine if clarification is needed
                4. Generate a helpful response message
                
                Current date and time: %s
                
                Examples:
                - "Schedule a meeting with John tomorrow at 3pm" -> CREATE_EVENT
                - "What's on my calendar next week?" -> QUERY_SCHEDULE
                - "Cancel my dentist appointment" -> DELETE_EVENT
                - "How much time did I spend on work this week?" -> ANALYZE_TIME
                - "Suggest some time for exercise" -> REQUEST_SUGGESTION
                """.formatted(LocalDateTime.now());
            
            List<ChatMessage> messages = List.of(
                    new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt),
                    new ChatMessage(ChatMessageRole.USER.value(), input)
            );
            
            ChatCompletionRequest chatCompletionRequest = ChatCompletionRequest.builder()
                    .model("gpt-4")
                    .messages(messages)
                    .temperature(0.7)
                    .maxTokens(1000)
                    .build();
            
            ChatCompletionResult completion = getService().createChatCompletion(chatCompletionRequest);
            
            if (!completion.getChoices().isEmpty()) {
                String responseContent = completion.getChoices().get(0).getMessage().getContent();
                // For now, return a simple result until we implement proper JSON parsing
                return createDefaultResult(input);
            }
            
            return createDefaultResult(input);
            
        } catch (Exception e) {
            log.error("Failed to analyze intent with OpenAI: {}", e.getMessage(), e);
            return createDefaultResult(input);
        }
    }
    
    private NLPAnalysisResult createDefaultResult(String input) {
        return new NLPAnalysisResult(
                Intent.UNKNOWN,
                new ExtractedEntities(),
                true,
                List.of("Could you please provide more details about what you'd like to do?"),
                "I'm having trouble understanding your request. Could you please rephrase it?"
        );
    }
    
    @JsonClassDescription("Result of natural language processing analysis for calendar operations")
    public static class NLPAnalysisResult {
        @JsonPropertyDescription("The identified user intent")
        public Intent intent;
        
        @JsonPropertyDescription("Extracted entities from the user input")
        public ExtractedEntities entities;
        
        @JsonPropertyDescription("Whether clarification is needed from the user")
        public boolean clarificationNeeded;
        
        @JsonPropertyDescription("List of clarification questions if needed")
        public List<String> clarificationPrompts;
        
        @JsonPropertyDescription("A helpful response message for the user")
        public String message;
        
        public NLPAnalysisResult() {}
        
        public NLPAnalysisResult(Intent intent, ExtractedEntities entities, boolean clarificationNeeded,
                               List<String> clarificationPrompts, String message) {
            this.intent = intent;
            this.entities = entities;
            this.clarificationNeeded = clarificationNeeded;
            this.clarificationPrompts = clarificationPrompts;
            this.message = message;
        }
    }
    
    @JsonClassDescription("Entities extracted from natural language input")
    public static class ExtractedEntities {
        @JsonPropertyDescription("Event title or name")
        public String eventTitle;
        
        @JsonPropertyDescription("Event description")
        public String eventDescription;
        
        @JsonPropertyDescription("Start date and time in ISO format")
        public String startDateTime;
        
        @JsonPropertyDescription("End date and time in ISO format")
        public String endDateTime;
        
        @JsonPropertyDescription("Whether it's an all-day event")
        public Boolean allDay;
        
        @JsonPropertyDescription("List of attendee names or emails")
        public List<String> attendees;
        
        @JsonPropertyDescription("Location of the event")
        public String location;
        
        @JsonPropertyDescription("Event ID for update/delete operations")
        public String eventId;
        
        @JsonPropertyDescription("Date range start for queries")
        public String queryStartDate;
        
        @JsonPropertyDescription("Date range end for queries")
        public String queryEndDate;
        
        @JsonPropertyDescription("Life area category")
        public String lifeArea;
        
        @JsonPropertyDescription("Additional tags")
        public List<String> tags;
    }
    
    public String generateResponse(String prompt) {
        try {
            OpenAiService service = getService();
            
            List<ChatMessage> messages = List.of(
                    new ChatMessage(ChatMessageRole.SYSTEM.value(), 
                            "You are a helpful assistant that extracts calendar event information from text. " +
                            "Be concise and focus on identifying date, time, title, location, and other event details."),
                    new ChatMessage(ChatMessageRole.USER.value(), prompt)
            );
            
            ChatCompletionRequest chatCompletionRequest = ChatCompletionRequest.builder()
                    .model("gpt-4")
                    .messages(messages)
                    .temperature(0.3)
                    .maxTokens(1000)
                    .build();
            
            ChatCompletionResult completion = service.createChatCompletion(chatCompletionRequest);
            
            if (!completion.getChoices().isEmpty()) {
                return completion.getChoices().get(0).getMessage().getContent();
            }
            
            return "I couldn't process the text. Please try again with clearer information.";
            
        } catch (Exception e) {
            log.error("Failed to generate response with OpenAI: {}", e.getMessage(), e);
            return "I'm having trouble processing the text right now. Please try again or provide the information in a different format.";
        }
    }
}