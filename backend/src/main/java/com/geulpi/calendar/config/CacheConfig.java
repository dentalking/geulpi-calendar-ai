package com.geulpi.calendar.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // JSON serializer configuration
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
        objectMapper.registerModule(new JavaTimeModule());
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);
        
        // String serializer for keys
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        
        // Key serializers
        template.setKeySerializer(stringRedisSerializer);
        template.setHashKeySerializer(stringRedisSerializer);
        
        // Value serializers
        template.setValueSerializer(jackson2JsonRedisSerializer);
        template.setHashValueSerializer(jackson2JsonRedisSerializer);
        
        template.afterPropertiesSet();
        return template;
    }
    
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // JSON serializer for cache values
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
        objectMapper.registerModule(new JavaTimeModule());
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);
        
        // Default cache configuration
        RedisCacheConfiguration defaultCacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)) // Default TTL: 30 minutes
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jackson2JsonRedisSerializer))
                .disableCachingNullValues();
        
        // Specific cache configurations
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // User cache - 1 hour TTL (infrequently changed)
        cacheConfigurations.put("users", defaultCacheConfig.entryTtl(Duration.ofHours(1)));
        
        // User patterns cache - 2 hours TTL (updated weekly)
        cacheConfigurations.put("userPatterns", defaultCacheConfig.entryTtl(Duration.ofHours(2)));
        
        // Insights cache - 30 minutes TTL (updated frequently)
        cacheConfigurations.put("insights", defaultCacheConfig.entryTtl(Duration.ofMinutes(30)));
        
        // Time balance cache - 15 minutes TTL (real-time data)
        cacheConfigurations.put("timeBalance", defaultCacheConfig.entryTtl(Duration.ofMinutes(15)));
        
        // Analytics cache - 1 hour TTL (aggregated data)
        cacheConfigurations.put("analytics", defaultCacheConfig.entryTtl(Duration.ofHours(1)));
        
        // Events cache - 10 minutes TTL (frequently updated)
        cacheConfigurations.put("events", defaultCacheConfig.entryTtl(Duration.ofMinutes(10)));
        
        // Suggestions cache - 5 minutes TTL (dynamic data)
        cacheConfigurations.put("suggestions", defaultCacheConfig.entryTtl(Duration.ofMinutes(5)));
        
        // Google Calendar cache - 30 minutes TTL (external API)
        cacheConfigurations.put("googleCalendar", defaultCacheConfig.entryTtl(Duration.ofMinutes(30)));
        
        // Life areas cache - 2 hours TTL (rarely changed)
        cacheConfigurations.put("lifeAreas", defaultCacheConfig.entryTtl(Duration.ofHours(2)));
        
        // Performance optimization caches
        cacheConfigurations.put("userEventsSummary", defaultCacheConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigurations.put("eventSearch", defaultCacheConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigurations.put("usersBatch", defaultCacheConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigurations.put("eventsWithDetails", defaultCacheConfig.entryTtl(Duration.ofMinutes(15)));
        
        // Query result caches
        cacheConfigurations.put("queryCache", defaultCacheConfig.entryTtl(Duration.ofMinutes(20)));
        cacheConfigurations.put("aggregationCache", defaultCacheConfig.entryTtl(Duration.ofHours(1)));
        
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultCacheConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                // Enable cache statistics for monitoring
                .enableStatistics()
                .build();
    }
}