package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.enums.ProactivityLevel;
import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIPreferences {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProactivityLevel proactivityLevel = ProactivityLevel.BALANCED;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean autoScheduling = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean autoClassification = true;
}