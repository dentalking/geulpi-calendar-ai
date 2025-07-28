#!/bin/bash

# Test script for new API endpoints
echo "Testing Backend API Endpoints..."

# Start the backend if not running
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "Starting backend server..."
    ./gradlew bootRun &
    BACKEND_PID=$!
    sleep 30
fi

echo "1. Testing Dashboard API - getTodaySchedule"
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getTodaySchedule(userId: \"test-user\") { date totalEvents busyHours dailyGoal } }"
  }' | jq .

echo -e "\n2. Testing Dashboard API - getLifeBalanceAnalytics"
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getLifeBalanceAnalytics(userId: \"test-user\", period: TODAY) { score recommendations } }"
  }' | jq .

echo -e "\n3. Testing Dashboard API - getDailyInsights"
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getDailyInsights(userId: \"test-user\") { id type message priority actionable } }"
  }' | jq .

echo -e "\nAPI tests completed!"

# Clean up
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID
fi