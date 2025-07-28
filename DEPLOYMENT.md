# Geulpi Calendar Service - Production Deployment Guide

This guide provides comprehensive instructions for deploying the Geulpi Calendar Service to production and staging environments with robust monitoring, logging, and backup capabilities.

## 🏗️ Architecture Overview

The Geulpi Calendar Service consists of:
- **Frontend**: Next.js React application
- **Backend**: Spring Boot GraphQL API server  
- **ML Server**: Python FastAPI-based ML inference service
- **Database**: PostgreSQL with automated backups
- **Cache**: Redis for session and application caching
- **Monitoring**: Prometheus + Grafana for metrics and dashboards
- **Logging**: Structured logging with ELK stack integration
- **Reverse Proxy**: Nginx for load balancing and SSL termination

## 📋 Prerequisites

### System Requirements
- Docker 20.10+ and Docker Compose 2.0+
- 8GB+ RAM for production deployment
- 20GB+ disk space for logs and backups
- SSL certificates (for production)

### Required Tools
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js for validation scripts
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python for ML server validation
sudo apt-get install -y python3 python3-pip
```

## 🔧 Environment Configuration

### 1. Environment Files

Copy and customize environment files for your deployment:

```bash
# For production
cp .env.example .env.production

# For staging  
cp .env.example .env.staging
```

### 2. Required Environment Variables

#### Core Configuration
```bash
# Environment
NODE_ENV=production  # or staging

# Database
POSTGRES_DB=geulpi_prod_db
POSTGRES_USER=geulpi_prod_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis
REDIS_PASSWORD=your_secure_redis_password

# JWT Security
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
```

#### Production-Specific Settings
```bash
# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs
SSL_KEY_PATH=/etc/ssl/private

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
TRACING_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/geulpi

# Backup
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=your-backup-bucket  # optional
```

### 3. Environment Validation

Validate your environment configuration:

```bash
# Validate Node.js environment
node scripts/env-validator.js

# Validate Python environment
python3 scripts/env-validator.py

# Test connections (optional)
node scripts/env-validator.js --test-connections
```

## 🚀 Deployment

### Quick Deployment

Use the automated deployment script:

```bash
# Make scripts executable
chmod +x scripts/deploy.sh scripts/backup.sh

# Deploy to staging
./scripts/deploy.sh -e staging

# Deploy to production with verbose output
./scripts/deploy.sh -e production -v

# Deploy to production, skip tests and validation (not recommended)
./scripts/deploy.sh -e production -s -t
```

### Manual Deployment

#### Staging Environment
```bash
# Load environment variables
export COMPOSE_PROJECT_NAME=geulpi-staging

# Build and start services
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Check service status
docker-compose -f docker-compose.staging.yml ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f
```

#### Production Environment
```bash
# Load environment variables
export COMPOSE_PROJECT_NAME=geulpi-prod

# Build and start services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build

# Check service status
docker-compose -f docker-compose.production.yml ps

# Verify health
curl http://localhost:8080/health
curl http://localhost:8000/health
```

## 📊 Monitoring and Observability

### Service Endpoints

| Service | Endpoint | Purpose |
|---------|----------|----------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8080 | GraphQL API |
| ML Server | http://localhost:8000 | ML inference API |
| Grafana | http://localhost:3001 | Monitoring dashboards |
| Prometheus | http://localhost:9090 | Metrics collection |

### Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# ML server health  
curl http://localhost:8000/health

# Detailed health with metrics
curl http://localhost:8080/health?include=metrics

# Readiness probe
curl http://localhost:8080/ready

# Liveness probe
curl http://localhost:8080/alive
```

### Metrics

```bash
# Prometheus metrics (backend)
curl http://localhost:9090/metrics

# Prometheus metrics (ML server)
curl http://localhost:9091/metrics

# Custom application metrics
curl http://localhost:8080/metrics
curl http://localhost:8000/metrics
```

### Grafana Dashboards

Access Grafana at http://localhost:3001
- Default login: admin / (check GRAFANA_ADMIN_PASSWORD)
- Pre-configured dashboards for all services
- Real-time monitoring of performance metrics
- Alert configuration for critical issues

## 📝 Logging

### Log Configuration

The system uses structured JSON logging with the following features:
- **Backend**: Winston with multiple transports
- **ML Server**: Structlog with performance optimizations
- **Log Levels**: error, warn, info, debug, trace
- **Log Rotation**: Automatic with size and time-based rotation
- **Log Aggregation**: ELK stack integration available

### Viewing Logs

```bash
# View all service logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f ml-server

# View logs with timestamps
docker-compose -f docker-compose.production.yml logs -f -t frontend

# View recent logs (last 100 lines)
docker-compose -f docker-compose.production.yml logs --tail=100 backend
```

### Log Files

Log files are stored in the `./logs` directory:
```
logs/
├── backend/
│   ├── combined.log     # All backend logs
│   ├── error.log        # Error logs only
│   └── access.log       # HTTP access logs
├── ml-server/
│   ├── combined.log     # All ML server logs
│   └── error.log        # Error logs only
├── frontend/
│   └── combined.log     # Frontend logs
└── nginx/
    ├── access.log       # Nginx access logs
    └── error.log        # Nginx error logs
```

## 💾 Backup and Recovery

### Automated Backups

Backups are configured to run automatically:
- **Database**: Full PostgreSQL dumps
- **Redis**: RDB snapshots
- **Logs**: Compressed archives
- **Configuration**: Environment and config files

