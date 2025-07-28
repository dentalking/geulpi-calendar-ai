#!/bin/bash

# Production Deployment Script for Geulpi Calendar Service
# This script handles deployment to different environments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
SKIP_VALIDATION=false
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_REBUILD=false
VERBOSE=false

# Function to print colored output
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Geulpi Calendar Service to specified environment.

OPTIONS:
    -e, --environment ENV    Target environment (staging|production) [default: staging]
    -s, --skip-validation    Skip environment validation
    -b, --skip-backup       Skip database backup (production only)
    -t, --skip-tests        Skip running tests
    -f, --force-rebuild     Force rebuild of all containers
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

EXAMPLES:
    $0 -e staging                    # Deploy to staging
    $0 -e production -v              # Deploy to production with verbose output
    $0 -e production -s -b           # Deploy to production, skip validation and backup

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        -b|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -f|--force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'."
    exit 1
fi

# Set verbose mode
if [[ "$VERBOSE" == "true" ]]; then
    set -x
fi

# Configuration based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    COMPOSE_FILE="docker-compose.production.yml"
    ENV_FILE=".env.production"
    PROJECT_NAME="geulpi-prod"
else
    COMPOSE_FILE="docker-compose.staging.yml"
    ENV_FILE=".env.staging"
    PROJECT_NAME="geulpi-staging"
fi

log "Starting deployment to $ENVIRONMENT environment"
log "Using compose file: $COMPOSE_FILE"
log "Using environment file: $ENV_FILE"

# Check if required files exist
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_files=()
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        missing_files+=("$COMPOSE_FILE")
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        missing_files+=("$ENV_FILE")
    fi
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing required files:"
        printf '%s\n' "${missing_files[@]}"
        exit 1
    fi
    
    # Check if Docker and Docker Compose are available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log_warning "Skipping environment validation"
        return
    fi
    
    log "Validating environment variables..."
    
    # Load environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Run validation scripts
    if [[ -f "scripts/env-validator.js" ]]; then
        log "Running Node.js environment validation..."
        if ! node scripts/env-validator.js; then
            log_error "Environment validation failed"
            exit 1
        fi
    fi
    
    if [[ -f "scripts/env-validator.py" ]] && command -v python3 &> /dev/null; then
        log "Running Python environment validation..."
        if ! python3 scripts/env-validator.py; then
            log_error "Python environment validation failed"
            exit 1
        fi
    fi
    
    log_success "Environment validation passed"
}

# Backup database (production only)
backup_database() {
    if [[ "$ENVIRONMENT" != "production" || "$SKIP_BACKUP" == "true" ]]; then
        return
    fi
    
    log "Creating database backup..."
    
    # Create backup directory
    mkdir -p backups
    
    # Generate backup filename with timestamp
    BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
    
    # Source environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Create backup
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"; then
        log_success "Database backup created: $BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        log_success "Backup compressed: ${BACKUP_FILE}.gz"
        
        # Clean old backups (keep last 10)
        find backups -name "backup-*.sql.gz" -type f | sort -r | tail -n +11 | xargs -r rm
        log "Old backups cleaned up"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return
    fi
    
    log "Running tests..."
    
    # Run backend tests if available
    if [[ -f "backend/package.json" ]]; then
        cd backend
        if npm run test --if-present; then
            log_success "Backend tests passed"
        else
            log_error "Backend tests failed"
            exit 1
        fi
        cd ..
    fi
    
    # Run frontend tests if available
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        if npm run test --if-present; then
            log_success "Frontend tests passed"
        else
            log_error "Frontend tests failed"
            exit 1
        fi
        cd ..
    fi
    
    # Run ML server tests if available
    if [[ -f "ml-server/requirements.txt" ]] && command -v python3 &> /dev/null; then
        cd ml-server
        if python3 -m pytest --if-exists; then
            log_success "ML server tests passed"
        else
            log_error "ML server tests failed"
            exit 1
        fi
        cd ..
    fi
}

# Build and deploy services
deploy_services() {
    log "Deploying services..."
    
    # Set environment variables
    export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
    
    local compose_cmd="docker-compose -f $COMPOSE_FILE"
    
    # Add environment file if it exists
    if [[ -f "$ENV_FILE" ]]; then
        compose_cmd="$compose_cmd --env-file $ENV_FILE"
    fi
    
    # Build services
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        log "Force rebuilding all services..."
        $compose_cmd build --no-cache
    else
        log "Building services..."
        $compose_cmd build
    fi
    
    # Stop existing services
    log "Stopping existing services..."
    $compose_cmd down --remove-orphans
    
    # Start services
    log "Starting services..."
    $compose_cmd up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    local max_attempts=60
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if $compose_cmd ps | grep -q "unhealthy\|starting"; then
            log "Waiting for services... (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        else
            log_success "All services are healthy"
            break
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Services failed to become healthy within expected time"
        $compose_cmd ps
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local compose_cmd="docker-compose -f $COMPOSE_FILE"
    if [[ -f "$ENV_FILE" ]]; then
        compose_cmd="$compose_cmd --env-file $ENV_FILE"
    fi
    
    # Check service status
    log "Checking service status..."
    $compose_cmd ps
    
    # Test health endpoints
    log "Testing health endpoints..."
    
    # Wait a bit for services to fully start
    sleep 5
    
    # Test backend health
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    # Test ML server health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "ML server health check passed"
    else
        log_error "ML server health check failed"
        exit 1
    fi
    
    # Test frontend (if accessible)
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed (may be expected if behind proxy)"
    fi
    
    log_success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    if [[ "$VERBOSE" == "true" ]]; then
        set +x
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment workflow
main() {
    log "=== Geulpi Calendar Service Deployment ==="
    log "Environment: $ENVIRONMENT"
    log "Timestamp: $(date)"
    
    check_prerequisites
    validate_environment
    run_tests
    backup_database
    deploy_services
    verify_deployment
    
    log_success "Deployment to $ENVIRONMENT completed successfully!"
    
    # Show useful information
    echo
    log "=== Deployment Information ==="
    log "Environment: $ENVIRONMENT"
    log "Frontend: http://localhost:3000"
    log "Backend API: http://localhost:8080"
    log "GraphQL: http://localhost:8080/graphql"
    log "ML Server: http://localhost:8000"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Grafana: http://localhost:3001"
        log "Prometheus: http://localhost:9090"
    fi
    
    echo
    log "View logs with: docker-compose -f $COMPOSE_FILE logs -f [service]"
    log "Stop services with: docker-compose -f $COMPOSE_FILE down"
}

# Run main function
main "$@"
