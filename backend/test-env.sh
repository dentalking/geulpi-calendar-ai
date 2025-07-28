#!/bin/bash

echo "=== Testing Environment Variables Setup ==="
echo

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ .env file loaded successfully"
else
    echo "❌ .env file not found"
    exit 1
fi

echo
echo "=== Checking Required Environment Variables ==="

# Check Google Cloud credentials
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "✅ GOOGLE_APPLICATION_CREDENTIALS is set"
    if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        echo "✅ Service account key file exists"
    else
        echo "❌ Service account key file not found at: $GOOGLE_APPLICATION_CREDENTIALS"
    fi
else
    echo "❌ GOOGLE_APPLICATION_CREDENTIALS not set"
fi

# Check Google OAuth
if [ -n "$GOOGLE_CLIENT_ID" ] && [ "$GOOGLE_CLIENT_ID" != "your-oauth2-client-id-from-console" ]; then
    echo "✅ GOOGLE_CLIENT_ID is configured"
else
    echo "❌ GOOGLE_CLIENT_ID not properly configured"
fi

if [ -n "$GOOGLE_CLIENT_SECRET" ] && [ "$GOOGLE_CLIENT_SECRET" != "your-oauth2-client-secret-from-console" ]; then
    echo "✅ GOOGLE_CLIENT_SECRET is configured"
else
    echo "❌ GOOGLE_CLIENT_SECRET not properly configured"
fi

# Check API Keys
if [ -n "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "your-google-api-key-from-console" ]; then
    echo "✅ GOOGLE_API_KEY is configured"
else
    echo "❌ GOOGLE_API_KEY not properly configured"
fi

if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-your-openai-api-key" ]; then
    echo "✅ OPENAI_API_KEY is configured"
else
    echo "❌ OPENAI_API_KEY not properly configured"
fi

echo
echo "=== Testing Google Cloud Authentication ==="
if command -v gcloud &> /dev/null; then
    gcloud auth application-default print-access-token > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Google Cloud authentication is working"
    else
        echo "❌ Google Cloud authentication failed"
    fi
else
    echo "❌ gcloud CLI not found"
fi

echo
echo "=== Testing OpenAI API Connection ==="
if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-your-openai-api-key" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        https://api.openai.com/v1/models)
    
    if [ "$response" = "200" ]; then
        echo "✅ OpenAI API connection successful"
    elif [ "$response" = "401" ]; then
        echo "❌ OpenAI API authentication failed (invalid API key)"
    else
        echo "❌ OpenAI API connection failed (HTTP $response)"
    fi
else
    echo "⚠️  Skipping OpenAI API test (no API key configured)"
fi

echo
echo "=== Database Configuration ==="
if [ -n "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URL is set: $DATABASE_URL"
else
    echo "❌ DATABASE_URL not set"
fi

echo
echo "=== Summary ==="
echo "Please ensure all ❌ items are fixed before running the application."
echo "For Google API Key, visit: https://console.cloud.google.com/apis/credentials"