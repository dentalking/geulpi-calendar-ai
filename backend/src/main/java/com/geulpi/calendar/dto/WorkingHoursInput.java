package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.DayOfWeek;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class WorkingHoursInput {
    private LocalTime start;
    private LocalTime end;
    private String timezone;
    private List<DayOfWeek> workDays;
}