package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Pattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatternRepository extends JpaRepository<Pattern, String> {
    
    @Query("SELECT p FROM Pattern p LEFT JOIN FETCH p.timeSlots " +
           "WHERE p.user.id = :userId ORDER BY p.frequency DESC")
    List<Pattern> findByUserIdOrderByFrequencyDesc(@Param("userId") String userId);
    
    @Query("SELECT p FROM Pattern p LEFT JOIN FETCH p.timeSlots " +
           "WHERE p.user.id = :userId AND p.confidence > :confidenceThreshold " +
           "ORDER BY p.frequency DESC")
    List<Pattern> findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc(
        @Param("userId") String userId, @Param("confidenceThreshold") Float confidenceThreshold);
}