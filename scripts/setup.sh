#!/bin/bash

# Geulpi Calendar Service - Setup Script
# This script initializes the entire development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running from project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Starting Geulpi Calendar Service setup..."

# 1. Check prerequisites
print_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose is installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) is installed"

# Check Java
if ! command -v java &> /dev/null; then
    print_error "Java is not installed. Please install Java 21 first."
    exit 1
fi
print_success "Java is installed"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.11 first."
    exit 1
fi
print_success "Python $(python3 --version) is installed"

# 2. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_success ".env file created. Please update it with your API keys and secrets."
    print_info "Edit .env file and add your credentials before proceeding."
    read -p "Press enter to continue after updating .env file..."
fi

# 3. Install dependencies for each service
print_info "Installing dependencies..."

# Frontend dependencies
print_info "Installing frontend dependencies..."
cd frontend
npm install
cd ..
print_success "Frontend dependencies installed"

# Backend dependencies
print_info "Setting up backend..."
cd backend
if [ -f "gradlew" ]; then
    chmod +x gradlew
    ./gradlew build -x test
else
    print_error "Gradle wrapper not found in backend directory"
fi
cd ..
print_success "Backend setup complete"

# ML Server dependencies
print_info "Setting up ML server..."
cd ml-server
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
pip install -r requirements_optimized.txt || pip install -r requirements.txt
deactivate 2>/dev/null || true
cd ..
print_success "ML server setup complete"

# 4. Generate GraphQL types for frontend
print_info "Generating GraphQL types..."
cd frontend
npm run codegen || true
cd ..
print_success "GraphQL types generated"

# 5. Create necessary directories
print_info "Creating necessary directories..."
mkdir -p frontend/generated
mkdir -p backend/logs
mkdir -p ml-server/models/trained
mkdir -p ml-server/cache
mkdir -p ml-server/tests
mkdir -p docs
mkdir -p .github/workflows
mkdir -p nginx/ssl
print_success "Directories created"

# 6. Set up Docker volumes
print_info "Creating Docker volumes..."
docker volume create geulpi_postgres_data || true
docker volume create geulpi_redis_data || true
docker volume create geulpi_ml_cache || true
docker volume create geulpi_nginx_logs || true
print_success "Docker volumes created"

# 7. Start infrastructure services
print_info "Starting infrastructure services..."
docker-compose up -d postgres redis kafka zookeeper
print_info "Waiting for services to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-geulpi_user} > /dev/null 2>&1; do
    print_info "Waiting for PostgreSQL to be ready..."
    sleep 2
done
print_success "PostgreSQL is ready"

# Check if Redis is ready
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    print_info "Waiting for Redis to be ready..."
    sleep 2
done
print_success "Redis is ready"

# 8. Run database migrations
print_info "Running database migrations..."
cd backend
./gradlew liquibaseUpdate || true
cd ..
print_success "Database migrations completed"

# 9. Train ML models (optional)
read -p "Do you want to train ML models now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Training ML models..."
    docker-compose run --rm ml-server python train_models_enhanced.py
    print_success "ML models trained"
fi

# 10. Final instructions
echo
print_success "Setup completed successfully!"
echo
echo "To start all services, run:"
echo "  docker-compose up"
echo
echo "Or start services individually:"
echo "  docker-compose up frontend    # Frontend on http://localhost:3000"
echo "  docker-compose up backend     # Backend on http://localhost:8080"
echo "  docker-compose up ml-server   # ML Server on http://localhost:8000"
echo "  docker-compose up nginx       # Nginx proxy on http://localhost (redirects to https)"
echo
echo "To stop all services:"
echo "  docker-compose down"
echo
echo "For development with hot reload:"
echo "  cd frontend && npm run dev"
echo "  cd backend && ./gradlew bootRun"
echo "  cd ml-server && uvicorn main:app --reload"
echo
print_info "Don't forget to update your .env file with proper API keys!"