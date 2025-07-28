# Geulpi E2E Tests

End-to-end tests for the Geulpi Calendar Service using Playwright.

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- 8GB+ RAM recommended for running all services

## 🚀 Quick Start

### Running Tests with Docker (Recommended)

```bash
# Run all E2E tests in Docker
../scripts/test-e2e.sh

# Run tests in headed mode (see browser)
../scripts/test-e2e.sh --headed

# Run specific test file
../scripts/test-e2e.sh --test tests/auth.spec.ts

# Debug mode
../scripts/test-e2e.sh --debug
```

### Running Tests Locally

```bash
# Ensure all services are running locally first
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# ML Server: http://localhost:8000

# Run tests against local services
../scripts/test-e2e.sh --local

# Run with UI mode
npm run test:ui
```

## 🧪 Test Structure

```
e2e/
├── tests/
│   ├── auth.spec.ts         # Authentication flow tests
│   ├── calendar.spec.ts     # Calendar functionality tests
│   ├── notifications.spec.ts # Notification system tests
│   └── helpers/
│       └── auth.ts          # Authentication helper functions
├── playwright.config.ts      # Playwright configuration
├── .env.test                # Test environment variables
└── package.json
```

## 💻 Test-Driven Development (TDD)

Use our TDD workflow script to create and develop new features:

```bash
# Create a new test for a feature
../scripts/tdd-workflow.sh --feature recurring-events

# Run in watch mode (auto-runs on file changes)
../scripts/tdd-workflow.sh --feature recurring-events --watch
```

This will:
1. Create a new test file with a template
2. Run the test (it will fail initially)
3. Watch for changes and re-run automatically

## 🎯 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Your test code here
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes**: Add `data-testid` to elements for reliable selection
2. **Mock external services**: Use route handlers to mock API responses
3. **Test user flows**: Focus on complete user journeys, not implementation details
4. **Keep tests independent**: Each test should run in isolation
5. **Use helpers**: Reuse common setup code in helper functions

## 🔧 Environment Configuration

### Test Environment Variables (.env.test)

```env
BASE_URL=https://localhost
TEST_USER_EMAIL=test@geulpi.com
TEST_USER_PASSWORD=test123!
HEADLESS=true

# Test Database
POSTGRES_DB=geulpi_test_db
POSTGRES_USER=geulpi_test_user
POSTGRES_PASSWORD=test_password

# Mock Services
USE_MOCK_GOOGLE_API=true
USE_MOCK_OPENAI_API=true
```

## 🐛 Debugging

### View Test Report
```bash
npm run test:report
```

### Debug Specific Test
```bash
npx playwright test tests/auth.spec.ts --debug
```

### Inspect Test Failures
- Screenshots: `test-results/[test-name]/screenshot.png`
- Videos: `test-results/[test-name]/video.webm`
- Traces: `test-results/[test-name]/trace.zip`

## 📊 CI/CD Integration

E2E tests run automatically in GitHub Actions:
- On every push to main/develop branches
- On all pull requests
- Test artifacts are uploaded on failure

### Running Locally with CI Configuration
```bash
CI=true npm test
```

## 🚀 Advanced Usage

### Custom Test Configuration
```typescript
// Run test with specific viewport
test.use({ viewport: { width: 1280, height: 720 } });

// Run test in specific browser
test.skip(({ browserName }) => browserName !== 'chromium');

// Retry flaky tests
test.describe.configure({ retries: 2 });
```

### Parallel Execution
```bash
# Run tests in parallel (default)
npm test

# Run tests serially
npm test -- --workers=1
```

## 🤝 Contributing

1. Follow TDD approach: Write tests first
2. Ensure all tests pass before committing
3. Add data-testid attributes when modifying components
4. Update test documentation when adding new test patterns

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)