package com.geulpi.calendar.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreferences {
    @Column(nullable = false)
    @Builder.Default
    private Boolean suggestions = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean insights = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean reminders = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Integer reminderMinutesBefore = 15;
}