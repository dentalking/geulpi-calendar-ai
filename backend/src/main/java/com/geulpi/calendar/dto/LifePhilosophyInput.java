package com.geulpi.calendar.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class LifePhilosophyInput {
    private List<LifeAreaInput> areas;
    private Map<String, Object> idealBalance;
    private List<TimeRuleInput> rules;
}