#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}=== Geulpi E2E Test Runner ===${NC}"

# Parse command line arguments
TEST_ENV="docker"
HEADED=false
DEBUG=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      TEST_ENV="local"
      shift
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --test)
      SPECIFIC_TEST="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--local] [--headed] [--debug] [--test <test-file>]"
      exit 1
      ;;
  esac
done

# Function to check if services are healthy
check_service_health() {
  local service=$1
  local max_attempts=30
  local attempt=0

  echo -e "${YELLOW}Waiting for $service to be healthy...${NC}"
  
  while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f docker-compose.test.yml ps | grep -q "$service.*healthy"; then
      echo -e "${GREEN}✓ $service is healthy${NC}"
      return 0
    fi
    
    attempt=$((attempt + 1))
    sleep 2
  done
  
  echo -e "${RED}✗ $service failed to become healthy${NC}"
  return 1
}

# Function to run tests in Docker
run_docker_tests() {
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Starting test environment with Docker Compose...${NC}"
  
  # Copy test environment file
  cp e2e/.env.test .env.test
  
  # Start services
  docker-compose -f docker-compose.test.yml up -d
  
  # Wait for all services to be healthy
  for service in postgres-test redis-test kafka-test backend-test frontend-test ml-server-test nginx-test; do
    if ! check_service_health $service; then
      echo -e "${RED}Failed to start test environment${NC}"
      docker-compose -f docker-compose.test.yml logs
      docker-compose -f docker-compose.test.yml down -v
      exit 1
    fi
  done
  
  echo -e "${GREEN}All services are healthy!${NC}"
  
  # Install Playwright browsers if needed
  cd e2e
  npm install
  npx playwright install --with-deps chromium firefox webkit
  
  # Build test command
  TEST_CMD="npm test"
  
  if [ "$HEADED" = true ]; then
    TEST_CMD="npm run test:headed"
  fi
  
  if [ "$DEBUG" = true ]; then
    TEST_CMD="npm run test:debug"
  fi
  
  if [ -n "$SPECIFIC_TEST" ]; then
    TEST_CMD="$TEST_CMD -- $SPECIFIC_TEST"
  fi
  
  # Run tests
  echo -e "${YELLOW}Running E2E tests...${NC}"
  eval $TEST_CMD
  TEST_EXIT_CODE=$?
  
  # Show test report
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "${YELLOW}Opening test report...${NC}"
    npm run test:report
  fi
  
  # Cleanup
  cd "$PROJECT_ROOT"
  echo -e "${YELLOW}Cleaning up test environment...${NC}"
  docker-compose -f docker-compose.test.yml down -v
  rm -f .env.test
  
  exit $TEST_EXIT_CODE
}

# Function to run tests locally
run_local_tests() {
  cd "$PROJECT_ROOT/e2e"
  
  echo -e "${YELLOW}Running E2E tests against local services...${NC}"
  echo -e "${YELLOW}Make sure all services are running locally!${NC}"
  
  # Check if services are accessible
  if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}Frontend is not accessible at http://localhost:3000${NC}"
    exit 1
  fi
  
  if ! curl -s http://localhost:8080/actuator/health > /dev/null; then
    echo -e "${RED}Backend is not accessible at http://localhost:8080${NC}"
    exit 1
  fi
  
  # Install dependencies
  npm install
  npx playwright install --with-deps chromium firefox webkit
  
  # Use local environment
  cp .env.test .env.local
  sed -i '' 's|https://localhost|http://localhost:3000|g' .env.local
  
  # Build test command
  TEST_CMD="npm test"
  
  if [ "$HEADED" = true ]; then
    TEST_CMD="npm run test:headed"
  fi
  
  if [ "$DEBUG" = true ]; then
    TEST_CMD="npm run test:debug"
  fi
  
  if [ -n "$SPECIFIC_TEST" ]; then
    TEST_CMD="$TEST_CMD -- $SPECIFIC_TEST"
  fi
  
  # Run tests
  eval "NODE_ENV=test $TEST_CMD"
  TEST_EXIT_CODE=$?
  
  # Cleanup
  rm -f .env.local
  
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo -e "${RED}✗ Some tests failed${NC}"
    npm run test:report
  fi
  
  exit $TEST_EXIT_CODE
}

# Main execution
if [ "$TEST_ENV" = "docker" ]; then
  run_docker_tests
else
  run_local_tests
fi