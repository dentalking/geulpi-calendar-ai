package com.geulpi.calendar.controller;

import com.geulpi.calendar.dto.AuthResponse;
import com.geulpi.calendar.dto.TokenValidationResponse;
import com.geulpi.calendar.security.JwtTokenProvider;
import com.geulpi.calendar.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final JwtTokenProvider tokenProvider;
    
    @GetMapping("/google")
    public void googleLogin(HttpServletResponse response) throws IOException {
        // Spring Security OAuth2가 자동으로 처리
        response.sendRedirect("/oauth2/authorization/google");
    }
    
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        AuthResponse response = AuthResponse.builder()
                .id(userPrincipal.getId())
                .email(userPrincipal.getEmail())
                .name(userPrincipal.getName())
                .build();
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/validate")
    public ResponseEntity<TokenValidationResponse> validateToken(@RequestParam(required = false) String token, 
                                                               @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Get token from parameter or Authorization header
        String jwtToken = token;
        if (jwtToken == null && authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtToken = authHeader.substring(7);
        }
        
        if (jwtToken == null) {
            return ResponseEntity.ok(TokenValidationResponse.builder().valid(false).build());
        }
        
        boolean isValid = tokenProvider.validateToken(jwtToken);
        
        TokenValidationResponse response = TokenValidationResponse.builder()
                .valid(isValid)
                .build();
        
        if (isValid) {
            response.setUserId(tokenProvider.getUserIdFromToken(jwtToken));
            response.setEmail(tokenProvider.getEmailFromToken(jwtToken));
        }
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/validate")
    public ResponseEntity<TokenValidationResponse> validateTokenGet(@RequestParam(required = false) String token, 
                                                                  @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return validateToken(token, authHeader);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestHeader("Authorization") String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            
            if (tokenProvider.validateToken(token)) {
                String userId = tokenProvider.getUserIdFromToken(token);
                String email = tokenProvider.getEmailFromToken(token);
                String name = tokenProvider.getClaimsFromToken(token).get("name", String.class);
                
                String newToken = tokenProvider.generateToken(userId, email, name);
                
                return ResponseEntity.ok(AuthResponse.builder()
                        .id(userId)
                        .email(email)
                        .name(name)
                        .token(newToken)
                        .build());
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    
    @PostMapping("/logout")
    public void logout(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Clear the security context
        SecurityContextHolder.clearContext();
        
        // Use Spring Security's logout handler to properly clean up
        new SecurityContextLogoutHandler().logout(request, response, null);
        
        log.info("User logged out successfully");
        
        // Redirect to frontend login page without error parameters
        response.sendRedirect("http://localhost:3000/login");
    }
    
    @GetMapping("/logout")
    public void logoutGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Support GET requests for logout as well (for easier testing)
        logout(request, response);
    }
    
    @GetMapping("/status")
    public ResponseEntity<String> getAuthStatus() {
        return ResponseEntity.ok("Authentication service is running");
    }
}