#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${MAGENTA}=== E2E Test Feedback Loop ===${NC}"

# Function to check if Claude Code is running in a service directory
check_claude_running() {
  local service=$1
  local service_dir="$PROJECT_ROOT/$service"
  
  # Check if CLAUDE.md exists (indicates Claude Code should be running)
  if [ -f "$service_dir/CLAUDE.md" ]; then
    echo -e "${GREEN}✓ $service has CLAUDE.md${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠ $service missing CLAUDE.md${NC}"
    return 1
  fi
}

# Function to notify service about test results
notify_service() {
  local service=$1
  local prompt_file="$PROJECT_ROOT/$service/PROMPT.md"
  
  if [ -f "$prompt_file" ]; then
    echo -e "${BLUE}📨 Prompt delivered to $service${NC}"
    
    # Create a notification file that Claude can detect
    cat > "$PROJECT_ROOT/$service/E2E_ACTION_REQUIRED.md" << EOF
# ⚠️ E2E Test Action Required

A new prompt has been generated based on E2E test failures.
Please review PROMPT.md for specific fixes needed.

Generated at: $(date)

## Quick Actions
1. Read PROMPT.md for detailed failure analysis
2. Implement the suggested fixes
3. Run tests locally to verify
4. Delete this file when fixes are complete
EOF
  fi
}

# Main feedback loop
main() {
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Starting E2E test feedback loop...${NC}"
  
  # Step 1: Check if all services have Claude Code setup
  echo -e "\n${BLUE}Step 1: Checking Claude Code setup${NC}"
  for service in frontend backend ml-server; do
    check_claude_running $service
  done
  
  # Step 2: Run E2E tests
  echo -e "\n${BLUE}Step 2: Running E2E tests${NC}"
  cd e2e
  npm test
  TEST_EXIT_CODE=$?
  
  # Step 3: Analyze results
  echo -e "\n${BLUE}Step 3: Analyzing test results${NC}"
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
    # Clean up any existing prompts
    rm -f "$PROJECT_ROOT"/*/PROMPT.md
    rm -f "$PROJECT_ROOT"/*/E2E_ACTION_REQUIRED.md
    rm -f "$PROJECT_ROOT/E2E_TEST_SUMMARY.md"
    
    echo -e "${GREEN}🎉 System is working correctly!${NC}"
    exit 0
  fi
  
  # Step 4: Generate and distribute prompts
  echo -e "\n${BLUE}Step 4: Distributing prompts to services${NC}"
  
  # Wait for prompt generation (reporter runs after tests)
  sleep 2
  
  # Notify each service
  for service in frontend backend ml-server; do
    notify_service $service
  done
  
  # Step 5: Display summary
  echo -e "\n${BLUE}Step 5: Test Summary${NC}"
  if [ -f "$PROJECT_ROOT/E2E_TEST_SUMMARY.md" ]; then
    echo -e "${YELLOW}Summary generated at: $PROJECT_ROOT/E2E_TEST_SUMMARY.md${NC}"
    echo ""
    head -20 "$PROJECT_ROOT/E2E_TEST_SUMMARY.md"
  fi
  
  # Step 6: Provide instructions
  echo -e "\n${MAGENTA}=== Next Steps ===${NC}"
  echo -e "1. Each service with failures has received a ${YELLOW}PROMPT.md${NC} file"
  echo -e "2. Claude Code instances in each service should implement the fixes"
  echo -e "3. Run this script again to verify fixes:"
  echo -e "   ${BLUE}$0${NC}"
  echo -e "4. Or run continuous mode to auto-retry:"
  echo -e "   ${BLUE}$0 --watch${NC}"
}

# Watch mode
watch_mode() {
  while true; do
    clear
    main
    
    echo -e "\n${YELLOW}Waiting 60 seconds before next run...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    sleep 60
  done
}

# Parse arguments
if [ "$1" == "--watch" ]; then
  watch_mode
else
  main
fi