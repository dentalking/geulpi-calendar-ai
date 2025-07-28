package com.geulpi.calendar.service;

import com.geulpi.calendar.dto.AIResponse;
import com.geulpi.calendar.dto.TranscriptionResult;
import com.geulpi.calendar.dto.VoiceCommandResult;
import com.geulpi.calendar.dto.ml.MLRequest;
import com.geulpi.calendar.dto.ml.MLResponse;
import com.geulpi.calendar.kafka.KafkaProducer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@Transactional
public class VoiceService {
    
    private final KafkaProducer kafkaProducer;
    private final NaturalLanguageProcessingService nlpService;
    private final MLService mlService;
    
    public VoiceService(KafkaProducer kafkaProducer, 
                       NaturalLanguageProcessingService nlpService,
                       MLService mlService) {
        this.kafkaProducer = kafkaProducer;
        this.nlpService = nlpService;
        this.mlService = mlService;
    }
    
    public CompletableFuture<VoiceCommandResult> processVoiceCommand(String audioBase64) {
        return transcribeAudio(audioBase64)
            .thenCompose(transcription -> {
                // Process the transcribed text through NLP
                return nlpService.processNaturalLanguageAsync(transcription.getText())
                    .thenApply(nlpResult -> new VoiceCommandResult(
                        transcription.getText(),
                        transcription.getConfidence(),
                        nlpResult
                    ));
            });
    }
    
    private CompletableFuture<TranscriptionResult> transcribeAudio(String audioBase64) {
        // Create ML request for speech-to-text
        Map<String, Object> data = new HashMap<>();
        data.put("audio", audioBase64);
        data.put("language", "auto"); // Auto-detect language
        
        MLRequest request = new MLRequest();
        request.setId(UUID.randomUUID().toString());
        request.setType("SPEECH_TO_TEXT");
        request.setData(data);
        
        // Send to ML server via Kafka
        return mlService.sendRequestAsync(request)
            .thenApply(this::parseTranscriptionResponse)
            .orTimeout(30, TimeUnit.SECONDS);
    }
    
    private TranscriptionResult parseTranscriptionResponse(MLResponse response) {
        if (!response.isSuccess()) {
            throw new RuntimeException("Speech transcription failed: " + response.getError());
        }
        
        Map<String, Object> result = response.getResult();
        String text = (String) result.get("text");
        double confidence = ((Number) result.getOrDefault("confidence", 0.0)).doubleValue();
        String language = (String) result.getOrDefault("language", "en");
        
        return new TranscriptionResult(text, confidence, language);
    }
}