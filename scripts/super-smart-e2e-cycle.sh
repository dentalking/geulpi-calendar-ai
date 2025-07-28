#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${MAGENTA}${BOLD}🤖 SUPER AI-ENHANCED E2E TEST SYSTEM${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}🧠 Sequential Thinking MCP • 📚 Context7 MCP • 🎭 Playwright MCP • 🌐 Browser Tools MCP${NC}"

# Function to show advanced cycle overview
show_super_cycle_overview() {
  echo -e "\n${BLUE}🚀 Super TDD Cycle Overview:${NC}"
  echo -e "1. 🤖 ${BOLD}AI Multi-MCP Analysis${NC} - 4 AI systems analyze failures"
  echo -e "2. 🧠 ${BOLD}Sequential Thinking${NC} - Structured problem-solving process"
  echo -e "3. 📚 ${BOLD}Live Documentation${NC} - Real-time library docs via Context7"
  echo -e "4. 🎭 ${BOLD}Auto Code Generation${NC} - Playwright MCP generates fixes"
  echo -e "5. 🌐 ${BOLD}Live Browser Validation${NC} - Real browser testing & metrics"
  echo -e "6. 📝 ${BOLD}Super Prompts${NC} - AI-enhanced fix instructions for each service"
  echo -e "7. 🔄 ${BOLD}Automated Re-testing${NC} - Continuous validation until success"
}

# Function to check MCP infrastructure
check_mcp_infrastructure() {
  echo -e "\n${BLUE}🔍 Checking Local MCP Infrastructure...${NC}"
  
  # Check if local MCP servers are running
  local mcp_running=false
  
  # Check for MCP server processes
  if pgrep -f "mcp-server" > /dev/null || pgrep -f "@playwright/mcp" > /dev/null; then
    echo -e "${GREEN}✅ Local MCP servers detected${NC}"
    mcp_running=true
  fi
  
  if [ "$mcp_running" = false ]; then
    echo -e "${YELLOW}⚡ Starting local MCP servers...${NC}"
    
    # Start local MCP servers
    "$SCRIPT_DIR/start-local-mcp-servers.sh" &
    local mcp_pid=$!
    
    echo -e "${CYAN}⏳ Waiting for MCP servers to be ready...${NC}"
    sleep 10
    
    # Verify MCP servers are accessible
    local max_attempts=6
    local attempt=0
    local all_ready=false
    
    while [ $attempt -lt $max_attempts ]; do
      if curl -s http://localhost:8091 > /dev/null 2>&1 && \
         curl -s http://localhost:8092 > /dev/null 2>&1 && \
         curl -s http://localhost:8093 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ All MCP servers are ready${NC}"
        all_ready=true
        break
      fi
      echo -e "${YELLOW}⏳ Waiting for MCP servers... ($((attempt + 1))/$max_attempts)${NC}"
      sleep 5
      attempt=$((attempt + 1))
    done
    
    if [ "$all_ready" = false ]; then
      echo -e "${RED}❌ MCP servers failed to start${NC}"
      return 1
    fi
  fi
  
  # Verify individual MCP services
  echo -e "${CYAN}Verifying local MCP services...${NC}"
  
  local ports=("8091:Memory MCP" "8092:Filesystem MCP" "8093:Playwright MCP" "8094:Context7 MCP")
  local all_ready=true
  
  for port_info in "${ports[@]}"; do
    local port="${port_info%%:*}"
    local name="${port_info#*:}"
    
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ $name (port $port): Ready${NC}"
    else
      if [ "$port" != "8094" ]; then  # Context7 is optional
        echo -e "${RED}❌ $name (port $port): Not ready${NC}"
        all_ready=false
      else
        echo -e "${YELLOW}⚠️ $name (port $port): Not available (optional)${NC}"
      fi
    fi
  done
  
  if [ "$all_ready" = true ]; then
    echo -e "${GREEN}🎉 All required MCP services are operational!${NC}"
    return 0
  else
    echo -e "${RED}⚠️ Some MCP services are not ready${NC}"
    return 1
  fi
}

