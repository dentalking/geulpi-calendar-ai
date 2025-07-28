package com.geulpi.calendar.config;

import com.geulpi.calendar.config.SecurityHeadersConfig.SecurityHeadersFilter;
import com.geulpi.calendar.filter.RateLimitingFilter;
import com.geulpi.calendar.security.CustomLogoutSuccessHandler;
import com.geulpi.calendar.security.CustomOAuth2UserService;
import com.geulpi.calendar.security.JwtAuthenticationFilter;
import com.geulpi.calendar.security.OAuth2AuthenticationFailureHandler;
import com.geulpi.calendar.security.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomLogoutSuccessHandler customLogoutSuccessHandler;
    private final CorsConfigurationSource corsConfigurationSource;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/google", "/auth/validate", "/auth/logout", "/auth/status").permitAll()
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/graphql", "/graphiql").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/auth/me", "/auth/refresh").authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    // For logout requests, don't redirect to OAuth
                    if (request.getRequestURI().startsWith("/auth/logout")) {
                        response.sendRedirect("http://localhost:3000/login");
                    } else {
                        response.sendRedirect("/oauth2/authorization/google");
                    }
                })
            )
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(endpoint -> endpoint
                    .baseUri("/oauth2/authorize")
                )
                .redirectionEndpoint(endpoint -> endpoint
                    .baseUri("/oauth2/callback/*")
                )
                .userInfoEndpoint(endpoint -> endpoint.userService(customOAuth2UserService))
                .successHandler(oAuth2AuthenticationSuccessHandler)
                .failureHandler(oAuth2AuthenticationFailureHandler)
            )
            .logout(logout -> logout
                .logoutUrl("/auth/logout")
                .logoutSuccessHandler(customLogoutSuccessHandler)
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID", "token", "auth-token")
                .permitAll()
            );
        
        // Add security filters in order
        http.addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}