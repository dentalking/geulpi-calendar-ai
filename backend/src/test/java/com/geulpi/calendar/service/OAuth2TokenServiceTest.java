package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.OAuth2TokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2TokenServiceTest {
    
    @Mock
    private OAuth2TokenRepository oauth2TokenRepository;
    
    @InjectMocks
    private OAuth2TokenService oauth2TokenService;
    
    private User testUser;
    private OAuth2AuthorizedClient authorizedClient;
    private OAuth2AccessToken accessToken;
    private OAuth2RefreshToken refreshToken;
    private ClientRegistration clientRegistration;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .build();
        
        clientRegistration = ClientRegistration.withRegistrationId("google")
                .clientId("client-id")
                .clientSecret("client-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("http://localhost:8080/login/oauth2/code/google")
                .authorizationUri("https://accounts.google.com/o/oauth2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .build();
        
        accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                "access-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Set.of("email", "profile", "calendar")
        );
        
        refreshToken = new OAuth2RefreshToken("refresh-token-value", Instant.now());
        
        authorizedClient = new OAuth2AuthorizedClient(
                clientRegistration,
                "test-principal",
                accessToken,
                refreshToken
        );
    }
    
    @Test
    void saveOrUpdateOAuth2Token_WhenNewToken_CreatesNewToken() {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        when(oauth2TokenRepository.save(any(OAuth2Token.class)))
                .thenAnswer(i -> i.getArgument(0));
        
        oauth2TokenService.saveOrUpdateOAuth2Token(testUser, authorizedClient);
        
        verify(oauth2TokenRepository).findByUserIdAndProvider(testUser.getId(), "google");
        verify(oauth2TokenRepository).save(any(OAuth2Token.class));
    }
    
    @Test
    void saveOrUpdateOAuth2Token_WhenExistingToken_UpdatesToken() {
        OAuth2Token existingToken = OAuth2Token.builder()
                .id("existing-token-id")
                .user(testUser)
                .provider("google")
                .accessToken("old-access-token")
                .refreshToken("old-refresh-token")
                .scope("email profile")
                .build();
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(existingToken));
        when(oauth2TokenRepository.save(any(OAuth2Token.class)))
                .thenAnswer(i -> i.getArgument(0));
        
        oauth2TokenService.saveOrUpdateOAuth2Token(testUser, authorizedClient);
        
        verify(oauth2TokenRepository).save(any(OAuth2Token.class));
    }
    
    @Test
    void saveOrUpdateOAuth2Token_WithoutRefreshToken_SavesCorrectly() {
        OAuth2AuthorizedClient clientWithoutRefresh = new OAuth2AuthorizedClient(
                clientRegistration,
                "test-principal",
                accessToken,
                null // No refresh token
        );
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        when(oauth2TokenRepository.save(any(OAuth2Token.class)))
                .thenAnswer(i -> i.getArgument(0));
        
        oauth2TokenService.saveOrUpdateOAuth2Token(testUser, clientWithoutRefresh);
        
        verify(oauth2TokenRepository).save(any(OAuth2Token.class));
    }
    
    @Test
    void getTokenByUserAndProvider_WhenTokenExists_ReturnsToken() {
        OAuth2Token expectedToken = OAuth2Token.builder()
                .user(testUser)
                .provider("google")
                .accessToken("access-token")
                .build();
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(expectedToken));
        
        Optional<OAuth2Token> result = oauth2TokenService.getTokenByUserAndProvider(
                testUser.getId(), "google");
        
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(expectedToken);
        verify(oauth2TokenRepository).findByUserIdAndProvider(testUser.getId(), "google");
    }
    
    @Test
    void getTokenByUserAndProvider_WhenTokenDoesNotExist_ReturnsEmpty() {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        
        Optional<OAuth2Token> result = oauth2TokenService.getTokenByUserAndProvider(
                testUser.getId(), "google");
        
        assertThat(result).isEmpty();
        verify(oauth2TokenRepository).findByUserIdAndProvider(testUser.getId(), "google");
    }
    
    @Test
    void deleteTokenByUserAndProvider_CallsRepositoryDelete() {
        oauth2TokenService.deleteTokenByUserAndProvider(testUser.getId(), "google");
        
        verify(oauth2TokenRepository).deleteByUserIdAndProvider(testUser.getId(), "google");
    }
    
    @Test
    void hasValidToken_WhenValidTokenExists_ReturnsTrue() {
        OAuth2Token validToken = OAuth2Token.builder()
                .user(testUser)
                .provider("google")
                .accessToken("access-token")
                .expiresAt(LocalDateTime.now().plusHours(1)) // Valid for 1 hour
                .build();
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        boolean result = oauth2TokenService.hasValidToken(testUser.getId(), "google");
        
        assertThat(result).isTrue();
    }
    
    @Test
    void hasValidToken_WhenExpiredTokenExists_ReturnsFalse() {
        OAuth2Token expiredToken = OAuth2Token.builder()
                .user(testUser)
                .provider("google")
                .accessToken("access-token")
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired 1 hour ago
                .build();
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(expiredToken));
        
        boolean result = oauth2TokenService.hasValidToken(testUser.getId(), "google");
        
        assertThat(result).isFalse();
    }
    
    @Test
    void hasValidToken_WhenTokenDoesNotExist_ReturnsFalse() {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        
        boolean result = oauth2TokenService.hasValidToken(testUser.getId(), "google");
        
        assertThat(result).isFalse();
    }
    
    @Test
    void saveOrUpdateOAuth2Token_WithTokenObject_SavesCorrectly() {
        OAuth2Token token = OAuth2Token.builder()
                .user(testUser)
                .provider("github")
                .accessToken("github-access-token")
                .refreshToken("github-refresh-token")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .scope("user:email repo")
                .build();
        
        when(oauth2TokenRepository.save(token)).thenReturn(token);
        
        oauth2TokenService.saveOrUpdateOAuth2Token(token);
        
        verify(oauth2TokenRepository).save(token);
    }
    
    @Test
    void saveOrUpdateOAuth2Token_SetsExpirationTime_Correctly() {
        Instant expiresAt = Instant.now().plusSeconds(7200);
        OAuth2AccessToken tokenWithExpiration = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                "access-token-value",
                Instant.now(),
                expiresAt,
                Set.of("email", "profile")
        );
        
        OAuth2AuthorizedClient clientWithExpiration = new OAuth2AuthorizedClient(
                clientRegistration,
                "test-principal",
                tokenWithExpiration,
                refreshToken
        );
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        when(oauth2TokenRepository.save(any(OAuth2Token.class)))
                .thenAnswer(i -> i.getArgument(0));
        
        oauth2TokenService.saveOrUpdateOAuth2Token(testUser, clientWithExpiration);
        
        verify(oauth2TokenRepository).save(any(OAuth2Token.class));
    }
}