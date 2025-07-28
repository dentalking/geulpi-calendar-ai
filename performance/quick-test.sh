#!/bin/bash

# Quick Performance Test for Development
# Runs essential performance checks for Geulpi Calendar Service

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Quick Performance Check - Geulpi Calendar Service${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check service response time
check_service_performance() {
    local service_name=$1
    local url=$2
    local expected_max_time=$3
    
    echo -e "${YELLOW}Testing $service_name...${NC}"
    
    # Use curl to measure response time
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$url" 2>/dev/null || echo "999")
    local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    
    if [ "$response_time_ms" -lt "$expected_max_time" ]; then
        echo -e "${GREEN}✅ $service_name: ${response_time_ms}ms (Good)${NC}"
        return 0
    else
        echo -e "${RED}⚠️ $service_name: ${response_time_ms}ms (Slow)${NC}"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo -e "${YELLOW}Testing Database connection...${NC}"
    
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        local db_time=$(time (psql -h localhost -p 5432 -d geulpi_calendar -c "SELECT 1;" >/dev/null 2>&1) 2>&1 | grep real | awk '{print $2}' | cut -d. -f1-2)
        echo -e "${GREEN}✅ Database: Connected (${db_time}s)${NC}"
        return 0
    else
        echo -e "${RED}❌ Database: Not accessible${NC}"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    echo -e "${YELLOW}Testing Redis connection...${NC}"
    
    local redis_time=$(time (redis-cli ping >/dev/null 2>&1) 2>&1 | grep real | awk '{print $2}' | cut -d. -f1-2)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Redis: Connected (${redis_time}s)${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis: Not accessible${NC}"
        return 1
    fi
}

# Main checks
echo ""

# Database check
check_database
db_status=$?

# Redis check  
check_redis
redis_status=$?

# Service checks
check_service_performance "Frontend" "http://localhost:3000" 2000
frontend_status=$?

check_service_performance "Backend GraphQL" "http://localhost:8080/graphql" 3000
backend_status=$?

check_service_performance "ML Server" "http://localhost:8000/health" 5000
ml_status=$?

# Summary
echo ""
echo -e "${BLUE}📊 Quick Performance Summary${NC}"
echo -e "${BLUE}===========================${NC}"

total_checks=5
passed_checks=0

[ $db_status -eq 0 ] && ((passed_checks++))
[ $redis_status -eq 0 ] && ((passed_checks++))
[ $frontend_status -eq 0 ] && ((passed_checks++))
[ $backend_status -eq 0 ] && ((passed_checks++))
[ $ml_status -eq 0 ] && ((passed_checks++))

echo -e "Services Healthy: $passed_checks/$total_checks"
echo -e "Overall Health: $(( passed_checks * 100 / total_checks ))%"

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}🎉 All services are performing well!${NC}"
    echo -e "${BLUE}💡 For detailed performance analysis, run: ./run-performance-tests.sh${NC}"
else
    echo -e "${YELLOW}⚠️ Some services need attention.${NC}"
    echo -e "${BLUE}💡 Run full performance tests: ./run-performance-tests.sh${NC}"
fi

echo ""