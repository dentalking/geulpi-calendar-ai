package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.OAuth2TokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2TokenService {
    
    private final OAuth2TokenRepository oauth2TokenRepository;
    
    @Transactional
    public void saveOrUpdateOAuth2Token(User user, OAuth2AuthorizedClient authorizedClient) {
        String provider = authorizedClient.getClientRegistration().getRegistrationId();
        OAuth2AccessToken accessToken = authorizedClient.getAccessToken();
        OAuth2RefreshToken refreshToken = authorizedClient.getRefreshToken();
        
        Optional<OAuth2Token> existingToken = oauth2TokenRepository.findByUserIdAndProvider(user.getId(), provider);
        
        OAuth2Token token;
        if (existingToken.isPresent()) {
            token = existingToken.get();
            log.info("Updating existing OAuth2 token for user {} and provider {}", user.getId(), provider);
        } else {
            token = OAuth2Token.builder()
                    .user(user)
                    .provider(provider)
                    .build();
            log.info("Creating new OAuth2 token for user {} and provider {}", user.getId(), provider);
        }
        
        // Update token information
        token.setAccessToken(accessToken.getTokenValue());
        token.setTokenType(accessToken.getTokenType().getValue());
        
        if (accessToken.getExpiresAt() != null) {
            token.setExpiresAt(LocalDateTime.ofInstant(
                    accessToken.getExpiresAt(), 
                    ZoneId.systemDefault()
            ));
        }
        
        if (refreshToken != null) {
            token.setRefreshToken(refreshToken.getTokenValue());
        }
        
        if (accessToken.getScopes() != null && !accessToken.getScopes().isEmpty()) {
            token.setScope(String.join(" ", accessToken.getScopes()));
        }
        
        oauth2TokenRepository.save(token);
        log.info("Successfully saved OAuth2 token for user {} and provider {}", user.getId(), provider);
    }
    
    @Transactional(readOnly = true)
    public Optional<OAuth2Token> getTokenByUserAndProvider(String userId, String provider) {
        return oauth2TokenRepository.findByUserIdAndProvider(userId, provider);
    }
    
    @Transactional
    public void deleteTokenByUserAndProvider(String userId, String provider) {
        oauth2TokenRepository.deleteByUserIdAndProvider(userId, provider);
        log.info("Deleted OAuth2 token for user {} and provider {}", userId, provider);
    }
    
    @Transactional(readOnly = true)
    public boolean hasValidToken(String userId, String provider) {
        Optional<OAuth2Token> token = getTokenByUserAndProvider(userId, provider);
        return token.isPresent() && !token.get().isExpired();
    }
    
    @Transactional(readOnly = true)
    public Optional<OAuth2Token> getTokenByUserId(String userId) {
        return oauth2TokenRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
    }
    
    @Transactional
    public void saveOrUpdateOAuth2Token(OAuth2Token token) {
        oauth2TokenRepository.save(token);
        log.info("Successfully saved/updated OAuth2 token for user {} and provider {}", 
                token.getUser().getId(), token.getProvider());
    }
}