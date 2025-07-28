package com.geulpi.calendar.service;

import com.geulpi.calendar.dto.ml.MLRequest;
import com.geulpi.calendar.dto.ml.MLResponse;
import com.geulpi.calendar.kafka.KafkaProducer;
import com.geulpi.calendar.kafka.KafkaMessageHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MLService {
    
    private final KafkaProducer kafkaProducer;
    private final KafkaMessageHandler messageHandler;
    
    public CompletableFuture<MLResponse.NLPResponse> processNLPRequest(String userId, String input, 
                                                                      String intent, Object entities) {
        String requestId = UUID.randomUUID().toString();
        
        MLRequest.NLPRequest request = MLRequest.NLPRequest.builder()
                .requestId(requestId)
                .userId(userId)
                .timestamp(LocalDateTime.now())
                .input(input)
                .intent(intent)
                .extractedEntities(entities)
                .build();
        
        CompletableFuture<MLResponse> future = new CompletableFuture<>();
        messageHandler.registerPendingRequest(requestId, future);
        
        // Send request to ML server
        kafkaProducer.sendMLRequest(requestId, request)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send ML request {}: {}", requestId, ex.getMessage(), ex);
                        future.completeExceptionally(ex);
                        messageHandler.removePendingRequest(requestId);
                    } else {
                        log.info("ML request {} sent successfully", requestId);
                    }
                });
        
        // Set timeout for the request
        future.orTimeout(30, TimeUnit.SECONDS)
                .exceptionally(throwable -> {
                    log.error("ML request {} timed out", requestId);
                    messageHandler.removePendingRequest(requestId);
                    return createTimeoutResponse(requestId);
                });
        
        return future.thenApply(response -> (MLResponse.NLPResponse) response);
    }
    
    public CompletableFuture<MLResponse> sendRequestAsync(MLRequest request) {
        CompletableFuture<MLResponse> future = new CompletableFuture<>();
        messageHandler.registerPendingRequest(request.getId(), future);
        
        kafkaProducer.sendMLRequest(request.getId(), request)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to send ML request {}: {}", request.getId(), ex.getMessage(), ex);
                    future.completeExceptionally(ex);
                    messageHandler.removePendingRequest(request.getId());
                }
            });
        
        return future;
    }
    
    public CompletableFuture<MLResponse.EventClassificationResponse> classifyEvent(
            String userId, String eventId, String title, String description,
            LocalDateTime startTime, LocalDateTime endTime) {
        
        String requestId = UUID.randomUUID().toString();
        
        MLRequest.EventClassificationRequest request = MLRequest.EventClassificationRequest.builder()
                .requestId(requestId)
                .userId(userId)
                .timestamp(LocalDateTime.now())
                .eventId(eventId)
                .title(title)
                .description(description)
                .startTime(startTime)
                .endTime(endTime)
                .build();
        
        CompletableFuture<MLResponse> future = new CompletableFuture<>();
        messageHandler.registerPendingRequest(requestId, future);
        
        kafkaProducer.sendMLRequest(requestId, request)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send classification request {}: {}", requestId, ex.getMessage(), ex);
                        future.completeExceptionally(ex);
                        messageHandler.removePendingRequest(requestId);
                    }
                });
        
        future.orTimeout(10, TimeUnit.SECONDS)
                .exceptionally(throwable -> {
                    log.error("Classification request {} timed out", requestId);
                    messageHandler.removePendingRequest(requestId);
                    return createClassificationTimeoutResponse(requestId, eventId);
                });
        
        return future.thenApply(response -> (MLResponse.EventClassificationResponse) response);
    }
    
    
    private MLResponse.NLPResponse createTimeoutResponse(String requestId) {
        return MLResponse.NLPResponse.builder()
                .requestId(requestId)
                .status("FAILED")
                .message("ML processing timed out")
                .timestamp(LocalDateTime.now())
                .confidence(0.0f)
                .build();
    }
    
    private MLResponse.EventClassificationResponse createClassificationTimeoutResponse(
            String requestId, String eventId) {
        return MLResponse.EventClassificationResponse.builder()
                .requestId(requestId)
                .eventId(eventId)
                .status("FAILED")
                .message("Classification timed out")
                .timestamp(LocalDateTime.now())
                .confidence(0.0f)
                .build();
    }
    
    // Cleanup old pending requests periodically
    @Scheduled(fixedDelay = 60000)
    public void cleanupPendingRequests() {
        messageHandler.cleanupCompletedRequests();
    }
}