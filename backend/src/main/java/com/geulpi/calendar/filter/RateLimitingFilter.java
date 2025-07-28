package com.geulpi.calendar.filter;

import com.geulpi.calendar.config.RateLimitingConfig;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {
    
    private final RateLimitingConfig rateLimitingConfig;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String clientIp = getClientIpAddress(request);
        String requestUri = request.getRequestURI();
        
        // Check IP-based rate limit first (global protection)
        Bucket ipBucket = rateLimitingConfig.createIpBucket(clientIp);
        ConsumptionProbe ipProbe = ipBucket.tryConsumeAndReturnRemaining(1);
        
        if (!ipProbe.isConsumed()) {
            log.warn("Rate limit exceeded for IP: {} on URI: {}", clientIp, requestUri);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("X-Rate-Limit-Retry-After-Seconds", 
                              String.valueOf(ipProbe.getNanosToWaitForRefill() / 1_000_000_000));
            response.getWriter().write("{\"error\":\"Too many requests from this IP\",\"retryAfter\":" + 
                                     (ipProbe.getNanosToWaitForRefill() / 1_000_000_000) + "}");
            return;
        }
        
        // Authentication endpoints have stricter limits
        if (requestUri.contains("/auth/") || requestUri.contains("/oauth2/")) {
            Bucket authBucket = rateLimitingConfig.createAuthBucket(clientIp);
            ConsumptionProbe authProbe = authBucket.tryConsumeAndReturnRemaining(1);
            
            if (!authProbe.isConsumed()) {
                log.warn("Auth rate limit exceeded for IP: {} on URI: {}", clientIp, requestUri);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("X-Rate-Limit-Retry-After-Seconds", 
                                  String.valueOf(authProbe.getNanosToWaitForRefill() / 1_000_000_000));
                response.getWriter().write("{\"error\":\"Too many authentication attempts\",\"retryAfter\":" + 
                                         (authProbe.getNanosToWaitForRefill() / 1_000_000_000) + "}");
                return;
            }
        }
        
        // User-specific rate limiting for authenticated requests
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && 
            !authentication.getName().equals("anonymousUser")) {
            
            String userId = authentication.getName();
            Bucket userBucket;
            
            // Different limits for different types of operations
            if (isAIOperation(requestUri)) {
                userBucket = rateLimitingConfig.createAIBucket(userId);
            } else if (isUploadOperation(requestUri)) {
                userBucket = rateLimitingConfig.createUploadBucket(userId);
            } else {
                userBucket = rateLimitingConfig.createUserBucket(userId);
            }
            
            ConsumptionProbe userProbe = userBucket.tryConsumeAndReturnRemaining(1);
            
            if (!userProbe.isConsumed()) {
                log.warn("User rate limit exceeded for user: {} on URI: {}", userId, requestUri);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("X-Rate-Limit-Retry-After-Seconds", 
                                  String.valueOf(userProbe.getNanosToWaitForRefill() / 1_000_000_000));
                response.setHeader("X-Rate-Limit-Remaining", String.valueOf(userProbe.getRemainingTokens()));
                response.getWriter().write("{\"error\":\"Rate limit exceeded for user\",\"retryAfter\":" + 
                                         (userProbe.getNanosToWaitForRefill() / 1_000_000_000) + "}");
                return;
            }
            
            // Add rate limit headers for successful requests
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(userProbe.getRemainingTokens()));
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean isAIOperation(String requestUri) {
        return requestUri.contains("processNaturalLanguage") || 
               requestUri.contains("processOCR") || 
               requestUri.contains("processSpeech") ||
               requestUri.contains("insights") ||
               requestUri.contains("suggestions");
    }
    
    private boolean isUploadOperation(String requestUri) {
        return requestUri.contains("processOCR") || 
               requestUri.contains("processSpeech");
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // Skip rate limiting for health checks and static resources
        return path.startsWith("/actuator/health") || 
               path.startsWith("/static/") ||
               path.startsWith("/css/") ||
               path.startsWith("/js/") ||
               path.startsWith("/images/");
    }
}