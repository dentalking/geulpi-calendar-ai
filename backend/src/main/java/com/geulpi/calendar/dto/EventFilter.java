package com.geulpi.calendar.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class EventFilter {
    private LocalDate startDate;
    private LocalDate endDate;
    private List<String> areas;
    private String searchTerm;
    private Boolean includeRecurring = true;
}