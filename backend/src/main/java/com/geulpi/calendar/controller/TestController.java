package com.geulpi.calendar.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@Slf4j
public class TestController {
    
    @Value("${google.client.id:not-set}")
    private String googleClientId;
    
    @Value("${google.api.key:not-set}")
    private String googleApiKey;
    
    @Value("${openai.api.key:not-set}")
    private String openAiApiKey;
    
    @GetMapping("/env")
    public ResponseEntity<Map<String, Object>> testEnvironment() {
        Map<String, Object> response = new HashMap<>();
        
        // Check Google OAuth
        response.put("googleClientId", googleClientId != null && !googleClientId.equals("not-set") && !googleClientId.isEmpty() ? "✅ Configured" : "❌ Not configured");
        response.put("googleApiKey", !googleApiKey.equals("not-set") && !googleApiKey.contains("your-google") ? "✅ Configured" : "❌ Not configured");
        
        // Check OpenAI
        response.put("openAiApiKey", !openAiApiKey.equals("not-set") && !openAiApiKey.contains("your-openai") ? "✅ Configured" : "❌ Not configured");
        
        // Environment variables check
        response.put("googleCloudProject", System.getenv("GOOGLE_CLOUD_PROJECT_ID") != null ? "✅ Configured" : "❌ Not configured");
        response.put("googleCredentials", System.getenv("GOOGLE_APPLICATION_CREDENTIALS") != null ? "✅ Configured" : "❌ Not configured");
        
        log.info("Environment test completed: {}", response);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Geulpi Calendar Backend");
        return ResponseEntity.ok(response);
    }
}