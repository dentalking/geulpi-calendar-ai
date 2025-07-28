package com.geulpi.calendar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "geulpi-calendar-backend",
                "timestamp", System.currentTimeMillis()
        ));
    }
    
    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        // Check if all dependencies are ready
        // For now, just return UP
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "ready", true,
                "service", "geulpi-calendar-backend"
        ));
    }
}