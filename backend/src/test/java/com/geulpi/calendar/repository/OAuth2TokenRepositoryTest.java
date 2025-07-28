package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.domain.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Transactional
class OAuth2TokenRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private OAuth2TokenRepository oAuth2TokenRepository;
    
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
    void findByUserIdAndProvider_WhenTokenExists_ReturnsToken() {
        OAuth2Token token = createOAuth2Token("google");
        entityManager.persistAndFlush(token);
        
        Optional<OAuth2Token> found = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "google");
        
        assertThat(found).isPresent();
        OAuth2Token result = found.get();
        assertThat(result.getProvider()).isEqualTo("google");
        assertThat(result.getAccessToken()).isEqualTo("access-token-123");
        assertThat(result.getUser()).isEqualTo(testUser);
    }
    
    @Test
    void findByUserIdAndProvider_WhenTokenDoesNotExist_ReturnsEmpty() {
        Optional<OAuth2Token> found = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "github");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void findByUserIdAndProvider_WhenWrongProvider_ReturnsEmpty() {
        OAuth2Token token = createOAuth2Token("google");
        entityManager.persistAndFlush(token);
        
        Optional<OAuth2Token> found = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "github");
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void findByUserId_WhenTokenExists_ReturnsToken() {
        OAuth2Token token = createOAuth2Token("google");
        entityManager.persistAndFlush(token);
        
        Optional<OAuth2Token> found = oAuth2TokenRepository.findFirstByUserIdOrderByCreatedAtDesc(testUser.getId());
        
        assertThat(found).isPresent();
        assertThat(found.get().getUser()).isEqualTo(testUser);
    }
    
    @Test
    void findByUserId_WhenMultipleTokensExist_ReturnsOne() {
        OAuth2Token googleToken = createOAuth2Token("google");
        OAuth2Token githubToken = createOAuth2Token("github");
        
        // Persist tokens with different providers for the same user
        entityManager.persistAndFlush(googleToken);
        entityManager.persistAndFlush(githubToken);
        entityManager.clear(); // Clear persistence context to avoid conflicts
        
        Optional<OAuth2Token> found = oAuth2TokenRepository.findFirstByUserIdOrderByCreatedAtDesc(testUser.getId());
        
        assertThat(found).isPresent();
        assertThat(found.get().getUser().getId()).isEqualTo(testUser.getId());
    }
    
    @Test
    void findByUserId_WhenNoTokenExists_ReturnsEmpty() {
        Optional<OAuth2Token> found = oAuth2TokenRepository.findFirstByUserIdOrderByCreatedAtDesc(testUser.getId());
        
        assertThat(found).isEmpty();
    }
    
    @Test
    void save_CreatesNewToken() {
        OAuth2Token newToken = OAuth2Token.builder()
                .user(testUser)
                .provider("microsoft")
                .accessToken("new-access-token")
                .refreshToken("new-refresh-token")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .scope("email profile calendar")
                .build();
        
        OAuth2Token saved = oAuth2TokenRepository.save(newToken);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getProvider()).isEqualTo("microsoft");
        assertThat(saved.getAccessToken()).isEqualTo("new-access-token");
        assertThat(saved.getRefreshToken()).isEqualTo("new-refresh-token");
        assertThat(saved.getUser()).isEqualTo(testUser);
    }
    
    @Test
    void save_UpdatesExistingToken() {
        OAuth2Token token = createOAuth2Token("google");
        token = entityManager.persistAndFlush(token);
        
        token.setAccessToken("updated-access-token");
        token.setRefreshToken("updated-refresh-token");
        token.setExpiresAt(LocalDateTime.now().plusHours(2));
        
        OAuth2Token updated = oAuth2TokenRepository.save(token);
        
        assertThat(updated.getId()).isEqualTo(token.getId());
        assertThat(updated.getAccessToken()).isEqualTo("updated-access-token");
        assertThat(updated.getRefreshToken()).isEqualTo("updated-refresh-token");
    }
    
    @Test
    void deleteByUserIdAndProvider_RemovesSpecificToken() {
        OAuth2Token googleToken = createOAuth2Token("google");
        OAuth2Token githubToken = createOAuth2Token("github");
        
        entityManager.persistAndFlush(googleToken);
        entityManager.persistAndFlush(githubToken);
        entityManager.clear(); // Clear persistence context
        
        oAuth2TokenRepository.deleteByUserIdAndProvider(testUser.getId(), "google");
        entityManager.flush();
        entityManager.clear(); // Clear again after delete
        
        Optional<OAuth2Token> googleFound = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "google");
        Optional<OAuth2Token> githubFound = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "github");
        
        assertThat(googleFound).isEmpty();
        assertThat(githubFound).isPresent();
    }
    
    @Test
    void deleteByUserIdAndProvider_WhenTokenDoesNotExist_DoesNotThrow() {
        // This should not throw an exception even if the token doesn't exist
        oAuth2TokenRepository.deleteByUserIdAndProvider(testUser.getId(), "nonexistent");
        
        // Just verify the operation completes without error
        assertThat(true).isTrue();
    }
    
    @Test
    void save_WithExpiredToken_PersistsCorrectly() {
        OAuth2Token expiredToken = OAuth2Token.builder()
                .user(testUser)
                .provider("google")
                .accessToken("expired-token")
                .refreshToken("refresh-token")
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired
                .scope("email profile")
                .build();
        
        OAuth2Token saved = oAuth2TokenRepository.save(expiredToken);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getExpiresAt()).isBefore(LocalDateTime.now());
        
        Optional<OAuth2Token> found = oAuth2TokenRepository.findByUserIdAndProvider(
                testUser.getId(), "google");
        assertThat(found).isPresent();
        assertThat(found.get().getExpiresAt()).isBefore(LocalDateTime.now());
    }
    
    private OAuth2Token createOAuth2Token(String provider) {
        return OAuth2Token.builder()
                .user(testUser)
                .provider(provider)
                .accessToken("access-token-123")
                .refreshToken("refresh-token-123")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .scope("email profile calendar")
                .build();
    }
}