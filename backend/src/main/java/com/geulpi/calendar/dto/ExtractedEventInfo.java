package com.geulpi.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedEventInfo {
    private String title;
    private String dateString;
    private String startTimeString;
    private String endTimeString;
    private String location;
    private String description;
    private List<String> participants;
    private Float confidence;
}