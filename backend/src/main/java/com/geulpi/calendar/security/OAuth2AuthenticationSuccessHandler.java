package com.geulpi.calendar.security;

import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    
    @Value("${app.oauth2.redirectUri}")
    private String redirectUri;
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, 
                                      Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = authToken.getPrincipal();
        
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub");
        
        // User 생성 또는 업데이트
        User user = userService.processOAuth2User(email, name, googleId);
        
        // JWT 토큰 생성
        String token = tokenProvider.generateTokenFromOAuth2User(oAuth2User, user.getId());
        
        // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("token", token)
                .build().toUriString();
        
        log.info("OAuth2 authentication successful for user: {}, redirecting to: {}", email, targetUrl);
        
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}