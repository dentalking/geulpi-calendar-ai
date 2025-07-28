package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Pattern;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.PatternRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatternService {
    
    private final PatternRepository patternRepository;
    private final UserService userService;
    
    public List<Pattern> getPatterns() {
        User user = userService.getCurrentUser();
        return patternRepository.findByUserIdOrderByFrequencyDesc(user.getId());
    }
}