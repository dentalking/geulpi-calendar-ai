package com.geulpi.calendar.repository;

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
class UserPreferencesRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserPreferencesRepository userPreferencesRepository;
    
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
    void findByUserId_WhenPreferencesExist_ReturnsUserPreferences() {
        UserPreferences preferences = createUserPreferences();
        entityManager.persistAndFlush(preferences);
        
        Optional<UserPreferences> found = userPreferencesRepository.findByUserId(testUser.getId());
        
        assertThat(found).isPresent();
        UserPreferences result = found.get();
        assertThat(result.getDefaultEventDuration()).isEqualTo(60);
        assertThat(result.getUser()).isEqualTo(testUser);
    }
    
    @Test
    void findByUserId_WhenPreferencesDoNotExist_ReturnsEmpty() {
        Optional<UserPreferences> found = userPreferencesRepository.findByUserId(testUser.getId());
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void findByUserId_WhenUserDoesNotExist_ReturnsEmpty() {
        Optional<UserPreferences> found = userPreferencesRepository.findByUserId("non-existent-user");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void save_CreatesNewUserPreferences() {
        UserPreferences newPreferences = UserPreferences.builder()
                .user(testUser)
                .defaultEventDuration(90)
                .bufferTime(10)
                .build();
        
        UserPreferences saved = userPreferencesRepository.save(newPreferences);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getDefaultEventDuration()).isEqualTo(90);
        assertThat(saved.getBufferTime()).isEqualTo(10);
        assertThat(saved.getUser()).isEqualTo(testUser);
    }
    
    @Test
    void save_UpdatesExistingUserPreferences() {
        UserPreferences preferences = createUserPreferences();
        preferences = entityManager.persistAndFlush(preferences);
        
        preferences.setDefaultEventDuration(120);
        preferences.setBufferTime(20);
        
        UserPreferences updated = userPreferencesRepository.save(preferences);
        
        assertThat(updated.getId()).isEqualTo(preferences.getId());
        assertThat(updated.getDefaultEventDuration()).isEqualTo(120);
        assertThat(updated.getBufferTime()).isEqualTo(20);
    }
    
    @Test
    void save_WithNestedObjects_PersistsCorrectly() {
        UserPreferences preferences = UserPreferences.builder()
                .user(testUser)
                .defaultEventDuration(60)
                .bufferTime(15)
                .build();
        
        UserPreferences saved = userPreferencesRepository.save(preferences);
        
        assertThat(saved.getDefaultEventDuration()).isEqualTo(60);
        assertThat(saved.getBufferTime()).isEqualTo(15);
        assertThat(saved.getUser()).isEqualTo(testUser);
    }
    
    @Test
    void delete_RemovesUserPreferences() {
        UserPreferences preferences = createUserPreferences();
        preferences = entityManager.persistAndFlush(preferences);
        
        userPreferencesRepository.delete(preferences);
        
        Optional<UserPreferences> found = userPreferencesRepository.findByUserId(testUser.getId());
        assertThat(found).isEmpty();
    }
    
    private UserPreferences createUserPreferences() {
        return UserPreferences.builder()
                .user(testUser)
                .defaultEventDuration(60)
                .bufferTime(15)
                .build();
    }
}