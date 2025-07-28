package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.LifePhilosophy;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.entity.UserPreferences;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UserRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    private User testUser;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
    }
    
    @Test
    void findByEmail_WhenUserExists_ReturnsUser() {
        entityManager.persistAndFlush(testUser);
        
        Optional<User> found = userRepository.findByEmail("test@example.com");
        
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Test User");
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }
    
    @Test
    void findByEmail_WhenUserDoesNotExist_ReturnsEmpty() {
        Optional<User> found = userRepository.findByEmail("nonexistent@example.com");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void existsByEmail_WhenUserExists_ReturnsTrue() {
        entityManager.persistAndFlush(testUser);
        
        boolean exists = userRepository.existsByEmail("test@example.com");
        
        assertThat(exists).isTrue();
    }
    
    @Test
    void existsByEmail_WhenUserDoesNotExist_ReturnsFalse() {
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");
        
        assertThat(exists).isFalse();
    }
    
    @Test
    void findByIdWithDetails_LoadsUserWithAssociations() {
        User savedUser = entityManager.persistAndFlush(testUser);
        
        LifePhilosophy philosophy = LifePhilosophy.builder()
                .user(savedUser)
                .idealBalance(java.util.Map.of("work", 60, "personal", 40))
                .build();
        entityManager.persistAndFlush(philosophy);
        
        UserPreferences preferences = UserPreferences.builder()
                .user(savedUser)
                .defaultEventDuration(60)
                .build();
        entityManager.persistAndFlush(preferences);
        
        Optional<User> found = userRepository.findByIdWithDetails(savedUser.getId());
        
        assertThat(found).isPresent();
        User user = found.get();
        assertThat(user.getLifePhilosophy()).isNotNull();
        assertThat(user.getPreferences()).isNotNull();
        assertThat(user.getLifePhilosophy()).isNotNull();
    }
    
    @Test
    void findByIdWithDetails_WhenUserDoesNotExist_ReturnsEmpty() {
        Optional<User> found = userRepository.findByIdWithDetails("non-existent-id");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void save_CreatesNewUser() {
        User newUser = User.builder()
                .email("new@example.com")
                .name("New User")
                .onboardingCompleted(false)
                .build();
        
        User saved = userRepository.save(newUser);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("new@example.com");
        assertThat(saved.getName()).isEqualTo("New User");
        assertThat(saved.getOnboardingCompleted()).isFalse();
    }
    
    @Test
    void save_UpdatesExistingUser() {
        User savedUser = entityManager.persistAndFlush(testUser);
        
        savedUser.setName("Updated Name");
        savedUser.setOnboardingCompleted(false);
        
        User updated = userRepository.save(savedUser);
        
        assertThat(updated.getId()).isEqualTo(savedUser.getId());
        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getOnboardingCompleted()).isFalse();
    }
}