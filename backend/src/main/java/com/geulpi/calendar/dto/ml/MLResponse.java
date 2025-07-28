package com.geulpi.calendar.dto.ml;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = MLResponse.NLPResponse.class, name = "NLP_RESPONSE"),
    @JsonSubTypes.Type(value = MLResponse.EventClassificationResponse.class, name = "EVENT_CLASSIFICATION_RESPONSE"),
    @JsonSubTypes.Type(value = MLResponse.ScheduleOptimizationResponse.class, name = "SCHEDULE_OPTIMIZATION_RESPONSE")
})
public class MLResponse {
    private String requestId;
    private String status; // SUCCESS, FAILED, PARTIAL
    private String message;
    private LocalDateTime timestamp;
    private boolean success;
    private String error;
    private Map<String, Object> result;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class NLPResponse extends MLResponse {
        private List<EventData> suggestedEvents;
        private List<EventUpdate> eventUpdates;
        private Float confidence;
        private Map<String, Object> additionalData;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class EventClassificationResponse extends MLResponse {
        private String eventId;
        private String lifeAreaId;
        private Float confidence;
        private List<String> suggestedTags;
        private Float balanceImpact;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class ScheduleOptimizationResponse extends MLResponse {
        private List<EventChange> proposedChanges;
        private Float optimizationScore;
        private Map<String, Float> balanceScores;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventData {
        private String title;
        private String description;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Boolean allDay;
        private String lifeAreaId;
        private Float aiConfidence;
        private List<String> attendees;
        private String location;
        private List<String> tags;
        private String color;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventUpdate {
        private String eventId;
        private Map<String, Object> updates;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventChange {
        private String eventId;
        private String changeType; // RESCHEDULE, DELETE, MERGE
        private LocalDateTime newStartTime;
        private LocalDateTime newEndTime;
        private String reason;
    }
    
    // Helper methods
    public boolean isSuccess() {
        return success || "SUCCESS".equals(status);
    }
    
    public String getError() {
        return error != null ? error : message;
    }
    
    public Map<String, Object> getResult() {
        return result != null ? result : Map.of();
    }
}