package com.geulpi.calendar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Configuration for performance optimization and monitoring
 */
@Configuration
public class PerformanceConfig implements WebMvcConfigurer {

    /**
     * Enable timing aspects for @Timed annotations
     */
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    /**
     * Configure JSON message converters for better performance
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder()
                .indentOutput(false) // Disable indentation for smaller payload
                .simpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX");
        
        converters.add(new MappingJackson2HttpMessageConverter(builder.build()));
    }

    /**
     * Custom timer for database operations
     */
    @Bean
    public Timer databaseTimer(MeterRegistry meterRegistry) {
        return Timer.builder("database.query.duration")
                .description("Database query execution time")
                .minimumExpectedValue(java.time.Duration.ofMillis(1))
                .maximumExpectedValue(java.time.Duration.ofSeconds(10))
                .publishPercentileHistogram()
                .register(meterRegistry);
    }

    /**
     * Custom timer for GraphQL operations
     */
    @Bean
    public Timer graphqlTimer(MeterRegistry meterRegistry) {
        return Timer.builder("graphql.query.duration")
                .description("GraphQL query execution time")
                .minimumExpectedValue(java.time.Duration.ofMillis(10))
                .maximumExpectedValue(java.time.Duration.ofSeconds(30))
                .publishPercentileHistogram()
                .register(meterRegistry);
    }

    /**
     * Custom timer for ML service operations
     */
    @Bean
    public Timer mlServiceTimer(MeterRegistry meterRegistry) {
        return Timer.builder("ml.service.duration")
                .description("ML service request duration")
                .minimumExpectedValue(java.time.Duration.ofSeconds(1))
                .maximumExpectedValue(java.time.Duration.ofSeconds(30))
                .publishPercentileHistogram()
                .register(meterRegistry);
    }

    /**
     * Custom timer for cache operations
     */
    @Bean
    public Timer cacheTimer(MeterRegistry meterRegistry) {
        return Timer.builder("cache.operation.duration")
                .description("Cache operation duration")
                .minimumExpectedValue(java.time.Duration.ofNanos(100000))
                .maximumExpectedValue(java.time.Duration.ofMillis(500))
                .publishPercentileHistogram()
                .register(meterRegistry);
    }
}