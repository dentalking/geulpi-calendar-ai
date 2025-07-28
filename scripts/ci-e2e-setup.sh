#!/bin/bash

# Script to set up E2E tests in CI environment
set -e

echo "Setting up E2E test environment for CI..."

# Install system dependencies for Playwright
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2

# Navigate to E2E directory
cd e2e

# Install npm dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps chromium firefox webkit

# Create test results directory
mkdir -p test-results playwright-report

echo "E2E test environment setup complete!"