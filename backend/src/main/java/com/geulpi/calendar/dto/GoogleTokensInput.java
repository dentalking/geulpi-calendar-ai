package com.geulpi.calendar.dto;

import lombok.Data;

@Data
public class GoogleTokensInput {
    private String accessToken;
    private String refreshToken;
    private String idToken;
}