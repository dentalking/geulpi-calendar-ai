package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.enums.InsightType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InsightRepository extends JpaRepository<Insight, String> {
    List<Insight> findTop5ByUserIdOrderByCreatedAtDesc(String userId);
    
    List<Insight> findByUserIdAndTypeAndCreatedAtAfter(
        String userId, InsightType type, LocalDateTime after);
    
    List<Insight> findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
        String userId, LocalDateTime after);
    
    @Query("SELECT i FROM Insight i LEFT JOIN FETCH i.suggestedActions WHERE i.user.id = :userId AND i.actionable = true")
    List<Insight> findActionableInsightsByUserId(@Param("userId") String userId);
}