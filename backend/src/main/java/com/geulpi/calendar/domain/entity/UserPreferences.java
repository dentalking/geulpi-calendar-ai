package com.geulpi.calendar.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferences {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "start", column = @Column(name = "working_hours_start")),
        @AttributeOverride(name = "end", column = @Column(name = "working_hours_end")),
        @AttributeOverride(name = "timezone", column = @Column(name = "working_hours_timezone"))
    })
    private WorkingHours workingHours;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "suggestions", column = @Column(name = "notify_suggestions")),
        @AttributeOverride(name = "insights", column = @Column(name = "notify_insights")),
        @AttributeOverride(name = "reminders", column = @Column(name = "notify_reminders")),
        @AttributeOverride(name = "reminderMinutesBefore", column = @Column(name = "reminder_minutes_before"))
    })
    private NotificationPreferences notifications;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "proactivityLevel", column = @Column(name = "ai_proactivity_level")),
        @AttributeOverride(name = "autoScheduling", column = @Column(name = "ai_auto_scheduling")),
        @AttributeOverride(name = "autoClassification", column = @Column(name = "ai_auto_classification"))
    })
    private AIPreferences aiAssistance;
    
    @Column(nullable = false)
    @Builder.Default
    private Integer defaultEventDuration = 60; // minutes
    
    @Column(nullable = false)
    @Builder.Default
    private Integer bufferTime = 15; // minutes between events
}