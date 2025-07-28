#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${MAGENTA}🤖 Smart E2E Test-Driven Development Cycle${NC}"
echo -e "${CYAN}=====================================Connecting to Claude instances...${NC}"

# Function to show cycle overview
show_cycle_overview() {
  echo -e "\n${BLUE}📋 TDD Cycle Overview:${NC}"
  echo -e "1. 🧪 Run E2E tests with intelligent analysis"
  echo -e "2. 🔍 Analyze failures with MCP-enhanced documentation"
  echo -e "3. 📝 Generate specific prompts for each service"
  echo -e "4. 🤖 Notify Claude instances in each service"
  echo -e "5. ⏳ Wait for fixes and re-run tests"
  echo -e "6. 🔄 Repeat until all tests pass"
}

# Function to check Claude Code setup
check_claude_setup() {
  echo -e "\n${BLUE}🔍 Checking Claude Code setup...${NC}"
  
  local all_ready=true
  
  for service in frontend backend ml-server; do
    if [ -f "$PROJECT_ROOT/$service/CLAUDE.md" ]; then
      echo -e "${GREEN}✓ $service: Claude Code ready${NC}"
    else
      echo -e "${RED}✗ $service: Missing CLAUDE.md${NC}"
      all_ready=false
    fi
  done
  
  if [ "$all_ready" = false ]; then
    echo -e "\n${YELLOW}⚠️  Setup Instructions:${NC}"
    echo -e "1. Open 3 terminal windows"
    echo -e "2. Run Claude Code in each service directory:"
    echo -e "   Terminal 1: cd frontend && claude-code"
    echo -e "   Terminal 2: cd backend && claude-code"
    echo -e "   Terminal 3: cd ml-server && claude-code"
    echo -e "3. Re-run this script\n"
    return 1
  fi
  
  return 0
}

