package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.Pattern;
import com.geulpi.calendar.domain.entity.TimeSlot;
import com.geulpi.calendar.domain.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class PatternRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private PatternRepository patternRepository;
    
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
    void findByUserIdOrderByFrequencyDesc_ReturnsOrderedPatterns() {
        Pattern highFreqPattern = createPatternWithTimeSlots("High Frequency", 10.0f, 0.9f);
        Pattern mediumFreqPattern = createPatternWithTimeSlots("Medium Frequency", 5.0f, 0.8f);
        Pattern lowFreqPattern = createPatternWithTimeSlots("Low Frequency", 2.0f, 0.7f);
        
        entityManager.persistAndFlush(highFreqPattern);
        entityManager.persistAndFlush(mediumFreqPattern);
        entityManager.persistAndFlush(lowFreqPattern);
        
        List<Pattern> patterns = patternRepository.findByUserIdOrderByFrequencyDesc(testUser.getId());
        
        assertThat(patterns).hasSize(3);
        assertThat(patterns.get(0).getName()).isEqualTo("High Frequency");
        assertThat(patterns.get(1).getName()).isEqualTo("Medium Frequency");
        assertThat(patterns.get(2).getName()).isEqualTo("Low Frequency");
        
        assertThat(patterns.get(0).getFrequency()).isEqualTo(10.0f);
        assertThat(patterns.get(1).getFrequency()).isEqualTo(5.0f);
        assertThat(patterns.get(2).getFrequency()).isEqualTo(2.0f);
    }
    
    @Test
    void findByUserIdOrderByFrequencyDesc_LoadsTimeSlots() {
        Pattern pattern = createPatternWithTimeSlots("Test Pattern", 5.0f, 0.8f);
        entityManager.persistAndFlush(pattern);
        
        List<Pattern> patterns = patternRepository.findByUserIdOrderByFrequencyDesc(testUser.getId());
        
        assertThat(patterns).hasSize(1);
        Pattern loadedPattern = patterns.get(0);
        assertThat(loadedPattern.getTimeSlots()).isNotEmpty();
        assertThat(loadedPattern.getTimeSlots()).hasSize(2);
    }
    
    @Test
    void findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc_FiltersCorrectly() {
        Pattern highConfPattern = createPatternWithTimeSlots("High Confidence", 10.0f, 0.9f);
        Pattern mediumConfPattern = createPatternWithTimeSlots("Medium Confidence", 8.0f, 0.7f);
        Pattern lowConfPattern = createPatternWithTimeSlots("Low Confidence", 6.0f, 0.5f);
        
        entityManager.persistAndFlush(highConfPattern);
        entityManager.persistAndFlush(mediumConfPattern);
        entityManager.persistAndFlush(lowConfPattern);
        
        float confidenceThreshold = 0.6f;
        List<Pattern> patterns = patternRepository.findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc(
                testUser.getId(), confidenceThreshold);
        
        assertThat(patterns).hasSize(2);
        assertThat(patterns.get(0).getName()).isEqualTo("High Confidence");
        assertThat(patterns.get(1).getName()).isEqualTo("Medium Confidence");
        
        assertThat(patterns.get(0).getConfidence()).isGreaterThan(confidenceThreshold);
        assertThat(patterns.get(1).getConfidence()).isGreaterThan(confidenceThreshold);
    }
    
    @Test
    void findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc_LoadsTimeSlots() {
        Pattern pattern = createPatternWithTimeSlots("High Confidence Pattern", 5.0f, 0.9f);
        entityManager.persistAndFlush(pattern);
        
        List<Pattern> patterns = patternRepository.findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc(
                testUser.getId(), 0.8f);
        
        assertThat(patterns).hasSize(1);
        Pattern loadedPattern = patterns.get(0);
        assertThat(loadedPattern.getTimeSlots()).isNotEmpty();
        assertThat(loadedPattern.getTimeSlots()).hasSize(2);
    }
    
    @Test
    void findByUserIdOrderByFrequencyDesc_WhenNoPatterns_ReturnsEmptyList() {
        List<Pattern> patterns = patternRepository.findByUserIdOrderByFrequencyDesc(testUser.getId());
        
        assertThat(patterns).isEmpty();
    }
    
    @Test
    void findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc_WhenNoPatternsAboveThreshold_ReturnsEmptyList() {
        Pattern lowConfPattern = createPatternWithTimeSlots("Low Confidence", 5.0f, 0.3f);
        entityManager.persistAndFlush(lowConfPattern);
        
        List<Pattern> patterns = patternRepository.findByUserIdAndConfidenceGreaterThanOrderByFrequencyDesc(
                testUser.getId(), 0.5f);
        
        assertThat(patterns).isEmpty();
    }
    
    @Test
    void save_CreatesNewPattern() {
        Pattern newPattern = Pattern.builder()
                .user(testUser)
                .name("New Pattern")
                .description("A new pattern")
                .frequency(3.0f)
                .confidence(0.85f)
                .build();
        
        Pattern saved = patternRepository.save(newPattern);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("New Pattern");
        assertThat(saved.getFrequency()).isEqualTo(3.0f);
        assertThat(saved.getConfidence()).isEqualTo(0.85f);
    }
    
    private Pattern createPatternWithTimeSlots(String name, float frequency, float confidence) {
        Pattern pattern = Pattern.builder()
                .user(testUser)
                .name(name)
                .description("Description for " + name)
                .frequency(frequency)
                .confidence(confidence)
                .build();
        
        TimeSlot timeSlot1 = TimeSlot.builder()
                .start(LocalDateTime.now().withHour(9).withMinute(0))
                .end(LocalDateTime.now().withHour(10).withMinute(0))
                .available(true)
                .build();
        
        TimeSlot timeSlot2 = TimeSlot.builder()
                .start(LocalDateTime.now().withHour(14).withMinute(0))
                .end(LocalDateTime.now().withHour(15).withMinute(0))
                .available(true)
                .build();
        
        pattern.setTimeSlots(Arrays.asList(timeSlot1, timeSlot2));
        
        return pattern;
    }
}