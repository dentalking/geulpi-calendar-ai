package com.geulpi.calendar.external;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Configuration
@Slf4j
public class ExternalApiConfig {
    
    @Value("${google.client.id}")
    private String googleClientId;
    
    @Value("${google.client.secret}")
    private String googleClientSecret;
    
    @Value("${google.application.name:Geulpi Calendar}")
    private String applicationName;
    
    @Value("${openai.api.base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;
    
    @Bean
    public JsonFactory jsonFactory() {
        return GsonFactory.getDefaultInstance();
    }
    
    @Bean
    public HttpTransport httpTransport() throws GeneralSecurityException, IOException {
        return GoogleNetHttpTransport.newTrustedTransport();
    }
    
    @Bean
    public GoogleAuthorizationCodeFlow googleAuthorizationCodeFlow(
            HttpTransport httpTransport, JsonFactory jsonFactory) throws IOException {
        return new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, 
                jsonFactory, 
                googleClientId, 
                googleClientSecret,
                Collections.singleton(CalendarScopes.CALENDAR))
                .setAccessType("offline")
                .build();
    }
    
    @Bean
    public WebClient openAiWebClient() {
        return WebClient.builder()
                .baseUrl(openAiBaseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
    
    @Bean
    public WebClient googleMapsWebClient() {
        return WebClient.builder()
                .baseUrl("https://maps.googleapis.com/maps/api")
                .build();
    }
    
    public Calendar createCalendarService(Credential credential) {
        try {
            return new Calendar.Builder(httpTransport(), jsonFactory(), credential)
                    .setApplicationName(applicationName)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Calendar service", e);
        }
    }
}