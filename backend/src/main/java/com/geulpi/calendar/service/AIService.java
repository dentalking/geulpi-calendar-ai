package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.enums.EventSource;
import com.geulpi.calendar.domain.enums.Intent;
import com.geulpi.calendar.dto.AIResponse;
import com.geulpi.calendar.external.GoogleVisionClient;
import com.geulpi.calendar.external.GoogleSpeechClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIService {
    
    private final NaturalLanguageProcessingService nlpService;
    private final GoogleVisionClient googleVisionClient;
    private final GoogleSpeechClient googleSpeechClient;
    private final EventExtractionService eventExtractionService;
    
    public AIResponse processNaturalLanguage(String input) {
        try {
            // Get current user ID from security context
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            log.info("Processing natural language input for user {}: {}", userId, input);
            
            // Delegate to NLP service
            return nlpService.processNaturalLanguage(userId, input);
            
        } catch (Exception e) {
            log.error("Error in processNaturalLanguage: {}", e.getMessage(), e);
            return AIResponse.builder()
                    .understood(false)
                    .intent(Intent.UNKNOWN)
                    .events(new ArrayList<>())
                    .suggestions(new ArrayList<>())
                    .message("An error occurred while processing your request.")
                    .clarificationNeeded(false)
                    .clarificationPrompts(new ArrayList<>())
                    .build();
        }
    }
    
    public AIResponse processOCR(String imageBase64) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            log.info("Processing OCR image for user {}", userId);
            
            // Extract text from image using Google Vision API
            String extractedText = googleVisionClient.extractTextFromImage(imageBase64);
            
            if (extractedText == null || extractedText.trim().isEmpty()) {
                return AIResponse.builder()
                        .understood(false)
                        .intent(Intent.UNKNOWN)
                        .events(new ArrayList<>())
                        .suggestions(new ArrayList<>())
                        .message("I couldn't extract any text from the image. Please make sure the image is clear and contains readable text.")
                        .clarificationNeeded(true)
                        .clarificationPrompts(new ArrayList<>())
                        .build();
            }
            
            // Process extracted text to find events
            return eventExtractionService.processExtractedText(extractedText, EventSource.OCR);
            
        } catch (Exception e) {
            log.error("Error in processOCR: {}", e.getMessage(), e);
            return AIResponse.builder()
                    .understood(false)
                    .intent(Intent.UNKNOWN)
                    .events(new ArrayList<>())
                    .suggestions(new ArrayList<>())
                    .message("An error occurred while processing the image. Please try again or provide the information in text form.")
                    .clarificationNeeded(true)
                    .clarificationPrompts(new ArrayList<>())
                    .build();
        }
    }
    
    public AIResponse processSpeech(String audioBase64) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            
            log.info("Processing speech audio for user {}", userId);
            
            // Transcribe audio using Google Speech-to-Text API
            String transcribedText = googleSpeechClient.transcribeAudioWithMultipleFormats(audioBase64);
            
            if (transcribedText == null || transcribedText.trim().isEmpty()) {
                return AIResponse.builder()
                        .understood(false)
                        .intent(Intent.UNKNOWN)
                        .events(new ArrayList<>())
                        .suggestions(new ArrayList<>())
                        .message("I couldn't understand the audio. Please make sure the audio is clear and try speaking more clearly.")
                        .clarificationNeeded(true)
                        .clarificationPrompts(new ArrayList<>())
                        .build();
            }
            
            // Process transcribed text to find events
            return eventExtractionService.processExtractedText(transcribedText, EventSource.VOICE);
            
        } catch (Exception e) {
            log.error("Error in processSpeech: {}", e.getMessage(), e);
            return AIResponse.builder()
                    .understood(false)
                    .intent(Intent.UNKNOWN)
                    .events(new ArrayList<>())
                    .suggestions(new ArrayList<>())
                    .message("An error occurred while processing the audio. Please try again or provide the information in text form.")
                    .clarificationNeeded(true)
                    .clarificationPrompts(new ArrayList<>())
                    .build();
        }
    }
}