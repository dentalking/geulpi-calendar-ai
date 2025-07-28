package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.*;
import com.geulpi.calendar.domain.enums.*;
import static com.geulpi.calendar.domain.enums.Priority.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class SuggestionRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private SuggestionRepository suggestionRepository;
    
    private User testUser;
    private LifeArea testLifeArea;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        testUser = entityManager.persistAndFlush(testUser);
        
        LifePhilosophy philosophy = LifePhilosophy.builder()
                .user(testUser)
                .build();
        philosophy = entityManager.persistAndFlush(philosophy);
        
        testLifeArea = LifeArea.builder()
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(philosophy)
                .build();
        testLifeArea = entityManager.persistAndFlush(testLifeArea);
    }
    
    @Test
    void findByUserIdAndStatus_ReturnsSuggestionsWithSpecificStatus() {
        Suggestion pendingSuggestion = createSuggestion("Pending Suggestion", SuggestionStatus.PENDING);
        Suggestion acceptedSuggestion = createSuggestion("Accepted Suggestion", SuggestionStatus.ACCEPTED);
        Suggestion dismissedSuggestion = createSuggestion("Dismissed Suggestion", SuggestionStatus.REJECTED);
        
        entityManager.persistAndFlush(pendingSuggestion);
        entityManager.persistAndFlush(acceptedSuggestion);
        entityManager.persistAndFlush(dismissedSuggestion);
        
        List<Suggestion> pendingSuggestions = suggestionRepository.findByUserIdAndStatus(
                testUser.getId(), SuggestionStatus.PENDING);
        
        assertThat(pendingSuggestions).hasSize(1);
        assertThat(pendingSuggestions.get(0).getTitle()).isEqualTo("Pending Suggestion");
    }
    
    @Test
    void findByUserIdAndStatusAndExpiresAtAfter_ReturnsNonExpiredSuggestions() {
        LocalDateTime now = LocalDateTime.now();
        
        Suggestion expiredSuggestion = createSuggestion("Expired", SuggestionStatus.PENDING);
        expiredSuggestion.setExpiresAt(now.minusHours(1));
        
        Suggestion validSuggestion = createSuggestion("Valid", SuggestionStatus.PENDING);
        validSuggestion.setExpiresAt(now.plusHours(1));
        
        entityManager.persistAndFlush(expiredSuggestion);
        entityManager.persistAndFlush(validSuggestion);
        
        List<Suggestion> validSuggestions = suggestionRepository.findByUserIdAndStatusAndExpiresAtAfter(
                testUser.getId(), SuggestionStatus.PENDING, now);
        
        assertThat(validSuggestions).hasSize(1);
        assertThat(validSuggestions.get(0).getTitle()).isEqualTo("Valid");
    }
    
    @Test
    void findByIdWithDetails_LoadsSuggestionWithAssociations() {
        Event proposedEvent = Event.builder()
                .user(testUser)
                .title("Proposed Event")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(1))
                .area(testLifeArea)
                .source(EventSource.AI_SUGGESTED)
                .createdBy(CreatedBy.AI)
                .aiConfidence(0.9f)
                .balanceImpact(0.1f)
                .build();
        proposedEvent = entityManager.persistAndFlush(proposedEvent);
        
        ImpactAnalysis impact = ImpactAnalysis.builder()
                .balanceImprovement(0.1f)
                .conflictResolution(false)
                .productivityGain(0.2f)
                .build();
        impact = entityManager.persistAndFlush(impact);
        
        Suggestion suggestion = Suggestion.builder()
                .user(testUser)
                .type(SuggestionType.SCHEDULE_OPTIMIZATION)
                .status(SuggestionStatus.PENDING)
                .title("Optimize your schedule")
                .description("Consider rescheduling this meeting")
                .proposedEvent(proposedEvent)
                .impact(impact)
                .reasoning("Test reasoning")
                .priority(Priority.MEDIUM)
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
        suggestion = entityManager.persistAndFlush(suggestion);
        
        Optional<Suggestion> found = suggestionRepository.findByIdWithDetails(suggestion.getId());
        
        assertThat(found).isPresent();
        Suggestion result = found.get();
        assertThat(result.getProposedEvent()).isNotNull();
        assertThat(result.getImpact()).isNotNull();
        assertThat(result.getProposedEvent().getTitle()).isEqualTo("Proposed Event");
        assertThat(result.getImpact().getBalanceImprovement()).isEqualTo(0.1f);
    }
    
    @Test
    void findByUserIdAndTypeAndStatusIn_FiltersByTypeAndStatuses() {
        Suggestion timeOptSuggestion = createSuggestion("Time Optimization", SuggestionStatus.PENDING);
        timeOptSuggestion.setType(SuggestionType.SCHEDULE_OPTIMIZATION);
        
        Suggestion balanceSuggestion = createSuggestion("Balance Adjustment", SuggestionStatus.ACCEPTED);
        balanceSuggestion.setType(SuggestionType.NEW_EVENT);
        
        Suggestion eventSuggestion = createSuggestion("Event Suggestion", SuggestionStatus.PENDING);
        eventSuggestion.setType(SuggestionType.EVENT_MODIFICATION);
        
        entityManager.persistAndFlush(timeOptSuggestion);
        entityManager.persistAndFlush(balanceSuggestion);
        entityManager.persistAndFlush(eventSuggestion);
        
        List<SuggestionStatus> statuses = Arrays.asList(
                SuggestionStatus.PENDING, SuggestionStatus.ACCEPTED);
        
        List<Suggestion> suggestions = suggestionRepository.findByUserIdAndTypeAndStatusIn(
                testUser.getId(), SuggestionType.SCHEDULE_OPTIMIZATION, statuses);
        
        assertThat(suggestions).hasSize(1);
        assertThat(suggestions.get(0).getType()).isEqualTo(SuggestionType.SCHEDULE_OPTIMIZATION);
        assertThat(suggestions.get(0).getTitle()).isEqualTo("Time Optimization");
    }
    
    @Test
    void save_CreatesNewSuggestion() {
        Suggestion newSuggestion = Suggestion.builder()
                .user(testUser)
                .type(SuggestionType.NEW_EVENT)
                .status(SuggestionStatus.PENDING)
                .title("New Suggestion")
                .description("This is a new suggestion")
                .reasoning("New suggestion reasoning")
                .priority(Priority.HIGH)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        
        Suggestion saved = suggestionRepository.save(newSuggestion);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getTitle()).isEqualTo("New Suggestion");
        assertThat(saved.getType()).isEqualTo(SuggestionType.NEW_EVENT);
        assertThat(saved.getStatus()).isEqualTo(SuggestionStatus.PENDING);
    }
    
    private Suggestion createSuggestion(String title, SuggestionStatus status) {
        return Suggestion.builder()
                .user(testUser)
                .type(SuggestionType.NEW_EVENT)
                .status(status)
                .title(title)
                .description("Description for " + title)
                .reasoning("Test reasoning")
                .priority(Priority.MEDIUM)
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
    }
}