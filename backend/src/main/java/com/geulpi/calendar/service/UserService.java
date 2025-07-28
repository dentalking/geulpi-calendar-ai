package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.dto.LifePhilosophyInput;
import com.geulpi.calendar.dto.UpdateProfileInput;
import com.geulpi.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    
    @Cacheable(value = "users", key = "#root.methodName + ':' + authentication.name", 
               condition = "#root.target.isAuthenticationValid()")
    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    @Cacheable(value = "users", key = "'user:' + #id", unless = "#result == null")
    public User getUserById(String id) {
        return userRepository.findByIdWithDetails(id)
                .orElse(null);
    }
    
    /**
     * Batch loading method for DataLoader to prevent N+1 queries
     */
    @Cacheable(value = "usersBatch", key = "#userIds.hashCode()")
    public List<User> findByIds(List<String> userIds) {
        return userRepository.findAllById(userIds);
    }
    
    @Transactional
    @CacheEvict(value = {"users", "timeBalance", "analytics"}, 
                key = "'user:' + #root.target.getCurrentUser().id")
    public User updateProfile(UpdateProfileInput input) {
        User user = getCurrentUser();
        
        if (input.getName() != null) {
            user.setName(input.getName());
        }
        
        // TODO: Update preferences if provided
        
        return userRepository.save(user);
    }
    
    @Transactional
    @CacheEvict(value = {"users", "timeBalance", "analytics", "lifeAreas"}, 
                key = "'user:' + #root.target.getCurrentUser().id")
    public User updateLifePhilosophy(LifePhilosophyInput input) {
        User user = getCurrentUser();
        
        // TODO: Implement life philosophy update logic
        
        return userRepository.save(user);
    }
    
    public boolean isAuthenticationValid() {
        try {
            return SecurityContextHolder.getContext().getAuthentication() != null &&
                   SecurityContextHolder.getContext().getAuthentication().isAuthenticated();
        } catch (Exception e) {
            return false;
        }
    }
    
    @Transactional
    public User processOAuth2User(String email, String name, String googleId) {
        return userRepository.findByEmail(email)
                .map(existingUser -> {
                    // 기존 사용자 업데이트
                    existingUser.setName(name);
                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    // 새 사용자 생성
                    User newUser = User.builder()
                            .email(email)
                            .name(name)
                            .onboardingCompleted(false)
                            .build();
                    return userRepository.save(newUser);
                });
    }
}