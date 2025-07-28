package com.geulpi.calendar.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UpdateEventInput {
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String areaId;
    private LocationInput location;
    private List<String> attendees;
    private List<String> tags;
}