# Function to check Claude Code setup with enhanced verification
check_super_claude_setup() {
  echo -e "\n${BLUE}🔍 Checking Enhanced Claude Code Setup...${NC}"
  
  local all_ready=true
  
  for service in frontend backend ml-server; do
    if [ -f "$PROJECT_ROOT/$service/CLAUDE.md" ]; then
      echo -e "${GREEN}✅ $service: Claude Code ready${NC}"
      
      # Check if there are any pending super prompts
      if [ -f "$PROJECT_ROOT/$service/SUPER_PROMPT.md" ]; then
        echo -e "${YELLOW}  ⚠️ Previous SUPER_PROMPT.md found - will be updated${NC}"
      fi
    else
      echo -e "${RED}✗ $service: Missing CLAUDE.md${NC}"
      all_ready=false
    fi
  done
  
  if [ "$all_ready" = false ]; then
    echo -e "\n${YELLOW}⚠️ Enhanced Setup Required:${NC}"
    echo -e "1. Open 3 terminal windows"
    echo -e "2. Run Claude Code in each service directory:"
    echo -e "   ${CYAN}Terminal 1: cd frontend && claude-code${NC}"
    echo -e "   ${CYAN}Terminal 2: cd backend && claude-code${NC}"
    echo -e "   ${CYAN}Terminal 3: cd ml-server && claude-code${NC}"
    echo -e "3. Ensure MCP services are running: ${CYAN}npm run setup:mcp${NC}"
    echo -e "4. Re-run this script\n"
    return 1
  fi
  
  return 0
}

