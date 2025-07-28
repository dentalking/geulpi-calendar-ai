package com.geulpi.calendar.dto;

import lombok.Data;

@Data
public class NotificationPreferencesInput {
    private Boolean suggestions;
    private Boolean insights;
    private Boolean reminders;
    private Integer reminderMinutesBefore;
}