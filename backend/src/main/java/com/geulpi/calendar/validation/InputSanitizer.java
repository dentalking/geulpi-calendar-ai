package com.geulpi.calendar.validation;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
@Slf4j
public class InputSanitizer {
    
    // SQL injection prevention patterns
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript)",
        Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL
    );
    
    // XSS prevention patterns
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "(?i)<script[^>]*>.*?</script>|javascript:|vbscript:|onload=|onerror=|onclick=",
        Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL
    );
    
    // Path traversal prevention
    private static final Pattern PATH_TRAVERSAL_PATTERN = Pattern.compile(
        "(?i)(\\.\\./|\\.\\.\\\\|%2e%2e%2f|%2e%2e%5c)",
        Pattern.CASE_INSENSITIVE
    );
    
    // Command injection prevention
    private static final Pattern COMMAND_INJECTION_PATTERN = Pattern.compile(
        "(?i)(\\|{1,2}|&&|;|\\$\\{|\\$\\(|`)",
        Pattern.CASE_INSENSITIVE
    );
    
    /**
     * Sanitize input string to prevent various injection attacks
     */
    public String sanitizeInput(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }
        
        String sanitized = input.trim();
        
        // Log potential attack attempts
        if (containsSqlInjection(sanitized)) {
            log.warn("Potential SQL injection attempt detected: {}", sanitized.substring(0, Math.min(50, sanitized.length())));
            throw new SecurityException("Invalid input detected");
        }
        
        if (containsXss(sanitized)) {
            log.warn("Potential XSS attempt detected: {}", sanitized.substring(0, Math.min(50, sanitized.length())));
            throw new SecurityException("Invalid input detected");
        }
        
        if (containsPathTraversal(sanitized)) {
            log.warn("Potential path traversal attempt detected: {}", sanitized.substring(0, Math.min(50, sanitized.length())));
            throw new SecurityException("Invalid input detected");
        }
        
        if (containsCommandInjection(sanitized)) {
            log.warn("Potential command injection attempt detected: {}", sanitized.substring(0, Math.min(50, sanitized.length())));
            throw new SecurityException("Invalid input detected");
        }
        
        return sanitized;
    }
    
    /**
     * Sanitize text input for display (allows some HTML but escapes dangerous content)
     */
    public String sanitizeForDisplay(String input) {
        if (input == null) {
            return null;
        }
        
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;");
    }
    
    /**
     * Validate and sanitize GraphQL query strings
     */
    public String sanitizeGraphQLInput(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }
        
        String sanitized = sanitizeInput(input);
        
        // Additional GraphQL-specific validations
        if (sanitized.length() > 10000) { // Prevent overly large queries
            throw new SecurityException("Query too large");
        }
        
        // Check for nested query depth (simple check)
        long openBraces = sanitized.chars().filter(ch -> ch == '{').count();
        if (openBraces > 20) { // Prevent deeply nested queries
            throw new SecurityException("Query too complex");
        }
        
        return sanitized;
    }
    
    /**
     * Validate base64 encoded data (for file uploads)
     */
    public boolean isValidBase64(String base64Data) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return false;
        }
        
        try {
            // Remove data URL prefix if present
            String data = base64Data;
            if (base64Data.contains(",")) {
                data = base64Data.split(",")[1];
            }
            
            // Check if it's valid base64
            java.util.Base64.getDecoder().decode(data);
            
            // Check reasonable size limits
            if (data.length() > 10_000_000) { // 10MB limit
                log.warn("Base64 data too large: {} bytes", data.length());
                return false;
            }
            
            return true;
        } catch (IllegalArgumentException e) {
            log.warn("Invalid base64 data provided");
            return false;
        }
    }
    
    /**
     * Validate email format
     */
    public boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        Pattern emailPattern = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        );
        
        return emailPattern.matcher(email).matches() && email.length() <= 254;
    }
    
    /**
     * Validate user ID format (UUIDs or similar)
     */
    public boolean isValidUserId(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return false;
        }
        
        // UUID pattern or alphanumeric with limited length
        Pattern userIdPattern = Pattern.compile(
            "^[a-zA-Z0-9-]{1,50}$"
        );
        
        return userIdPattern.matcher(userId).matches();
    }
    
    private boolean containsSqlInjection(String input) {
        return SQL_INJECTION_PATTERN.matcher(input).find();
    }
    
    private boolean containsXss(String input) {
        return XSS_PATTERN.matcher(input).find();
    }
    
    private boolean containsPathTraversal(String input) {
        return PATH_TRAVERSAL_PATTERN.matcher(input).find();
    }
    
    private boolean containsCommandInjection(String input) {
        return COMMAND_INJECTION_PATTERN.matcher(input).find();
    }
}