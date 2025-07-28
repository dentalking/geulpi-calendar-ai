package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.AnalyticsPeriod;
import com.geulpi.calendar.domain.enums.Priority;
import lombok.Data;

@Data
public class SuggestionContext {
    private AnalyticsPeriod timeframe;
    private String focusArea;
    private Priority urgency;
}