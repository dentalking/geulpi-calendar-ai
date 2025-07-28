# Geulpi Calendar Service - Troubleshooting Guide

## Quick Links
- [Common Issues](#common-issues)
- [Service-Specific Issues](#service-specific-issues)
- [Performance Problems](#performance-problems)
- [Data Issues](#data-issues)
- [Integration Issues](#integration-issues)
- [Emergency Procedures](#emergency-procedures)

## Common Issues

### 1. Services Won't Start

#### Symptom
```bash
docker-compose up
# Error: Service 'backend' failed to build
```

#### Solutions
1. **Check Docker daemon**
   ```bash
   sudo systemctl status docker
   sudo systemctl start docker
   ```

2. **Clear Docker cache**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

3. **Check disk space**
   ```bash
   df -h
   # Free up space if needed
   docker system df
   docker volume prune
   ```

### 2. Database Connection Failed

#### Symptom
```
org.postgresql.util.PSQLException: Connection refused
```

#### Solutions
1. **Verify PostgreSQL is running**
   ```bash
   docker-compose ps postgres
   docker-compose logs postgres
   ```

2. **Check connection settings**
   ```bash
   # Verify environment variables
   docker-compose exec backend env | grep POSTGRES
   
   # Test connection
   docker-compose exec backend nc -zv postgres 5432
   ```

3. **Reset database**
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   # Wait for ready state
   docker-compose exec postgres pg_isready
   ```

### 3. Out of Memory Errors

#### Symptom
```
java.lang.OutOfMemoryError: Java heap space
Container killed due to OOM
```

#### Solutions
1. **Increase memory limits**
   ```yaml
   # docker-compose.yml
   services:
     backend:
       environment:
         JAVA_OPTS: "-Xmx2g -Xms1g"
       deploy:
         resources:
           limits:
             memory: 3g
   ```

2. **Check memory usage**
   ```bash
   docker stats
   free -h
   ```

## Service-Specific Issues

### Frontend Issues

#### 1. Next.js Build Failures
```bash
# Error: Cannot find module
```

**Solution:**
```bash
cd frontend
rm -rf node_modules .next
npm cache clean --force
npm install
npm run build
```

#### 2. GraphQL Code Generation Errors
```bash
# Error: Cannot query field "X" on type "Y"
```

**Solution:**
```bash
# Ensure schema is up to date
cd frontend
npm run codegen
```

#### 3. Authentication Loop
**Symptoms:** User keeps getting redirected to login

**Solution:**
```javascript
// Check cookie settings in frontend/lib/apollo-client.ts
credentials: 'include',
// Ensure CORS is properly configured
```

### Backend Issues

#### 1. Spring Boot Won't Start
```
***************************
APPLICATION FAILED TO START
***************************
```

**Common causes:**
1. **Port already in use**
   ```bash
   lsof -i :8080
   kill -9 <PID>
   ```

2. **Missing dependencies**
   ```bash
   cd backend
   ./gradlew clean build
   ```

3. **Database not initialized**
   ```bash
   ./gradlew liquibaseUpdate
   ```

#### 2. GraphQL Schema Errors
```
FieldResolverError: Can't resolve field
```

**Solution:**
1. Check resolver implementation
2. Verify schema matches resolver methods
3. Enable GraphQL debug mode:
   ```yaml
   graphql:
     graphiql:
       enabled: true
   ```

#### 3. JWT Token Issues
**Symptom:** 401 Unauthorized errors

**Debug steps:**
```bash
# Decode JWT token
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d

# Verify secret key
docker-compose exec backend env | grep JWT_SECRET
```

### ML Server Issues

#### 1. Model Loading Failures
```
FileNotFoundError: [Errno 2] No such file or directory: 'models/trained/event_classifier.joblib'
```

**Solution:**
```bash
# Train models
docker-compose exec ml-server python train_models_enhanced.py

# Verify models exist
docker-compose exec ml-server ls -la models/trained/
```

#### 2. Python Dependency Conflicts
```
ImportError: cannot import name 'X' from 'Y'
```

**Solution:**
```bash
# Use Docker for consistent environment
docker-compose up ml-server

# Or recreate virtual environment
cd ml-server
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements_optimized.txt
```

#### 3. Kafka Connection Issues
```
kafka.errors.NoBrokersAvailable
```

**Debug:**
```bash
# Check Kafka is running
docker-compose ps kafka

# Test connection
docker-compose exec ml-server python -c "
from kafka import KafkaProducer
producer = KafkaProducer(bootstrap_servers='kafka:29092')
print('Connected!')
"
```

## Performance Problems

### 1. Slow API Responses

#### Diagnosis
```bash
# Enable slow query logging
docker-compose exec postgres psql -U geulpi_user -c "
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
"

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/graphql"
```

#### Solutions
1. **Add database indexes**
   ```sql
   CREATE INDEX CONCURRENTLY idx_events_user_date 
   ON events(user_id, start_time);
   
   CREATE INDEX CONCURRENTLY idx_events_area 
   ON events(area_id);
   ```

2. **Enable Redis caching**
   ```java
   @Cacheable(value = "events", key = "#userId")
   public List<Event> getEventsByUser(String userId) {
       // ...
   }
   ```

3. **Optimize GraphQL queries**
   ```graphql
   # Use fragments to avoid overfetching
   fragment EventDetails on Event {
     id
     title
     startTime
   }
   ```

### 2. High CPU Usage

#### ML Server Optimization
```python
# Limit concurrent requests
from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter

app = FastAPI()

@app.on_event("startup")
async def startup():
    await FastAPILimiter.init(redis)
```

#### Backend Optimization
```yaml
# application.yml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 10
    connection-timeout: 20000
```

### 3. Memory Leaks

#### Detection
```bash
# Java heap dump
docker-compose exec backend jmap -dump:live,format=b,file=/tmp/heapdump.bin 1

# Python memory profiling
docker-compose exec ml-server pip install memory_profiler
docker-compose exec ml-server python -m memory_profiler main.py
```

## Data Issues

### 1. Data Inconsistency

#### Check data integrity
```sql
-- Find orphaned events
SELECT e.* FROM events e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Check for duplicate events
SELECT title, start_time, COUNT(*) 
FROM events 
GROUP BY title, start_time 
HAVING COUNT(*) > 1;
```

### 2. Migration Failures

#### Rollback migration
```bash
cd backend
./gradlew liquibaseRollbackCount -PliquibaseCommandValue=1
```

#### Manual fix
```sql
-- Check migration status
SELECT * FROM databasechangelog ORDER BY dateexecuted DESC LIMIT 10;

-- Mark as executed if needed
UPDATE databasechangelog 
SET exectype = 'EXECUTED' 
WHERE id = 'problematic-changeset-id';
```

### 3. Cache Inconsistency

#### Clear all caches
```bash
# Redis
docker-compose exec redis redis-cli FLUSHALL

# Spring Cache
curl -X POST http://localhost:8080/actuator/caches/clear

# ML Server cache
docker-compose exec ml-server rm -rf cache/*
```

## Integration Issues

### 1. Google Calendar Sync Failures

#### Debug OAuth
```bash
# Check tokens
docker-compose exec backend psql -U geulpi_user -d geulpi_db -c "
SELECT user_id, expires_at, created_at 
FROM oauth2_tokens 
WHERE expires_at < NOW();
"
```

#### Force token refresh
```java
@Service
public class GoogleCalendarService {
    public void forceTokenRefresh(String userId) {
        OAuth2Token token = tokenRepository.findByUserId(userId);
        String newToken = refreshToken(token.getRefreshToken());
        token.setAccessToken(newToken);
        token.setExpiresAt(Instant.now().plusSeconds(3600));
        tokenRepository.save(token);
    }
}
```

### 2. OpenAI API Errors

#### Rate limiting
```python
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def call_openai_api(prompt):
    try:
        response = openai.Completion.create(...)
        return response
    except openai.error.RateLimitError:
        time.sleep(60)
        raise
```

### 3. WebSocket Connection Issues

#### Debug WebSocket
```javascript
// frontend/lib/apollo-client.ts
const wsLink = new WebSocketLink({
  uri: process.env.NEXT_PUBLIC_WS_URL,
  options: {
    reconnect: true,
    connectionParams: {
      authToken: getAuthToken(),
    },
    connectionCallback: (error) => {
      if (error) {
        console.error('WebSocket connection error:', error);
      }
    },
  },
});
```

## Emergency Procedures

### 1. Service Complete Failure

```bash
#!/bin/bash
# emergency-restart.sh

# Stop all services
docker-compose down

# Clear problematic volumes
docker volume rm geulpi_postgres_data geulpi_redis_data

# Restore from backup
./scripts/restore-backup.sh latest

# Start services
docker-compose up -d

# Verify health
./scripts/health-check.sh
```

### 2. Database Corruption

```bash
# Stop backend services
docker-compose stop backend ml-server

# Backup corrupted data
docker-compose exec postgres pg_dump -U geulpi_user geulpi_db > corrupted_backup.sql

# Restore from last known good backup
docker-compose exec postgres psql -U geulpi_user -d postgres -c "DROP DATABASE geulpi_db;"
docker-compose exec postgres psql -U geulpi_user -d postgres -c "CREATE DATABASE geulpi_db;"
docker-compose exec postgres psql -U geulpi_user -d geulpi_db < last_good_backup.sql

# Restart services
docker-compose up -d
```

### 3. Security Breach

```bash
# Immediate actions
1. Rotate all secrets
   ./scripts/rotate-secrets.sh

2. Revoke all JWT tokens
   docker-compose exec redis redis-cli FLUSHALL

3. Force all users to re-authenticate
   UPDATE users SET force_reauth = true;

4. Check logs for suspicious activity
   grep -i "unauthorized\|injection\|malicious" logs/*.log

5. Enable additional monitoring
   docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d
```

## Monitoring Commands

### Quick Health Check
```bash
#!/bin/bash
# health-summary.sh

echo "=== Service Status ==="
docker-compose ps

echo -e "\n=== API Health ==="
curl -s http://localhost:8080/actuator/health | jq .
curl -s http://localhost:8000/health | jq .

echo -e "\n=== Database Status ==="
docker-compose exec postgres pg_isready

echo -e "\n=== Redis Status ==="
docker-compose exec redis redis-cli ping

echo -e "\n=== Kafka Status ==="
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Resource Usage
```bash
# Docker resources
docker stats --no-stream

# System resources
htop

# Disk usage
df -h
du -sh /var/lib/docker/
```

## Getting Help

1. **Check logs first**
   ```bash
   docker-compose logs -f <service-name> | grep -i error
   ```

2. **Enable debug mode**
   ```yaml
   # Add to docker-compose.yml
   environment:
     - DEBUG=true
     - LOG_LEVEL=DEBUG
   ```

3. **Contact support**
   - Slack: #geulpi-support
   - Email: support@geulpi.com
   - Include: Error messages, logs, steps to reproduce