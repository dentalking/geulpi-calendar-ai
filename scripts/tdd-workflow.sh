#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=== Geulpi TDD Workflow ===${NC}"

# Parse command line arguments
FEATURE_NAME=""
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --feature)
      FEATURE_NAME="$2"
      shift 2
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 --feature <feature-name> [--watch]"
      echo "Example: $0 --feature recurring-events --watch"
      exit 1
      ;;
  esac
done

if [ -z "$FEATURE_NAME" ]; then
  echo -e "${RED}Feature name is required${NC}"
  echo "Usage: $0 --feature <feature-name> [--watch]"
  exit 1
fi

# Create test file name
TEST_FILE="e2e/tests/${FEATURE_NAME}.spec.ts"
FULL_PATH="$PROJECT_ROOT/$TEST_FILE"

# Function to create a new test file
create_test_file() {
  if [ -f "$FULL_PATH" ]; then
    echo -e "${YELLOW}Test file already exists: $TEST_FILE${NC}"
    return
  fi

  echo -e "${GREEN}Creating new test file: $TEST_FILE${NC}"
  
  # Create test template
  cat > "$FULL_PATH" << EOF
import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

test.describe('${FEATURE_NAME} Feature', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.skip('should implement ${FEATURE_NAME}', async ({ page }) => {
    // TODO: Write your test here
    // Remove .skip when you're ready to implement
    
    await page.goto('/dashboard');
    
    // Example assertions:
    // await expect(page.locator('[data-testid="something"]')).toBeVisible();
    // await page.locator('[data-testid="button"]').click();
    // await expect(page).toHaveURL('/expected-url');
  });
});
EOF

  echo -e "${GREEN}✓ Test file created!${NC}"
  echo -e "${YELLOW}Next steps:${NC}"
  echo "1. Edit the test file: $TEST_FILE"
  echo "2. Write your failing test (remove .skip)"
  echo "3. Run the test to see it fail"
  echo "4. Implement the feature until the test passes"
}

# Function to run tests in watch mode
run_watch_mode() {
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Starting E2E tests in watch mode...${NC}"
  echo -e "${BLUE}Tests will re-run automatically when you save changes${NC}"
  
  # Start Docker services if not running
  if ! docker-compose -f docker-compose.test.yml ps | grep -q "nginx-test.*Up"; then
    echo -e "${YELLOW}Starting test environment...${NC}"
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services
    sleep 30
  fi
  
  cd e2e
  
  # Create a custom watch script
  cat > watch-test.js << 'EOF'
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const testFile = process.argv[2];
let testProcess = null;

function runTest() {
  if (testProcess) {
    testProcess.kill();
  }
  
  console.log('\033[2J\033[0f'); // Clear screen
  console.log('\033[1;33m🔄 Running tests...\033[0m');
  
  testProcess = spawn('npx', ['playwright', 'test', testFile], {
    stdio: 'inherit',
    shell: true
  });
  
  testProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('\033[0;32m✓ Tests passed!\033[0m');
    } else {
      console.log('\033[0;31m✗ Tests failed!\033[0m');
    }
    console.log('\033[1;34mWatching for changes...\033[0m');
  });
}

// Initial run
runTest();

// Watch for changes
fs.watch(path.dirname(testFile), { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
    console.log(`\033[1;33mFile changed: ${filename}\033[0m`);
    setTimeout(runTest, 100);
  }
});

console.log('\033[1;34mPress Ctrl+C to stop\033[0m');
EOF

  # Run the watch script
  node watch-test.js "tests/${FEATURE_NAME}.spec.ts"
}

# Function to run tests once
run_single_test() {
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Running test for ${FEATURE_NAME}...${NC}"
  
  ./scripts/test-e2e.sh --test "tests/${FEATURE_NAME}.spec.ts"
}

# Main workflow
create_test_file

if [ "$WATCH_MODE" = true ]; then
  echo -e "${BLUE}Starting TDD watch mode...${NC}"
  echo -e "${YELLOW}Tip: Edit your test file and save to see it run automatically${NC}"
  run_watch_mode
else
  echo -e "${BLUE}Running test once...${NC}"
  run_single_test
fi