package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.LifePhilosophy;
import com.geulpi.calendar.domain.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class LifeAreaRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private LifeAreaRepository lifeAreaRepository;
    
    private User testUser;
    private LifePhilosophy testPhilosophy;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        testUser = entityManager.persistAndFlush(testUser);
        
        testPhilosophy = LifePhilosophy.builder()
                .user(testUser)
                .idealBalance(java.util.Map.of("work", 60, "personal", 40))
                .build();
        testPhilosophy = entityManager.persistAndFlush(testPhilosophy);
    }
    
    @Test
    void findByLifePhilosophyUserId_ReturnsUserLifeAreas() {
        LifeArea workArea = LifeArea.builder()
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(testPhilosophy)
                .build();
        
        LifeArea personalArea = LifeArea.builder()
                .name("Personal")
                .color("#00FF00")
                .icon("personal")
                .targetPercentage(40.0f)
                .lifePhilosophy(testPhilosophy)
                .build();
        
        entityManager.persistAndFlush(workArea);
        entityManager.persistAndFlush(personalArea);
        
        List<LifeArea> lifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(testUser.getId());
        
        assertThat(lifeAreas).hasSize(2);
        assertThat(lifeAreas)
                .extracting(LifeArea::getName)
                .containsExactlyInAnyOrder("Work", "Personal");
    }
    
    @Test
    void findByLifePhilosophyUserId_WhenNoLifeAreas_ReturnsEmptyList() {
        List<LifeArea> lifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(testUser.getId());
        
        assertThat(lifeAreas).isEmpty();
    }
    
    @Test
    void findByLifePhilosophyUserId_WhenUserDoesNotExist_ReturnsEmptyList() {
        List<LifeArea> lifeAreas = lifeAreaRepository.findByLifePhilosophyUserId("non-existent-user");
        
        assertThat(lifeAreas).isEmpty();
    }
    
    @Test
    void findByLifePhilosophyUserIdAndName_WhenExists_ReturnsLifeArea() {
        LifeArea workArea = LifeArea.builder()
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(testPhilosophy)
                .build();
        entityManager.persistAndFlush(workArea);
        
        Optional<LifeArea> found = lifeAreaRepository.findByLifePhilosophyUserIdAndName(
                testUser.getId(), "Work");
        
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Work");
        assertThat(found.get().getColor()).isEqualTo("#FF0000");
        assertThat(found.get().getTargetPercentage()).isEqualTo(60.0f);
    }
    
    @Test
    void findByLifePhilosophyUserIdAndName_WhenDoesNotExist_ReturnsEmpty() {
        Optional<LifeArea> found = lifeAreaRepository.findByLifePhilosophyUserIdAndName(
                testUser.getId(), "NonExistent");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void findByLifePhilosophyUserIdAndName_CaseSensitive() {
        LifeArea workArea = LifeArea.builder()
                .name("Work")
                .color("#FF0000")
                .icon("work")
                .targetPercentage(60.0f)
                .lifePhilosophy(testPhilosophy)
                .build();
        entityManager.persistAndFlush(workArea);
        
        Optional<LifeArea> found = lifeAreaRepository.findByLifePhilosophyUserIdAndName(
                testUser.getId(), "work");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void save_CreatesNewLifeArea() {
        LifeArea newArea = LifeArea.builder()
                .name("Health")
                .color("#0000FF")
                .icon("health")
                .targetPercentage(20.0f)
                .lifePhilosophy(testPhilosophy)
                .build();
        
        LifeArea saved = lifeAreaRepository.save(newArea);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Health");
        assertThat(saved.getColor()).isEqualTo("#0000FF");
        assertThat(saved.getLifePhilosophy()).isEqualTo(testPhilosophy);
    }
}