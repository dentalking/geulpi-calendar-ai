package com.geulpi.calendar.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public SecurityHeadersFilter securityHeadersFilter() {
        return new SecurityHeadersFilter();
    }
    
    public static class SecurityHeadersFilter extends OncePerRequestFilter {
        
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                      FilterChain filterChain) throws ServletException, IOException {
            
            // Content Security Policy - Prevent XSS attacks
            response.setHeader("Content-Security-Policy", 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self'; " +
                "connect-src 'self' ws: wss:; " +
                "frame-ancestors 'none'");
            
            // X-Content-Type-Options - Prevent MIME type sniffing
            response.setHeader("X-Content-Type-Options", "nosniff");
            
            // X-Frame-Options - Prevent clickjacking
            response.setHeader("X-Frame-Options", "DENY");
            
            // X-XSS-Protection - Enable XSS filtering
            response.setHeader("X-XSS-Protection", "1; mode=block");
            
            // Strict-Transport-Security - Force HTTPS
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            
            // Referrer-Policy - Control referrer information
            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            
            // Permissions-Policy - Control browser features
            response.setHeader("Permissions-Policy", 
                "geolocation=(), microphone=(), camera=(), fullscreen=(self)");
            
            // Cache-Control for sensitive endpoints
            String requestURI = request.getRequestURI();
            if (requestURI.contains("/auth/") || requestURI.contains("/oauth2/") || 
                requestURI.contains("/graphql")) {
                response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                response.setHeader("Pragma", "no-cache");
                response.setHeader("Expires", "0");
            }
            
            filterChain.doFilter(request, response);
        }
        
        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
            String path = request.getRequestURI();
            // Skip for static resources
            return path.startsWith("/static/") || path.startsWith("/css/") || 
                   path.startsWith("/js/") || path.startsWith("/images/");
        }
    }
}