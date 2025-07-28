package com.geulpi.calendar.config;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.yml")
@Transactional
public abstract class BaseIntegrationTest {
    
    // Common test configuration and utilities can be added here
    
    protected static final String TEST_USER_EMAIL = "test@example.com";
    protected static final String TEST_USER_ID = "test-user-id";
    protected static final String TEST_USER_NAME = "Test User";
    
    // Helper methods for common test setup can be added here
}