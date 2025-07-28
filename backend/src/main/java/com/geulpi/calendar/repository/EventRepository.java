package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {
    
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "WHERE e.user.id = :userId AND e.startTime BETWEEN :start AND :end " +
           "ORDER BY e.startTime")
    List<Event> findByUserIdAndStartTimeBetweenOrderByStartTime(
        @Param("userId") String userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "WHERE e.user.id = :userId AND e.area IN :areas AND e.startTime BETWEEN :start AND :end")
    List<Event> findByUserIdAndAreaInAndStartTimeBetween(
        @Param("userId") String userId, @Param("areas") List<LifeArea> areas, 
        @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "LEFT JOIN FETCH e.recurrence WHERE e.id = :id")
    Optional<Event> findByIdWithDetails(@Param("id") String id);
    
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "WHERE e.user.id = :userId AND " +
           "(LOWER(e.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Event> searchByTitleOrDescription(@Param("userId") String userId, @Param("query") String query);
    
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "WHERE e.user.id = :userId AND e.startTime > :after " +
           "ORDER BY e.startTime")
    List<Event> findTop5ByUserIdAndStartTimeAfterOrderByStartTime(
        @Param("userId") String userId, @Param("after") LocalDateTime after);
    
    void deleteByUserIdAndGoogleEventId(String userId, String googleEventId);
    
    boolean existsByGoogleEventId(String googleEventId);
    
    List<Event> findByUserIdAndGoogleEventIdIsNotNull(String userId);
    
    Optional<Event> findByGoogleEventId(String googleEventId);
    
    // Batch loading methods for DataLoader
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.area LEFT JOIN FETCH e.location " +
           "WHERE e.user.id IN :userIds ORDER BY e.user.id, e.startTime")
    List<Event> findByUserIdIn(@Param("userIds") List<String> userIds);
    
    // Optimized projection queries for performance
    @Query("SELECT e.id, e.title, e.startTime, e.endTime, " +
           "u.id as userId, u.name as userName, " +
           "a.id as areaId, a.name as areaName " +
           "FROM Event e " +
           "JOIN e.user u " +
           "LEFT JOIN e.area a " +
           "WHERE e.user.id = :userId AND e.startTime BETWEEN :start AND :end " +
           "ORDER BY e.startTime")
    List<Object[]> findEventProjectionsByUserIdAndDateRange(
        @Param("userId") String userId, 
        @Param("start") LocalDateTime start, 
        @Param("end") LocalDateTime end);
    
    // Count queries for pagination
    @Query("SELECT COUNT(e) FROM Event e WHERE e.user.id = :userId " +
           "AND e.startTime BETWEEN :start AND :end")
    Long countByUserIdAndStartTimeBetween(
        @Param("userId") String userId, 
        @Param("start") LocalDateTime start, 
        @Param("end") LocalDateTime end);
}