# Geulpi Calendar Service - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04 LTS or later
- **CPU**: 4+ cores recommended
- **RAM**: 16GB minimum (32GB for production)
- **Storage**: 100GB+ SSD
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Kubernetes**: 1.28+ (for production)

### Required Tools
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install kubectl (for production)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/geulpi-project-1.git
cd geulpi-project-1
```

### 2. Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
```env
# Database
POSTGRES_DB=geulpi_db
POSTGRES_USER=geulpi_user
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# Security
JWT_SECRET=<generated-secret>

# OAuth
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

# API Keys
OPENAI_API_KEY=sk-<your-key>
ANTHROPIC_API_KEY=sk-ant-<your-key>
GOOGLE_API_KEY=<your-key>

# Application URLs (adjust for your domain)
NEXT_PUBLIC_GRAPHQL_URL=https://api.geulpi.com/graphql
NEXT_PUBLIC_API_URL=https://api.geulpi.com
```

### 3. SSL Certificates

For production, obtain SSL certificates from Let's Encrypt:
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d geulpi.com -d api.geulpi.com

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/geulpi.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/geulpi.com/privkey.pem ./nginx/ssl/key.pem
```

## Development Deployment

### Quick Start
```bash
# Run setup script
./scripts/setup.sh

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# ML Server: http://localhost:8000
```

### Individual Service Development
```bash
# Frontend only (with hot reload)
cd frontend && npm run dev

# Backend only (with hot reload)
cd backend && ./gradlew bootRun

# ML Server only (with hot reload)
cd ml-server && uvicorn main:app --reload
```

## Staging Deployment

### 1. Build Images
```bash
# Build all services
docker-compose -f docker-compose.yml -f docker-compose.staging.yml build

# Tag images
docker tag geulpi_frontend:latest your-registry/geulpi_frontend:staging
docker tag geulpi_backend:latest your-registry/geulpi_backend:staging
docker tag geulpi_ml-server:latest your-registry/geulpi_ml-server:staging
docker tag geulpi_nginx:latest your-registry/geulpi_nginx:staging

# Push to registry
docker push your-registry/geulpi_frontend:staging
docker push your-registry/geulpi_backend:staging
docker push your-registry/geulpi_ml-server:staging
docker push your-registry/geulpi_nginx:staging
```

### 2. Deploy to Staging Server
```bash
# SSH to staging server
ssh user@staging.geulpi.com

# Pull latest code
cd /opt/geulpi
git pull origin main

# Update images
docker-compose -f docker-compose.yml -f docker-compose.staging.yml pull

# Deploy with zero downtime
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --no-deps --scale backend=2 backend
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --no-deps frontend ml-server nginx

# Run migrations
docker-compose exec backend ./gradlew liquibaseUpdate

# Verify deployment
curl https://staging.geulpi.com/health
```

## Production Deployment

### 1. Kubernetes Setup

Create namespace:
```bash
kubectl create namespace geulpi-prod
```

Apply configurations:
```bash
# ConfigMaps and Secrets
kubectl apply -f k8s/production/configmap.yaml
kubectl apply -f k8s/production/secrets.yaml

# Deployments
kubectl apply -f k8s/production/postgres-deployment.yaml
kubectl apply -f k8s/production/redis-deployment.yaml
kubectl apply -f k8s/production/backend-deployment.yaml
kubectl apply -f k8s/production/frontend-deployment.yaml
kubectl apply -f k8s/production/ml-server-deployment.yaml

# Services
kubectl apply -f k8s/production/services.yaml

# Ingress
kubectl apply -f k8s/production/ingress.yaml
```

### 2. Database Migration
```bash
# Run migration job
kubectl apply -f k8s/production/migration-job.yaml

# Check migration status
kubectl logs -f job/db-migration -n geulpi-prod
```

### 3. Blue-Green Deployment
```bash
# Deploy to green environment
kubectl set image deployment/backend backend=your-registry/backend:v2.0.0 -n geulpi-prod-green

# Test green environment
curl https://green.geulpi.com/health

# Switch traffic to green
kubectl patch service backend -n geulpi-prod -p '{"spec":{"selector":{"version":"green"}}}'

# Remove blue environment after verification
kubectl delete deployment backend-blue -n geulpi-prod
```

