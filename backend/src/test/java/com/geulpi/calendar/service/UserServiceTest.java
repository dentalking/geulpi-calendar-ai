package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.dto.UpdateProfileInput;
import com.geulpi.calendar.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    private User testUser;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("test-user-id")
                .email("test@example.com")
                .name("Test User")
                .onboardingCompleted(true)
                .build();
        
        SecurityContextHolder.clearContext();
    }
    
    @Test
    void getCurrentUser_WhenAuthenticated_ReturnsUser() {
        setupAuthenticatedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        
        User result = userService.getCurrentUser();
        
        assertThat(result).isEqualTo(testUser);
        verify(userRepository).findByEmail("test@example.com");
    }
    
    @Test
    void getCurrentUser_WhenUserNotFound_ThrowsException() {
        setupAuthenticatedUser("nonexistent@example.com");
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());
        
        assertThatThrownBy(() -> userService.getCurrentUser())
                .isInstanceOf(RuntimeException.class)
                .hasMessage("User not found");
    }
    
    @Test
    void getUserById_WhenUserExists_ReturnsUser() {
        when(userRepository.findByIdWithDetails("test-user-id")).thenReturn(Optional.of(testUser));
        
        User result = userService.getUserById("test-user-id");
        
        assertThat(result).isEqualTo(testUser);
        verify(userRepository).findByIdWithDetails("test-user-id");
    }
    
    @Test
    void getUserById_WhenUserDoesNotExist_ReturnsNull() {
        when(userRepository.findByIdWithDetails("nonexistent-id")).thenReturn(Optional.empty());
        
        User result = userService.getUserById("nonexistent-id");
        
        assertThat(result).isNull();
    }
    
    @Test
    void findByIds_ReturnsBatchUsers() {
        List<String> userIds = Arrays.asList("user1", "user2", "user3");
        List<User> expectedUsers = Arrays.asList(
                User.builder().id("user1").email("user1@example.com").build(),
                User.builder().id("user2").email("user2@example.com").build(),
                User.builder().id("user3").email("user3@example.com").build()
        );
        
        when(userRepository.findAllById(userIds)).thenReturn(expectedUsers);
        
        List<User> result = userService.findByIds(userIds);
        
        assertThat(result).hasSize(3);
        assertThat(result).isEqualTo(expectedUsers);
        verify(userRepository).findAllById(userIds);
    }
    
    @Test
    void updateProfile_WithValidInput_UpdatesUser() {
        setupAuthenticatedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        
        UpdateProfileInput input = new UpdateProfileInput();
        input.setName("Updated Name");
        
        User result = userService.updateProfile(input);
        
        assertThat(result.getName()).isEqualTo("Updated Name");
        verify(userRepository).save(testUser);
    }
    
    @Test
    void updateProfile_WithNullName_DoesNotUpdateName() {
        setupAuthenticatedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        
        String originalName = testUser.getName();
        UpdateProfileInput input = new UpdateProfileInput();
        input.setName(null);
        
        User result = userService.updateProfile(input);
        
        assertThat(result.getName()).isEqualTo(originalName);
        verify(userRepository).save(testUser);
    }
    
    @Test
    void isAuthenticationValid_WhenAuthenticated_ReturnsTrue() {
        setupAuthenticatedUser("test@example.com");
        
        boolean result = userService.isAuthenticationValid();
        
        assertThat(result).isTrue();
    }
    
    @Test
    void isAuthenticationValid_WhenNotAuthenticated_ReturnsFalse() {
        SecurityContextHolder.clearContext();
        
        boolean result = userService.isAuthenticationValid();
        
        assertThat(result).isFalse();
    }
    
    @Test
    void processOAuth2User_WhenUserExists_UpdatesExistingUser() {
        User existingUser = User.builder()
                .id("existing-id")
                .email("test@example.com")
                .name("Old Name")
                .onboardingCompleted(true)
                .build();
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        
        User result = userService.processOAuth2User("test@example.com", "New Name", "google-123");
        
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getId()).isEqualTo("existing-id");
        verify(userRepository).save(existingUser);
    }
    
    @Test
    void processOAuth2User_WhenUserDoesNotExist_CreatesNewUser() {
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User user = i.getArgument(0);
            user.setId("new-user-id");
            return user;
        });
        
        User result = userService.processOAuth2User("new@example.com", "New User", "google-456");
        
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getName()).isEqualTo("New User");
        assertThat(result.getOnboardingCompleted()).isFalse();
        assertThat(result.getId()).isEqualTo("new-user-id");
        
        verify(userRepository).save(any(User.class));
    }
    
    private void setupAuthenticatedUser(String email) {
        UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(
                    email, 
                    null, 
                    Arrays.asList(new SimpleGrantedAuthority("ROLE_USER"))
                );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}