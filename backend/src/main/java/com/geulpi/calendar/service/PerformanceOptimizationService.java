package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Service for implementing performance optimizations across the application
 */
@Service
@Transactional(readOnly = true)
public class PerformanceOptimizationService {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceOptimizationService.class);

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Cached method for frequently accessed user events
     * Cache key includes userId and date range for proper invalidation
     */
    @Cacheable(value = "userEventsSummary", key = "#userId + '_' + #start + '_' + #end")
    public List<Object[]> getCachedUserEventsSummary(String userId, LocalDateTime start, LocalDateTime end) {
        logger.info("Fetching user events summary from database for user: {}", userId);
        return eventRepository.findEventProjectionsByUserIdAndDateRange(userId, start, end);
    }

    /**
     * Async method for processing heavy operations without blocking the main thread
     */
    @Async("taskExecutor")
    public CompletableFuture<List<Event>> getUserEventsAsync(String userId, LocalDateTime start, LocalDateTime end) {
        logger.info("Processing async user events query for user: {}", userId);
        
        try {
            List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(userId, start, end);
            return CompletableFuture.completedFuture(events);
        } catch (Exception e) {
            logger.error("Error in async user events processing for user: {}", userId, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Optimized pagination for large datasets
     */
    public Page<Event> getUserEventsPaginated(String userId, LocalDateTime start, LocalDateTime end, 
                                            int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("startTime").ascending());
        
        // First get count for pagination
        Long totalCount = eventRepository.countByUserIdAndStartTimeBetween(userId, start, end);
        
        if (totalCount == 0) {
            return Page.empty(pageable);
        }
        
        // Then get the actual data
        List<Event> events = eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(userId, start, end);
        
        // Manual pagination to avoid additional database query
        int startIndex = page * size;
        int endIndex = Math.min(startIndex + size, events.size());
        
        if (startIndex >= events.size()) {
            return Page.empty(pageable);
        }
        
        List<Event> pageContent = events.subList(startIndex, endIndex);
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, totalCount);
    }

    /**
     * Batch processing for multiple users to reduce database round trips
     */
    @Async("taskExecutor")
    public CompletableFuture<List<Event>> getBatchUserEventsAsync(List<String> userIds) {
        logger.info("Processing batch user events query for {} users", userIds.size());
        
        try {
            List<Event> events = eventRepository.findByUserIdIn(userIds);
            return CompletableFuture.completedFuture(events);
        } catch (Exception e) {
            logger.error("Error in batch user events processing", e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Optimized search with full-text search capabilities
     */
    @Cacheable(value = "eventSearch", key = "#userId + '_' + #query", unless = "#result.isEmpty()")
    public List<Event> searchUserEventsOptimized(String userId, String query) {
        logger.info("Searching events for user: {} with query: {}", userId, query);
        
        // Use the existing search method but with caching
        return eventRepository.searchByTitleOrDescription(userId, query);
    }

    /**
     * Batch user loading for GraphQL resolvers
     */
    @Cacheable(value = "usersBatch", key = "#userIds.hashCode()")
    public List<User> getUsersBatch(List<String> userIds) {
        logger.info("Batch loading {} users", userIds.size());
        return userRepository.findAllById(userIds);
    }

    /**
     * Preload related entities to avoid N+1 queries
     */
    @Cacheable(value = "eventsWithDetails", key = "#eventId")
    public Event getEventWithAllDetails(String eventId) {
        logger.info("Loading event with all details: {}", eventId);
        return eventRepository.findByIdWithDetails(eventId).orElse(null);
    }

    /**
     * Bulk operations for better performance during data synchronization
     */
    @Transactional
    public void bulkUpdateEvents(List<Event> events) {
        logger.info("Bulk updating {} events", events.size());
        
        // Process in batches to avoid memory issues
        int batchSize = 25; // Match Hibernate batch size
        for (int i = 0; i < events.size(); i += batchSize) {
            int endIndex = Math.min(i + batchSize, events.size());
            List<Event> batch = events.subList(i, endIndex);
            
            eventRepository.saveAll(batch);
            
            // Flush and clear to manage memory
            if (i % batchSize == 0) {
                eventRepository.flush();
            }
        }
    }

    /**
     * Performance monitoring method to track slow operations
     */
    public <T> T monitorPerformance(String operationName, java.util.function.Supplier<T> operation) {
        long startTime = System.currentTimeMillis();
        
        try {
            T result = operation.get();
            long executionTime = System.currentTimeMillis() - startTime;
            
            if (executionTime > 1000) { // Log operations taking more than 1 second
                logger.warn("Slow operation detected: {} took {}ms", operationName, executionTime);
            } else {
                logger.debug("Operation {} completed in {}ms", operationName, executionTime);
            }
            
            return result;
        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            logger.error("Operation {} failed after {}ms", operationName, executionTime, e);
            throw e;
        }
    }
}