### 4. Horizontal Pod Autoscaling
```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: geulpi-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring & Maintenance

### 1. Health Checks
```bash
# Check all services
./scripts/health-check.sh

# Individual service health
curl https://api.geulpi.com/actuator/health
curl https://ml.geulpi.com/health
```

### 2. Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/actuator/prometheus'
  
  - job_name: 'ml-server'
    static_configs:
      - targets: ['ml-server:8000']
    metrics_path: '/metrics'
```

### 3. Log Aggregation
```bash
# View logs with Loki
docker-compose -f docker-compose.monitoring.yml up -d loki grafana

# Query logs in Grafana
{service="backend"} |= "ERROR"
```

### 4. Database Backup
```bash
# Automated daily backup
0 2 * * * /opt/geulpi/scripts/backup.sh

# Manual backup
docker-compose exec postgres pg_dump -U geulpi_user geulpi_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Check resource usage
docker stats

# Restart service
docker-compose restart <service-name>
```

#### 2. Database Connection Issues
```bash
# Test connection
docker-compose exec backend nc -zv postgres 5432

# Check credentials
docker-compose exec backend env | grep POSTGRES

# Reset connections
docker-compose restart postgres backend
```

#### 3. ML Server Model Loading Issues
```bash
# Check model files
docker-compose exec ml-server ls -la models/trained/

# Retrain models
docker-compose exec ml-server python train_models_enhanced.py

# Check memory usage
docker stats ml-server
```

#### 4. Nginx 502 Bad Gateway
```bash
# Check upstream services
docker-compose ps

# Test backend directly
curl http://localhost:8080/health

# Reload nginx config
docker-compose exec nginx nginx -s reload
```

### Performance Issues

#### 1. Slow Queries
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_events_user_time 
ON events(user_id, start_time, end_time);
```

#### 2. High Memory Usage
```bash
# Adjust JVM settings for backend
JAVA_OPTS="-Xmx2g -Xms1g -XX:+UseG1GC"

# Limit ML server workers
uvicorn main:app --workers 2 --limit-max-requests 1000
```

## Rollback Procedures

### 1. Quick Rollback (Docker)
```bash
# Tag current version
docker tag geulpi_backend:latest geulpi_backend:rollback

# Deploy previous version
docker-compose up -d --no-deps backend

# Verify
curl http://localhost:8080/actuator/health
```

### 2. Database Rollback
```bash
# Create restore point
docker-compose exec postgres psql -U geulpi_user -c "SELECT pg_create_restore_point('before_deployment');"

# Rollback if needed
docker-compose exec postgres psql -U geulpi_user -c "SELECT pg_wal_replay_pause();"
docker-compose exec postgres psql -U geulpi_user -c "SELECT pg_rewind();"
```

### 3. Kubernetes Rollback
```bash
# View rollout history
kubectl rollout history deployment/backend -n geulpi-prod

# Rollback to previous version
kubectl rollout undo deployment/backend -n geulpi-prod

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n geulpi-prod

# Check status
kubectl rollout status deployment/backend -n geulpi-prod
```

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] SSL/TLS enabled for all external endpoints
- [ ] Database connections use SSL
- [ ] Regular security updates applied
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] SQL injection prevention verified
- [ ] XSS protection headers set
- [ ] Regular backups automated
- [ ] Monitoring alerts configured
- [ ] Incident response plan documented

## Post-Deployment Verification

```bash
# Run automated tests
./scripts/integration-test.sh

# Check all endpoints
curl https://api.geulpi.com/health
curl https://geulpi.com
curl https://ml.geulpi.com/health

# Verify GraphQL
curl -X POST https://api.geulpi.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Check logs for errors
docker-compose logs --tail=100 | grep ERROR

# Monitor for 15 minutes
watch -n 5 './scripts/health-check.sh'
```

## Support

For deployment issues:
- Slack: #geulpi-ops
- Email: ops@geulpi.com
- On-call: +82-10-XXXX-XXXX