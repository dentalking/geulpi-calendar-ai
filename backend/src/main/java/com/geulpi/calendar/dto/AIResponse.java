package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.enums.Intent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIResponse {
    private Boolean understood;
    private Intent intent;
    private List<Event> events;
    private List<Suggestion> suggestions;
    private String message;
    private Boolean clarificationNeeded;
    private List<String> clarificationPrompts;
}