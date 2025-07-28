package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.InsightType;
import com.geulpi.calendar.domain.enums.SuggestionStatus;
import com.geulpi.calendar.domain.enums.SuggestionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class InsightRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private InsightRepository insightRepository;
    
    private User testUser;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        testUser = entityManager.persistAndFlush(testUser);
    }
    
    @Test
    void findTop5ByUserIdOrderByCreatedAtDesc_ReturnsLatestInsights() {
        LocalDateTime now = LocalDateTime.now();
        
        for (int i = 0; i < 10; i++) {
            Insight insight = createInsight("Insight " + i, now.minusHours(i));
            entityManager.persistAndFlush(insight);
        }
        
        List<Insight> insights = insightRepository.findTop5ByUserIdOrderByCreatedAtDesc(testUser.getId());
        
        assertThat(insights).hasSize(5);
        assertThat(insights.get(0).getContent()).isEqualTo("Insight 0");
        assertThat(insights.get(4).getContent()).isEqualTo("Insight 4");
        
        for (int i = 0; i < 4; i++) {
            assertThat(insights.get(i).getCreatedAt())
                    .isAfter(insights.get(i + 1).getCreatedAt());
        }
    }
    
    @Test
    void findByUserIdAndTypeAndCreatedAtAfter_FiltersCorrectly() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(1);
        
        Insight oldInsight = createInsight("Old Insight", cutoff.minusHours(1));
        oldInsight.setType(InsightType.OPTIMIZATION_OPPORTUNITY);
        
        Insight recentInsight = createInsight("Recent Insight", cutoff.plusHours(1));
        recentInsight.setType(InsightType.OPTIMIZATION_OPPORTUNITY);
        
        Insight wrongTypeInsight = createInsight("Wrong Type", cutoff.plusHours(1));
        wrongTypeInsight.setType(InsightType.IMBALANCE);
        
        entityManager.persistAndFlush(oldInsight);
        entityManager.persistAndFlush(recentInsight);
        entityManager.persistAndFlush(wrongTypeInsight);
        
        List<Insight> insights = insightRepository.findByUserIdAndTypeAndCreatedAtAfter(
                testUser.getId(), InsightType.OPTIMIZATION_OPPORTUNITY, cutoff);
        
        assertThat(insights).hasSize(1);
        assertThat(insights.get(0).getContent()).isEqualTo("Recent Insight");
        assertThat(insights.get(0).getType()).isEqualTo(InsightType.OPTIMIZATION_OPPORTUNITY);
    }
    
    @Test
    void findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc_ReturnsOrderedInsights() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(1);
        
        Insight oldInsight = createInsight("Old Insight", cutoff.minusHours(1));
        Insight insight1 = createInsight("Insight 1", cutoff.plusHours(1));
        Insight insight2 = createInsight("Insight 2", cutoff.plusHours(2));
        Insight insight3 = createInsight("Insight 3", cutoff.plusHours(3));
        
        entityManager.persistAndFlush(oldInsight);
        entityManager.persistAndFlush(insight1);
        entityManager.persistAndFlush(insight2);
        entityManager.persistAndFlush(insight3);
        
        List<Insight> insights = insightRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                testUser.getId(), cutoff);
        
        assertThat(insights).hasSize(3);
        assertThat(insights.get(0).getContent()).isEqualTo("Insight 3");
        assertThat(insights.get(1).getContent()).isEqualTo("Insight 2");
        assertThat(insights.get(2).getContent()).isEqualTo("Insight 1");
    }
    
    @Test
    void findActionableInsightsByUserId_LoadsWithSuggestedActions() {
        Insight actionableInsight = createInsight("Actionable Insight", LocalDateTime.now());
        actionableInsight.setActionable(true);
        actionableInsight = entityManager.persistAndFlush(actionableInsight);
        
        Insight nonActionableInsight = createInsight("Non-actionable Insight", LocalDateTime.now());
        nonActionableInsight.setActionable(false);
        entityManager.persistAndFlush(nonActionableInsight);
        
        Suggestion suggestedAction = Suggestion.builder()
                .user(testUser)
                .type(SuggestionType.NEW_EVENT)
                .status(SuggestionStatus.PENDING)
                .title("Suggested Action")
                .description("This is a suggested action")
                .reasoning("High confidence suggestion")
                .priority(com.geulpi.calendar.domain.enums.Priority.HIGH)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        entityManager.persistAndFlush(suggestedAction);
        
        List<Suggestion> actions = new ArrayList<>();
        actions.add(suggestedAction);
        actionableInsight.setSuggestedActions(actions);
        entityManager.persistAndFlush(actionableInsight);
        
        List<Insight> insights = insightRepository.findActionableInsightsByUserId(testUser.getId());
        
        assertThat(insights).hasSize(1);
        assertThat(insights.get(0).getContent()).isEqualTo("Actionable Insight");
        assertThat(insights.get(0).getActionable()).isTrue();
        assertThat(insights.get(0).getSuggestedActions()).isNotEmpty();
    }
    
    @Test
    void findActionableInsightsByUserId_ExcludesNonActionableInsights() {
        Insight nonActionableInsight = createInsight("Non-actionable", LocalDateTime.now());
        nonActionableInsight.setActionable(false);
        entityManager.persistAndFlush(nonActionableInsight);
        
        List<Insight> insights = insightRepository.findActionableInsightsByUserId(testUser.getId());
        
        assertThat(insights).isEmpty();
    }
    
    @Test
    void save_CreatesNewInsight() {
        Insight newInsight = Insight.builder()
                .user(testUser)
                .type(InsightType.OPTIMIZATION_OPPORTUNITY)
                .content("New Insight")
                .data(java.util.Map.of("description", "This is a new insight"))
                .impactScore(0.9f)
                .actionable(true)
                .build();
        
        Insight saved = insightRepository.save(newInsight);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getContent()).isEqualTo("New Insight");
        assertThat(saved.getType()).isEqualTo(InsightType.OPTIMIZATION_OPPORTUNITY);
        assertThat(saved.getActionable()).isTrue();
        assertThat(saved.getCreatedAt()).isNotNull();
    }
    
    private Insight createInsight(String title, LocalDateTime createdAt) {
        Insight insight = Insight.builder()
                .user(testUser)
                .type(InsightType.IMBALANCE)
                .content(title)
                .data(java.util.Map.of("description", "Description for " + title))
                .impactScore(0.8f)
                .actionable(true)
                .build();
        
        insight.setCreatedAt(createdAt);
        return insight;
    }
}