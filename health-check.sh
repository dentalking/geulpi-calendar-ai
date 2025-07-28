#!/bin/bash

##
# Health check script for Geulpi Calendar Service
# Checks all services and their health endpoints
##

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service definitions
services=("postgres" "redis" "frontend" "backend" "ml-server")

# Function to get port for service
get_service_port() {
    case $1 in
        "postgres") echo "5432" ;;
        "redis") echo "6379" ;;
        "frontend") echo "3000" ;;
        "backend") echo "8080" ;;
        "ml-server") echo "8000" ;;
    esac
}

# Function to get health URL for service
get_health_url() {
    case $1 in
        "frontend") echo "http://localhost:3000" ;;
        "backend") echo "http://localhost:8080/health" ;;
        "ml-server") echo "http://localhost:8000/health" ;;
        *) echo "" ;;
    esac
}

# Functions
function print_header() {
    echo ""
    echo "====================================="
    echo "Geulpi Calendar Service Health Check"
    echo "====================================="
    echo ""
}

function check_docker() {
    echo "Checking Docker status..."
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker daemon is not running${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker is running${NC}"
    echo ""
}

function check_docker_compose() {
    echo "Checking Docker Compose..."
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker Compose is available${NC}"
    echo ""
}

function check_env_file() {
    echo "Checking environment configuration..."
    if [[ ! -f ".env" ]]; then
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        echo "  Creating .env from .env.example..."
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            echo -e "${GREEN}  ✓ Created .env file${NC}"
            echo -e "${YELLOW}  ⚠ Please update .env with your actual values${NC}"
        else
            echo -e "${RED}  ✗ .env.example not found${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ .env file exists${NC}"
    fi
    echo ""
}

function check_container_status() {
    local service=$1
    local container_name="geulpi_${service//-/_}"
    
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✓ ${service} container is running${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service} container is not running${NC}"
        return 1
    fi
}

function check_port() {
    local service=$1
    local port=$(get_service_port $service)
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Port $port is listening${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Port $port is not listening${NC}"
        return 1
    fi
}

function check_health_endpoint() {
    local service=$1
    local url=$(get_health_url $service)
    
    if [[ -z "$url" ]]; then
        return 0
    fi
    
    echo -n "  Checking health endpoint... "
    
    # Wait a bit for service to be ready
    sleep 2
    
    # Try to connect to the health endpoint
    if curl -s -f -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Not responding${NC}"
        return 1
    fi
}

function check_all_services() {
    echo "Checking services..."
    echo ""
    
    local all_healthy=true
    
    for service in "${services[@]}"; do
        echo "• ${service}:"
        
        if check_container_status "$service"; then
            check_port "$service"
            check_health_endpoint "$service"
        else
            all_healthy=false
        fi
        
        echo ""
    done
    
    return $([[ $all_healthy == true ]] && echo 0 || echo 1)
}

function check_database_connection() {
    echo "Checking database connectivity..."
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    if docker exec geulpi_postgres pg_isready -U ${POSTGRES_USER:-geulpi_user} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
    else
        echo -e "${RED}✗ PostgreSQL is not ready${NC}"
    fi
    echo ""
}

function check_redis_connection() {
    echo "Checking Redis connectivity..."
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    if docker exec geulpi_redis redis-cli -a ${REDIS_PASSWORD:-password} ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is responding${NC}"
    else
        echo -e "${RED}✗ Redis is not responding${NC}"
    fi
    echo ""
}

function print_summary() {
    echo "====================================="
    echo "Summary"
    echo "====================================="
    
    if [[ $1 -eq 0 ]]; then
        echo -e "${GREEN}✓ All services are healthy!${NC}"
        echo ""
        echo "You can access:"
        echo "  • Frontend: http://localhost:3000"
        echo "  • Backend GraphQL: http://localhost:8080/graphql"
        echo "  • ML Server: http://localhost:8000"
    else
        echo -e "${RED}✗ Some services are not healthy${NC}"
        echo ""
        echo "Try running:"
        echo "  docker-compose up -d"
        echo ""
        echo "Check logs with:"
        echo "  docker-compose logs [service-name]"
    fi
    echo ""
}

# Main execution
function main() {
    print_header
    
    # Check prerequisites
    check_docker
    check_docker_compose
    check_env_file
    
    # Check services
    check_all_services
    local services_status=$?
    
    # Additional checks
    check_database_connection
    check_redis_connection
    
    # Summary
    print_summary $services_status
    
    exit $services_status
}

# Run main function
main