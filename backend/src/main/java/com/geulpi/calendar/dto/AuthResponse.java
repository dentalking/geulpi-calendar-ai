package com.geulpi.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String id;
    private String email;
    private String name;
    private String token;
    private Boolean onboardingCompleted;
}