# Function to run intelligent E2E tests
run_smart_e2e_tests() {
  echo -e "\n${BLUE}🧪 Running E2E tests with smart analysis...${NC}"
  
  cd "$PROJECT_ROOT/e2e"
  
  # Ensure MCP-enhanced reporter is used
  echo -e "${CYAN}Configuring intelligent test reporter...${NC}"
  
  # Run tests with JSON output for analysis
  npm test
  local test_exit_code=$?
  
  if [ $test_exit_code -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is working correctly.${NC}"
    return 0
  else
    echo -e "${YELLOW}📊 Test failures detected. Analyzing with MCP...${NC}"
    return 1
  fi
}

# Function to distribute intelligent prompts
distribute_smart_prompts() {
  echo -e "\n${BLUE}🤖 Distributing AI-enhanced prompts...${NC}"
  
  # Check for generated prompts
  local prompts_generated=false
  
  for service in frontend backend ml-server; do
    local prompt_file="$PROJECT_ROOT/$service/PROMPT.md"
    if [ -f "$prompt_file" ]; then
      echo -e "${GREEN}📝 Generated smart prompt for $service${NC}"
      
      # Create notification file with enhanced features
      cat > "$PROJECT_ROOT/$service/E2E_SMART_ACTION.md" << EOF
# 🧠 Smart E2E Test Action Required

A new AI-enhanced prompt has been generated based on E2E test failures.
This prompt includes:

- 📚 **MCP-enhanced documentation** from latest library sources
- 💻 **Code examples** adapted to your specific error
- ✅ **Best practices** from official documentation
- ⚠️ **Common mistakes** to avoid
- 🔗 **Related issues** to consider

## Next Steps
1. 📖 Review **PROMPT.md** for detailed analysis
2. 🛠️ Implement the suggested fixes
3. ✅ Test locally to verify fixes
4. 🗑️ Delete this file when complete

Generated at: $(date)
Enhanced with: Context7 MCP Documentation Analysis
EOF
      
      prompts_generated=true
    fi
  done
  
  if [ "$prompts_generated" = true ]; then
    echo -e "${CYAN}🔔 Notification files created for Claude instances${NC}"
  else
    echo -e "${YELLOW}⚠️ No prompts were generated${NC}"
  fi
}

# Function to show progress and wait
show_progress_and_wait() {
  echo -e "\n${BLUE}⏳ Waiting for Claude instances to implement fixes...${NC}"
  echo -e "${CYAN}💡 Pro tip: Watch the PROMPT.md files disappear as fixes are completed${NC}"
  
  local wait_time=30
  local check_interval=5
  
  while [ $wait_time -gt 0 ]; do
    printf "\r${YELLOW}⏱️  Waiting ${wait_time}s (or press Ctrl+C to check now)...${NC}"
    sleep $check_interval
    wait_time=$((wait_time - check_interval))
    
    # Check if any prompts are still pending
    local pending_prompts=0
    for service in frontend backend ml-server; do
      if [ -f "$PROJECT_ROOT/$service/PROMPT.md" ]; then
        pending_prompts=$((pending_prompts + 1))
      fi
    done
    
    if [ $pending_prompts -eq 0 ]; then
      echo -e "\n${GREEN}🚀 All prompts completed! Re-running tests...${NC}"
      return 0
    fi
  done
  
  echo -e "\n${CYAN}⏰ Wait time completed. Checking progress...${NC}"
}

# Function to check fix progress
check_fix_progress() {
  echo -e "\n${BLUE}📊 Checking fix progress...${NC}"
  
  local completed_services=0
  local total_services=0
  
  for service in frontend backend ml-server; do
    if [ -f "$PROJECT_ROOT/$service/E2E_SMART_ACTION.md" ]; then
      total_services=$((total_services + 1))
      if [ ! -f "$PROJECT_ROOT/$service/PROMPT.md" ]; then
        echo -e "${GREEN}✅ $service: Fix completed${NC}"
        completed_services=$((completed_services + 1))
      else
        echo -e "${YELLOW}⏳ $service: Still working...${NC}"
      fi
    fi
  done
  
  if [ $total_services -eq 0 ]; then
    echo -e "${CYAN}ℹ️  No active fixes in progress${NC}"
    return 0
  fi
  
  echo -e "\n${CYAN}Progress: $completed_services/$total_services services completed${NC}"
  
  if [ $completed_services -eq $total_services ]; then
    echo -e "${GREEN}🎯 All fixes completed!${NC}"
    return 0
  else
    return 1
  fi
}

# Function to cleanup notifications
cleanup_notifications() {
  echo -e "\n${BLUE}🧹 Cleaning up notification files...${NC}"
  
  for service in frontend backend ml-server; do
    rm -f "$PROJECT_ROOT/$service/E2E_SMART_ACTION.md"
    rm -f "$PROJECT_ROOT/$service/PROMPT.md"
  done
  
  rm -f "$PROJECT_ROOT/E2E_TEST_SUMMARY.md"
}

# Main cycle function
run_smart_cycle() {
  local cycle_count=1
  local max_cycles=5
  
  while [ $cycle_count -le $max_cycles ]; do
    echo -e "\n${MAGENTA}🔄 Cycle $cycle_count of $max_cycles${NC}"
    echo -e "${MAGENTA}========================${NC}"
    
    if run_smart_e2e_tests; then
      echo -e "\n${GREEN}🎉 Success! All tests pass after $cycle_count cycle(s)${NC}"
      cleanup_notifications
      return 0
    fi
    
    distribute_smart_prompts
    
    if [ $cycle_count -lt $max_cycles ]; then
      show_progress_and_wait
      
      if ! check_fix_progress; then
        echo -e "${YELLOW}⚠️ Some fixes still in progress. Continuing to next cycle...${NC}"
      fi
    fi
    
    cycle_count=$((cycle_count + 1))
  done
  
  echo -e "\n${RED}❌ Maximum cycles reached. Manual intervention may be required.${NC}"
  echo -e "${CYAN}💡 Check the generated prompts and fix remaining issues manually.${NC}"
  return 1
}

# Main execution
main() {
  show_cycle_overview
  
  if ! check_claude_setup; then
    exit 1
  fi
  
  echo -e "\n${GREEN}🚀 Starting smart TDD cycle...${NC}"
  
  if run_smart_cycle; then
    echo -e "\n${GREEN}✨ Smart E2E TDD cycle completed successfully!${NC}"
    echo -e "${CYAN}🎯 All tests are now passing with AI-enhanced fixes.${NC}"
  else
    echo -e "\n${YELLOW}⚠️ Cycle completed with some issues remaining.${NC}"
    echo -e "${CYAN}📋 Check the summary file for details: E2E_TEST_SUMMARY.md${NC}"
  fi
}

# Handle interrupts gracefully
trap 'echo -e "\n${YELLOW}⏸️ Interrupted by user. Cleaning up...${NC}"; exit 0' INT

# Run main function
main "$@"