package com.geulpi.calendar.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
public class CustomLogoutSuccessHandler implements LogoutSuccessHandler {
    
    @Value("${app.oauth2.redirectUri:http://localhost:3000}")
    private String frontendUrl;
    
    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, 
                              Authentication authentication) throws IOException, ServletException {
        // Clear any remaining session data
        request.getSession().invalidate();
        
        // Build the redirect URL without any error parameters
        String redirectUrl = frontendUrl + "/login";
        
        log.info("Logout successful, redirecting to: {}", redirectUrl);
        
        // Set response headers to prevent caching
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        
        // Redirect to frontend login page
        response.sendRedirect(redirectUrl);
    }
}