```bash
# Manual backup (all components)
./scripts/backup.sh

# Backup specific components
./scripts/backup.sh database
./scripts/backup.sh redis
./scripts/backup.sh logs
./scripts/backup.sh config

# Cleanup old backups
./scripts/backup.sh cleanup
```

### Backup Configuration

```bash
# Set backup retention (days)
BACKUP_RETENTION_DAYS=30

# Configure S3 backup (optional)
BACKUP_S3_BUCKET=your-backup-bucket

# Email notifications
BACKUP_NOTIFICATION_EMAIL=admin@yourdomain.com
```

### Backup Locations

```
backups/
├── database/
│   └── geulpi_db_20231201_120000.sql.gz
├── redis/
│   └── redis_20231201_120000.rdb.gz
├── logs/
│   └── logs_20231201_120000.tar.gz
├── config/
│   └── config_20231201_120000.tar.gz
└── backup_report_20231201_120000.txt
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop the application
docker-compose -f docker-compose.production.yml down

# Restore database from backup
zcat backups/database/geulpi_db_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

#### Redis Recovery
```bash
# Stop Redis
docker-compose -f docker-compose.production.yml stop redis

# Restore Redis data
zcat backups/redis/redis_YYYYMMDD_HHMMSS.rdb.gz | \
  docker cp - geulpi_redis:/data/dump.rdb

# Restart Redis
docker-compose -f docker-compose.production.yml start redis
```

## 🔒 Security

### SSL/TLS Configuration

1. **Obtain SSL certificates** (Let's Encrypt recommended):
```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
```

2. **Configure Nginx** (see `config/nginx/` directory)

### Security Best Practices

- Use strong, unique passwords for all services
- Enable SSL/TLS for all external communications
- Regularly update dependencies and base images
- Monitor security logs and access patterns
- Implement rate limiting and DDoS protection
- Use secrets management for sensitive configuration

### Environment Security

```bash
# Set secure file permissions
chmod 600 .env.production .env.staging
chown root:root .env.production .env.staging

# Secure SSL certificates
chmod 600 ssl/*
chown root:root ssl/*
```

## 🔧 Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**:
```bash
# Update Docker images
docker-compose -f docker-compose.production.yml pull

# Rebuild with latest dependencies
docker-compose -f docker-compose.production.yml build --no-cache
```

2. **Log Rotation**:
```bash
# Manual log rotation
docker-compose -f docker-compose.production.yml exec backend \
  kill -USR1 $(pgrep node)
```

3. **Database Maintenance**:
```bash
# Vacuum and analyze database
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));"
```

4. **Cache Cleanup**:
```bash
# Flush Redis cache (if needed)
docker-compose -f docker-compose.production.yml exec redis \
  redis-cli -a $REDIS_PASSWORD FLUSHDB
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Monitor service health
watch -n 5 'curl -s http://localhost:8080/health | jq .status'

# Check database connections
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check service logs
docker-compose -f docker-compose.production.yml logs service-name

# Check system resources
docker system df
df -h
free -h

# Rebuild problematic service
docker-compose -f docker-compose.production.yml build --no-cache service-name
```

#### Database Connection Issues
```bash
# Test database connectivity
docker-compose -f docker-compose.production.yml exec backend \
  node -e "console.log(process.env.DATABASE_URL)"

# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres

# Verify database is accepting connections
docker-compose -f docker-compose.production.yml exec postgres \
  pg_isready -U $POSTGRES_USER
```

#### Memory Issues
```bash
# Check memory usage by service
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Restart memory-intensive services
docker-compose -f docker-compose.production.yml restart ml-server

# Clean up unused Docker resources
docker system prune -a
```

#### SSL Certificate Issues
```bash
# Check certificate expiration
openssl x509 -in ssl/cert.pem -noout -dates

# Test SSL configuration
openssl s_client -connect localhost:443 -servername yourdomain.com

# Renew Let's Encrypt certificates
sudo certbot renew
```

### Log Analysis

```bash
# Search for errors in logs
grep -r "ERROR" logs/

# Analyze access patterns
tail -f logs/nginx/access.log | grep -E "(GET|POST)"

# Monitor failed requests
tail -f logs/backend/error.log | jq '.level, .message'
```

### Emergency Procedures

#### Emergency Shutdown
```bash
# Graceful shutdown
docker-compose -f docker-compose.production.yml down

# Force shutdown (if graceful fails)
docker-compose -f docker-compose.production.yml kill
docker-compose -f docker-compose.production.yml down
```

#### Quick Recovery
```bash
# Restore from latest backup
./scripts/backup.sh
./scripts/deploy.sh -e production -s -t
```

## 📞 Support

For deployment issues and support:
- Check the troubleshooting section above
- Review service logs for error messages
- Verify environment configuration
- Test network connectivity between services
- Monitor resource usage (CPU, memory, disk)

### Monitoring Alerts

Set up alerts for:
- Service downtime (health check failures)
- High memory/CPU usage (>80%)
- Disk space issues (<10% free)
- Failed backup operations
- SSL certificate expiration (<30 days)
- High error rates (>5%)

### Useful Commands Reference

```bash
# Quick health check all services
for port in 3000 8080 8000; do
  echo "Port $port: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health || echo "FAIL")"
done

# Resource usage summary
echo "Memory: $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5" used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

# Service status summary  
docker-compose -f docker-compose.production.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
```

This completes the comprehensive deployment guide for the Geulpi Calendar Service. The system is now ready for production use with enterprise-grade monitoring, logging, backup, and security features.
