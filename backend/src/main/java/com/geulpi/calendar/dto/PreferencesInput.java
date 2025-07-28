package com.geulpi.calendar.dto;

import lombok.Data;

@Data
public class PreferencesInput {
    private WorkingHoursInput workingHours;
    private NotificationPreferencesInput notifications;
    private AIPreferencesInput aiAssistance;
    private Integer defaultEventDuration;
    private Integer bufferTime;
}