# E2E Testing Guide for Geulpi Calendar Service

## Overview

We've successfully implemented a comprehensive Docker-based E2E test-driven development framework for the Geulpi Calendar Service. This guide explains how to use the new testing infrastructure.

## What Was Implemented

### 1. E2E Test Framework (Playwright)
- **Location**: `/e2e` directory
- **Framework**: Playwright for cross-browser testing
- **Configuration**: Multi-browser support (Chrome, Firefox, Safari, Mobile)

### 2. Test Environment
- **docker-compose.test.yml**: Isolated test environment with all services
- **Test Database**: Separate PostgreSQL instance for tests
- **Mock Services**: Support for mocking external APIs (Google, OpenAI)

### 3. Test Scenarios
- **Authentication Flow** (`auth.spec.ts`)
  - OAuth2 login/logout
  - Session persistence
  - Error handling
  
- **Calendar Functionality** (`calendar.spec.ts`)
  - Event creation/editing/deletion
  - Voice input for events
  - Calendar navigation
  - View switching
  
- **Notification System** (`notifications.spec.ts`)
  - Notification settings
  - Real-time notifications
  - Notification history

### 4. Test Execution Scripts

#### Basic Test Execution
```bash
# Run all tests in Docker
npm run test:e2e

# Run tests against local services
npm run test:e2e:local

# Run tests with browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

#### TDD Workflow
```bash
# Create new test for a feature
npm run tdd -- --feature payment-integration

# Run in watch mode
npm run tdd -- --feature payment-integration --watch
```

### 5. CI/CD Integration
- Added E2E test job to GitHub Actions workflow
- Automatic test execution on push/PR
- Test artifacts (screenshots, videos) uploaded on failure

## TDD Development Process

### Step 1: Create a Test
```bash
./scripts/tdd-workflow.sh --feature new-feature-name
```

### Step 2: Write Failing Test
Edit the generated test file:
```typescript
test('should implement new feature', async ({ page }) => {
  // Write your test expectations
  await page.goto('/dashboard');
  await page.click('[data-testid="new-feature-button"]');
  await expect(page.locator('[data-testid="feature-result"]')).toBeVisible();
});
```

### Step 3: Run Test (See it Fail)
```bash
./scripts/test-e2e.sh --test tests/new-feature-name.spec.ts
```

### Step 4: Implement Feature
Add the feature implementation in the appropriate service (frontend/backend/ml-server).

### Step 5: Run Test (See it Pass)
```bash
./scripts/test-e2e.sh --test tests/new-feature-name.spec.ts
```

### Step 6: Refactor
Clean up the code while keeping tests green.

## Best Practices

### 1. Test Structure
- Keep tests independent and isolated
- Use descriptive test names
- Group related tests with `test.describe`
- Use `beforeEach` for common setup

### 2. Element Selection
Always use `data-testid` attributes:
```html
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.locator('[data-testid="submit-button"]').click();
```

### 3. API Mocking
Mock external services for predictable tests:
```typescript
await context.route('**/api/external', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'mocked' })
  });
});
```

### 4. Assertions
Use explicit waits and assertions:
```typescript
// Good
await expect(page.locator('[data-testid="loading"]')).toBeVisible();
await expect(page.locator('[data-testid="loading"]')).not.toBeVisible();

// Bad
await page.waitForTimeout(1000); // Avoid fixed timeouts
```

## Debugging Failed Tests

### View Test Report
```bash
cd e2e
npm run test:report
```

### Check Artifacts
- Screenshots: `e2e/test-results/*/screenshot.png`
- Videos: `e2e/test-results/*/video.webm`
- Traces: `e2e/test-results/*/trace.zip`

### Debug Interactively
```bash
./scripts/test-e2e.sh --debug --test tests/failing-test.spec.ts
```

## Adding New Tests

### 1. Create Test File
```bash
touch e2e/tests/my-feature.spec.ts
```

### 2. Import Helpers
```typescript
import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';
```

### 3. Write Test Cases
```typescript
test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    // Test implementation
  });
});
```

## Environment Variables

Test-specific environment variables are in `e2e/.env.test`:
- `BASE_URL`: Base URL for the application
- `TEST_USER_EMAIL`: Test user credentials
- `USE_MOCK_*`: Enable/disable service mocking

## Troubleshooting

### Services Not Starting
```bash
# Check service logs
docker-compose -f docker-compose.test.yml logs [service-name]

# Restart services
docker-compose -f docker-compose.test.yml restart
```

### Tests Timing Out
- Increase timeout in playwright.config.ts
- Check if services are healthy
- Verify network connectivity

### Flaky Tests
- Add explicit waits for elements
- Use `test.describe.configure({ retries: 2 })`
- Check for race conditions

## Next Steps

1. **Add More Test Coverage**
   - Integration with Google Calendar
   - ML-powered features
   - Performance testing

2. **Implement Visual Regression Testing**
   - Add screenshot comparison
   - Track UI changes

3. **Load Testing**
   - Add k6 or similar for load testing
   - Test concurrent users

4. **Accessibility Testing**
   - Add axe-playwright for a11y checks
   - Ensure WCAG compliance