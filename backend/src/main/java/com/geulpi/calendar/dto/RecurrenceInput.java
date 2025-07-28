package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.DayOfWeek;
import com.geulpi.calendar.domain.enums.RecurrenceFrequency;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class RecurrenceInput {
    private RecurrenceFrequency frequency;
    private Integer interval = 1;
    private List<DayOfWeek> daysOfWeek;
    private LocalDate endDate;
}