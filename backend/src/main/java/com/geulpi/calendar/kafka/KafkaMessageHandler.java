package com.geulpi.calendar.kafka;

import com.geulpi.calendar.dto.ml.MLResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaMessageHandler {
    
    private final Map<String, CompletableFuture<MLResponse>> pendingRequests = new ConcurrentHashMap<>();
    
    public void registerPendingRequest(String requestId, CompletableFuture<MLResponse> future) {
        pendingRequests.put(requestId, future);
        log.debug("Registered pending request: {}", requestId);
    }
    
    public void handleMLResponse(MLResponse response) {
        String requestId = response.getRequestId();
        log.info("Processing ML response for request: {}", requestId);
        
        CompletableFuture<MLResponse> future = pendingRequests.remove(requestId);
        if (future != null) {
            future.complete(response);
            log.info("Completed future for request: {}", requestId);
        } else {
            log.warn("No pending request found for response: {}. It may have timed out or been processed already.", requestId);
        }
    }
    
    public void handleErrorLog(String key, String errorMessage, long timestamp) {
        LocalDateTime errorTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
        log.error("ML Server Error [{}] at {}: {}", key, errorTime, errorMessage);
        
        // TODO: Implement error tracking and alerting logic
        // - Store errors in database for analysis
        // - Send alerts for critical errors
        // - Update metrics/monitoring
    }
    
    public void removePendingRequest(String requestId) {
        CompletableFuture<MLResponse> removed = pendingRequests.remove(requestId);
        if (removed != null) {
            log.debug("Removed pending request: {}", requestId);
        }
    }
    
    public int getPendingRequestCount() {
        return pendingRequests.size();
    }
    
    public void cleanupCompletedRequests() {
        int cleaned = 0;
        for (Map.Entry<String, CompletableFuture<MLResponse>> entry : pendingRequests.entrySet()) {
            if (entry.getValue().isDone() || entry.getValue().isCancelled() || entry.getValue().isCompletedExceptionally()) {
                pendingRequests.remove(entry.getKey());
                cleaned++;
            }
        }
        if (cleaned > 0) {
            log.info("Cleaned up {} completed ML requests. Remaining: {}", cleaned, pendingRequests.size());
        }
    }
}