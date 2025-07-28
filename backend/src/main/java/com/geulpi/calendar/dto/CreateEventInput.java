package com.geulpi.calendar.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateEventInput {
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean allDay = false;
    private String areaId;
    private LocationInput location;
    private RecurrenceInput recurrence;
    private List<String> attendees;
    private String timezone;
    private List<String> tags;
}