package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.enums.SuggestionStatus;
import com.geulpi.calendar.domain.enums.SuggestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SuggestionRepository extends JpaRepository<Suggestion, String> {
    List<Suggestion> findByUserIdAndStatus(String userId, SuggestionStatus status);
    
    List<Suggestion> findByUserIdAndStatusAndExpiresAtAfter(
        String userId, SuggestionStatus status, LocalDateTime now);
    
    @Query("SELECT s FROM Suggestion s LEFT JOIN FETCH s.proposedEvent LEFT JOIN FETCH s.impact WHERE s.id = :id")
    Optional<Suggestion> findByIdWithDetails(@Param("id") String id);
    
    List<Suggestion> findByUserIdAndTypeAndStatusIn(
        String userId, SuggestionType type, List<SuggestionStatus> statuses);
    
    @Query("UPDATE Suggestion s SET s.status = :status WHERE s.id IN :ids")
    void updateStatusByIds(@Param("ids") List<String> ids, @Param("status") SuggestionStatus status);
}