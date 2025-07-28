package com.geulpi.calendar.dto.ml;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = MLRequest.NLPRequest.class, name = "NLP_REQUEST"),
    @JsonSubTypes.Type(value = MLRequest.EventClassificationRequest.class, name = "EVENT_CLASSIFICATION"),
    @JsonSubTypes.Type(value = MLRequest.ScheduleOptimizationRequest.class, name = "SCHEDULE_OPTIMIZATION")
})
public class MLRequest {
    private String id;
    private String type;
    private Map<String, Object> data;
    private String requestId;
    private String userId;
    private LocalDateTime timestamp;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class NLPRequest extends MLRequest {
        private String input;
        private String intent;
        private Object extractedEntities;
        private String context;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class EventClassificationRequest extends MLRequest {
        private String eventId;
        private String title;
        private String description;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String location;
        private String[] attendees;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @SuperBuilder
    public static class ScheduleOptimizationRequest extends MLRequest {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String optimizationType;
        private Object constraints;
    }
}