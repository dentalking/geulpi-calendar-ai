package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.AnalyticsPeriod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeBalance {
    private AnalyticsPeriod period;
    private Map<String, Object> actual;
    private Map<String, Object> ideal;
    private Map<String, Object> deviation;
    private Float score;
}