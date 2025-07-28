package com.geulpi.calendar.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Configuration for asynchronous processing to improve performance
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);

    /**
     * Task executor for general async operations
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Core pool size - threads that are always alive
        executor.setCorePoolSize(5);
        
        // Maximum pool size - max threads that can be created
        executor.setMaxPoolSize(20);
        
        // Queue capacity - tasks waiting for available threads
        executor.setQueueCapacity(100);
        
        // Thread name prefix for easy identification in logs
        executor.setThreadNamePrefix("GeulpiAsync-");
        
        // Keep alive time for idle threads
        executor.setKeepAliveSeconds(60);
        
        // Rejection policy when queue is full
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        // Initialize the executor
        executor.initialize();
        
        logger.info("Task executor initialized with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Dedicated executor for ML service communication
     */
    @Bean(name = "mlServiceExecutor")
    public Executor mlServiceExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // ML operations might take longer, so smaller pool
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("MLService-");
        executor.setKeepAliveSeconds(120); // Longer keep alive for ML operations
        
        // More lenient rejection policy for ML operations
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60); // Longer wait for ML operations
        
        executor.initialize();
        
        logger.info("ML service executor initialized with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Executor for database operations that might take longer
     */
    @Bean(name = "databaseExecutor")
    public Executor databaseExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Database operations need careful tuning to match connection pool
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(15); // Should not exceed database connection pool
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("DatabaseAsync-");
        executor.setKeepAliveSeconds(30);
        
        // Be conservative with database operations
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        
        executor.initialize();
        
        logger.info("Database executor initialized with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }
}