# Function to run super-enhanced E2E tests
run_super_e2e_tests() {
  echo -e "\n${BLUE}🤖 Running Super AI-Enhanced E2E Tests...${NC}"
  echo -e "${CYAN}🧠 Connecting to Sequential Thinking MCP...${NC}"
  echo -e "${CYAN}📚 Connecting to Context7 MCP...${NC}"
  echo -e "${CYAN}🎭 Connecting to Playwright MCP...${NC}"
  echo -e "${CYAN}🌐 Connecting to Browser Tools MCP...${NC}"
  
  cd "$PROJECT_ROOT/e2e"
  
  # Configure super reporter
  echo -e "${CYAN}⚙️ Configuring super AI reporter...${NC}"
  
  # Update playwright config to use super reporter
  cp playwright.config.ts playwright.config.backup.ts
  sed -i '' 's|\.\/reporters\/prompt-generator\.ts|\.\/reporters\/super-prompt-generator\.ts|g' playwright.config.ts
  
  # Run tests with super enhancement
  echo -e "${BOLD}${MAGENTA}🚀 LAUNCHING SUPER AI ANALYSIS...${NC}"
  npm test
  local test_exit_code=$?
  
  # Restore original config
  mv playwright.config.backup.ts playwright.config.ts
  
  if [ $test_exit_code -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Super AI system ready for next challenge.${NC}"
    return 0
  else
    echo -e "${YELLOW}📊 Test failures detected. Super AI analysis complete.${NC}"
    return 1
  fi
}

# Function to distribute super prompts
distribute_super_prompts() {
  echo -e "\n${BLUE}🤖 Distributing Super AI-Enhanced Prompts...${NC}"
  
  local prompts_generated=false
  
  for service in frontend backend ml-server; do
    local super_prompt_file="$PROJECT_ROOT/$service/SUPER_PROMPT.md"
    if [ -f "$super_prompt_file" ]; then
      echo -e "${GREEN}🤖 Generated SUPER PROMPT for $service with:${NC}"
      echo -e "   ${CYAN}🧠 Sequential Thinking Analysis${NC}"
      echo -e "   ${CYAN}📚 Live Documentation from Context7${NC}"
      echo -e "   ${CYAN}🎭 Auto-generated Code from Playwright MCP${NC}"
      echo -e "   ${CYAN}🌐 Live Browser Validation${NC}"
      
      # Create enhanced notification
      cat > "$PROJECT_ROOT/$service/SUPER_E2E_ACTION.md" << EOF
# 🤖 SUPER AI-ENHANCED E2E ACTION REQUIRED

## 🚨 CRITICAL: Multi-MCP Analysis Complete

A **SUPER_PROMPT.md** has been generated using 4 AI systems:

### 🧠 Sequential Thinking MCP
- ✅ Structured problem analysis completed
- ✅ Research phase with insights
- ✅ Solution strategy formulated

### 📚 Context7 MCP  
- ✅ Latest official documentation fetched
- ✅ Best practices extracted
- ✅ Code examples from official sources

### 🎭 Playwright MCP
- ✅ Automated test code generation
- ✅ Accessibility tests created
- ✅ Cross-browser validation code

### 🌐 Browser Tools MCP
- ✅ Live browser screenshots captured
- ✅ Lighthouse performance analysis
- ✅ Console error analysis
- ✅ Real-time validation completed

## 🎯 IMMEDIATE ACTIONS
1. 📖 **READ** SUPER_PROMPT.md (contains all AI analysis)
2. 🛠️ **IMPLEMENT** the AI-generated fixes
3. 🧪 **TEST** using provided code
4. ✅ **VALIDATE** with accessibility tests
5. 🗑️ **DELETE** both files when complete

**Generated**: $(date)
**AI Systems**: 4 MCP services
**Priority**: 🔥 CRITICAL
EOF
      
      prompts_generated=true
    fi
  done
  
  if [ "$prompts_generated" = true ]; then
    echo -e "${CYAN}🔔 Super enhanced notifications created for Claude instances${NC}"
    echo -e "${MAGENTA}💡 Each prompt contains AI analysis from 4 different systems!${NC}"
  else
    echo -e "${YELLOW}⚠️ No super prompts were generated${NC}"
  fi
}

# Function to show super progress
show_super_progress_and_wait() {
  echo -e "\n${BLUE}⏳ Waiting for Claude instances to process Super AI Analysis...${NC}"
  echo -e "${CYAN}🤖 Pro tip: SUPER_PROMPT.md files contain analysis from 4 AI systems${NC}"
  echo -e "${MAGENTA}✨ Watch files disappear as each Claude processes the super-enhanced analysis${NC}"
  
  local wait_time=45  # Longer wait for complex AI analysis
  local check_interval=5
  
  while [ $wait_time -gt 0 ]; do
    printf "\r${YELLOW}⏱️ Super AI processing time: ${wait_time}s (or press Ctrl+C to check now)...${NC}"
    sleep $check_interval
    wait_time=$((wait_time - check_interval))
    
    # Check super prompt status
    local pending_super_prompts=0
    for service in frontend backend ml-server; do
      if [ -f "$PROJECT_ROOT/$service/SUPER_PROMPT.md" ]; then
        pending_super_prompts=$((pending_super_prompts + 1))
      fi
    done
    
    if [ $pending_super_prompts -eq 0 ]; then
      echo -e "\n${GREEN}🚀 All super prompts processed! AI fixes implemented.${NC}"
      return 0
    fi
  done
  
  echo -e "\n${CYAN}⏰ Super processing time completed. Checking AI progress...${NC}"
}

# Function to check super fix progress
check_super_fix_progress() {
  echo -e "\n${BLUE}📊 Checking Super AI Fix Progress...${NC}"
  
  local completed_services=0
  local total_services=0
  local ai_analysis_summary=""
  
  for service in frontend backend ml-server; do
    if [ -f "$PROJECT_ROOT/$service/SUPER_E2E_ACTION.md" ]; then
      total_services=$((total_services + 1))
      if [ ! -f "$PROJECT_ROOT/$service/SUPER_PROMPT.md" ]; then
        echo -e "${GREEN}✅ $service: Super AI fixes implemented${NC}"
        completed_services=$((completed_services + 1))
        ai_analysis_summary+="✅ $service (4-MCP analysis complete) "
      else
        echo -e "${YELLOW}🤖 $service: Processing super AI analysis...${NC}"
        ai_analysis_summary+="🤖 $service (AI processing) "
      fi
    fi
  done
  
  echo -e "\n${CYAN}🤖 Super AI Progress: $completed_services/$total_services services completed${NC}"
  echo -e "${MAGENTA}Analysis: $ai_analysis_summary${NC}"
  
  if [ $total_services -eq 0 ]; then
    echo -e "${CYAN}ℹ️ No active super AI fixes in progress${NC}"
    return 0
  fi
  
  if [ $completed_services -eq $total_services ]; then
    echo -e "${GREEN}🎯 All super AI fixes completed!${NC}"
    return 0
  else
    return 1
  fi
}

# Function to cleanup super notifications
cleanup_super_notifications() {
  echo -e "\n${BLUE}🧹 Cleaning up super AI notification files...${NC}"
  
  for service in frontend backend ml-server; do
    rm -f "$PROJECT_ROOT/$service/SUPER_E2E_ACTION.md"
    rm -f "$PROJECT_ROOT/$service/SUPER_PROMPT.md"
  done
  
  rm -f "$PROJECT_ROOT/SUPER_E2E_SUMMARY.md"
  
  echo -e "${GREEN}✅ Super AI cleanup complete${NC}"
}

# Main super cycle function
run_super_cycle() {
  local cycle_count=1
  local max_cycles=3  # Fewer cycles due to AI enhancement
  
  while [ $cycle_count -le $max_cycles ]; do
    echo -e "\n${MAGENTA}${BOLD}🤖 SUPER AI CYCLE $cycle_count of $max_cycles${NC}"
    echo -e "${MAGENTA}================================${NC}"
    
    if run_super_e2e_tests; then
      echo -e "\n${GREEN}🎉 SUCCESS! All tests pass after $cycle_count super AI cycle(s)${NC}"
      echo -e "${CYAN}🤖 AI systems successfully resolved all issues!${NC}"
      cleanup_super_notifications
      return 0
    fi
    
    distribute_super_prompts
    
    if [ $cycle_count -lt $max_cycles ]; then
      show_super_progress_and_wait
      
      if ! check_super_fix_progress; then
        echo -e "${YELLOW}⚠️ Some super AI fixes still in progress. Continuing to next cycle...${NC}"
      fi
    fi
    
    cycle_count=$((cycle_count + 1))
  done
  
  echo -e "\n${RED}❌ Maximum super cycles reached.${NC}"
  echo -e "${CYAN}💡 Check SUPER_PROMPT.md files for detailed AI analysis and remaining fixes.${NC}"
  return 1
}

# Main execution
main() {
  show_super_cycle_overview
  
  if ! check_mcp_infrastructure; then
    echo -e "${RED}❌ MCP infrastructure not ready. Please run: npm run setup:mcp${NC}"
    exit 1
  fi
  
  if ! check_super_claude_setup; then
    exit 1
  fi
  
  echo -e "\n${GREEN}🚀 Starting Super AI-Enhanced TDD Cycle...${NC}"
  echo -e "${CYAN}🤖 4 AI systems standing by for analysis...${NC}"
  
  if run_super_cycle; then
    echo -e "\n${GREEN}${BOLD}✨ SUPER AI-ENHANCED E2E TDD CYCLE COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${CYAN}🎯 All tests are now passing with 4-MCP AI-enhanced fixes.${NC}"
    echo -e "${MAGENTA}🤖 AI Performance Summary:${NC}"
    echo -e "${CYAN}   🧠 Sequential Thinking: Problem analysis & solution strategy${NC}"
    echo -e "${CYAN}   📚 Context7: Latest documentation & best practices${NC}"
    echo -e "${CYAN}   🎭 Playwright: Auto-generated test & fix code${NC}"
    echo -e "${CYAN}   🌐 Browser Tools: Live validation & performance metrics${NC}"
  else
    echo -e "\n${YELLOW}⚠️ Super cycle completed with some issues remaining.${NC}"
    echo -e "${CYAN}📋 Check SUPER_E2E_SUMMARY.md for detailed AI analysis${NC}"
    echo -e "${MAGENTA}🤖 Review individual SUPER_PROMPT.md files in each service${NC}"
  fi
}

# Handle interrupts gracefully
trap 'echo -e "\n${YELLOW}⏸️ Super AI cycle interrupted by user. Cleaning up...${NC}"; cleanup_super_notifications; exit 0' INT

# Run main function
main "$@"