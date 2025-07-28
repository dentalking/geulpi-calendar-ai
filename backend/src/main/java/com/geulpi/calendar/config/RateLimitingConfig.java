package com.geulpi.calendar.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitingConfig {
    
    private final ConcurrentHashMap<String, Bucket> cache = new ConcurrentHashMap<>();
    
    public Bucket createBucket(String key, int capacity, int refillTokens, Duration refillPeriod) {
        return cache.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(capacity, Refill.intervally(refillTokens, refillPeriod));
            return Bucket4j.builder()
                    .addLimit(limit)
                    .build();
        });
    }
    
    // Different rate limits for different endpoints
    public Bucket createUserBucket(String userId) {
        // 100 requests per minute for general API calls
        return createBucket("user:" + userId, 100, 100, Duration.ofMinutes(1));
    }
    
    public Bucket createAIBucket(String userId) {
        // 20 AI requests per minute (more expensive operations)
        return createBucket("ai:" + userId, 20, 20, Duration.ofMinutes(1));
    }
    
    public Bucket createUploadBucket(String userId) {
        // 10 uploads per minute (OCR/Speech processing)
        return createBucket("upload:" + userId, 10, 10, Duration.ofMinutes(1));
    }
    
    public Bucket createIpBucket(String ip) {
        // 200 requests per minute per IP (to prevent DDoS)
        return createBucket("ip:" + ip, 200, 200, Duration.ofMinutes(1));
    }
    
    public Bucket createAuthBucket(String ip) {
        // 5 authentication attempts per minute per IP
        return createBucket("auth:" + ip, 5, 5, Duration.ofMinutes(1));
    }
}