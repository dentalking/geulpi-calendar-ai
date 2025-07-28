package com.geulpi.calendar.dto;

import lombok.Data;

@Data
public class OnboardingInput {
    private GoogleTokensInput googleTokens;
    private LifePhilosophyInput lifePhilosophy;
    private PreferencesInput preferences;
}