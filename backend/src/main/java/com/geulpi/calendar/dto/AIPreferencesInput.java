package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.ProactivityLevel;
import lombok.Data;

@Data
public class AIPreferencesInput {
    private ProactivityLevel proactivityLevel;
    private Boolean autoScheduling;
    private Boolean autoClassification;
}