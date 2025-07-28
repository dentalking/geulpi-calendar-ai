#!/bin/bash

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start all services
docker-compose up -d