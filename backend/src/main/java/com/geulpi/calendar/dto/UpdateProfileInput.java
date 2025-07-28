package com.geulpi.calendar.dto;

import lombok.Data;

@Data
public class UpdateProfileInput {
    private String name;
    private PreferencesInput preferences;
}