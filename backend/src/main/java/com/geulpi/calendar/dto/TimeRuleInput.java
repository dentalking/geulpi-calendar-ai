package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.Priority;
import lombok.Data;

@Data
public class TimeRuleInput {
    private String name;
    private String schedule;
    private String areaId;
    private Integer duration;
    private Priority priority;
}