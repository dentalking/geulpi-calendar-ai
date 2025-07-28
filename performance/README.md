# Geulpi Calendar Service - Performance Testing Suite

종합적인 성능 테스트 도구로 전체 시스템의 병목 지점을 찾고 최적화 기회를 식별합니다.

## 📋 목차

- [개요](#개요)
- [빠른 시작](#빠른-시작)
- [테스트 구성 요소](#테스트-구성-요소)
- [설치 및 설정](#설치-및-설정)
- [사용법](#사용법)
- [결과 해석](#결과-해석)
- [성능 임계값](#성능-임계값)
- [최적화 가이드](#최적화-가이드)

## 🎯 개요

이 성능 테스트 스위트는 Geulpi Calendar Service의 모든 구성 요소에 대한 포괄적인 성능 분석을 제공합니다:

- **Frontend (React)** - 페이지 로드 시간, Core Web Vitals, 번들 크기
- **Backend (Spring Boot)** - API 응답 시간, 처리량, GraphQL 성능
- **ML Server (FastAPI)** - 모델 추론 시간, 최적화 성능, 패턴 감지
- **Database (PostgreSQL)** - 쿼리 성능, 인덱스 효율성, 캐시 히트율
- **Cache (Redis)** - 캐시 성능, 데이터 구조 최적화, 메모리 사용량

## 🚀 빠른 시작

### 1. 빠른 상태 확인

모든 서비스가 실행 중인지 확인하고 기본적인 성능 체크:

```bash
cd performance
./quick-test.sh
```

### 2. 전체 성능 테스트 실행

종합적인 성능 분석:

```bash
cd performance
./run-performance-tests.sh
```

## 🧩 테스트 구성 요소

### Artillery 로드 테스트

#### 1. Backend Load Test (`artillery/backend-load-test.yml`)
- **GraphQL API 성능** - Query, Mutation, Subscription 테스트
- **인증 플로우** - 로그인, 토큰 갱신, 세션 관리
- **데이터베이스 작업** - CRUD 연산, 복잡한 쿼리, 트랜잭션
- **캐싱 성능** - Redis 캐시 히트/미스, 캐시 무효화
- **동시성 테스트** - 높은 부하에서의 동시 요청 처리

#### 2. Frontend Load Test (`artillery/frontend-load-test.yml`)
- **정적 자산 로딩** - JS, CSS, 이미지 파일 로드 시간
- **페이지 로드 성능** - 첫 화면 로딩, 라우팅 성능
- **사용자 여정** - 로그인 → 대시보드 → 캘린더 플로우
- **PWA 기능** - Service Worker, 오프라인 모드
- **Core Web Vitals** - LCP, FID, CLS 측정

#### 3. ML Server Load Test (`artillery/ml-server-load-test.yml`)
- **일정 최적화** - 다양한 제약 조건하에서의 최적화 성능
- **패턴 감지** - 사용자 행동 패턴 분석 성능
- **이벤트 분류** - 머신러닝 모델 추론 속도
- **번아웃 예측** - 복합 데이터 분석 성능
- **배치 처리** - 대량 요청 처리 능력

### 데이터베이스 성능 테스트

#### PostgreSQL Test (`database/db-performance-test.sql`)
- **쿼리 성능 분석** - EXPLAIN ANALYZE를 통한 실행 계획 분석
- **인덱스 효율성** - 인덱스 사용률 및 최적화 기회
- **JOIN 성능** - 복잡한 관계형 쿼리 최적화
- **집계 쿼리** - 분석 쿼리 성능 측정
- **캐시 히트율** - 버퍼 풀 효율성 분석
- **동시성 테스트** - 락 분석 및 동시 접근 성능

### Redis 성능 테스트

#### Redis Test (`redis/redis-performance-test.js`)
- **기본 연산** - GET, SET, DELETE 성능
- **데이터 구조** - List, Hash, Set, Sorted Set 성능
- **캐시 연산** - 세션 캐싱, 이벤트 캐싱
- **파이프라인** - 배치 연산 성능 향상
- **메모리 분석** - 메모리 사용 패턴 및 최적화
- **Pub/Sub** - 실시간 메시징 성능

## 📦 설치 및 설정

### 필수 요구사항

```bash
# Node.js 및 npm
node --version  # v18+ 권장
npm --version

# Artillery 설치
npm install -g artillery

# 데이터베이스 도구
# PostgreSQL 클라이언트
psql --version

# Redis 클라이언트
redis-cli --version

# 기본 유틸리티
curl --version
bc --version
```

### 서비스 실행 확인

모든 서비스가 다음 포트에서 실행 중이어야 합니다:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080/graphql
- **ML Server**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📊 사용법

### 1. 개별 테스트 실행

#### Frontend 테스트
```bash
cd artillery
artillery run frontend-load-test.yml
```

#### Backend 테스트
```bash
cd artillery
artillery run backend-load-test.yml
```

#### ML Server 테스트
```bash
cd artillery
artillery run ml-server-load-test.yml
```

#### 데이터베이스 테스트
```bash
cd database
psql -h localhost -p 5432 -d geulpi_calendar -f db-performance-test.sql
```

#### Redis 테스트
```bash
cd redis
node redis-performance-test.js
```

### 2. 전체 테스트 스위트 실행

```bash
./run-performance-tests.sh
```

### 3. 결과 확인

테스트 결과는 `results/YYYYMMDD_HHMMSS/` 디렉토리에 저장됩니다:

```
results/
└── 20240125_143022/
    ├── performance_report_20240125_143022.md  # 종합 보고서
    ├── artillery/
    │   ├── backend_20240125_143022.json       # Backend 테스트 결과
    │   ├── frontend_20240125_143022.json      # Frontend 테스트 결과
    │   └── ml-server_20240125_143022.json     # ML Server 테스트 결과
    ├── database/
    │   └── db_performance_20240125_143022.log # 데이터베이스 테스트 결과
    └── redis/
        └── redis_performance_20240125_143022.log # Redis 테스트 결과
```

## 📈 결과 해석

### 성능 지표 해석

#### 응답 시간 (Response Time)
- **Excellent**: < 100ms
- **Good**: 100-500ms
- **Fair**: 500ms-1s
- **Poor**: > 1s

#### 처리량 (Throughput)
- **High**: > 1000 req/s
- **Medium**: 100-1000 req/s
- **Low**: < 100 req/s

#### 에러율 (Error Rate)
- **Acceptable**: < 1%
- **Warning**: 1-5%
- **Critical**: > 5%

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s (Good)
- **FID (First Input Delay)**: < 100ms (Good)
- **CLS (Cumulative Layout Shift)**: < 0.1 (Good)

### 데이터베이스 성능 지표

#### 쿼리 실행 시간
- **Fast**: < 10ms
- **Acceptable**: 10-100ms
- **Slow**: 100ms-1s
- **Very Slow**: > 1s

#### 캐시 히트율
- **Excellent**: > 95%
- **Good**: 90-95%
- **Fair**: 80-90%
- **Poor**: < 80%

### Redis 성능 지표

#### 기본 연산 시간
- **Excellent**: < 1ms
- **Good**: 1-5ms
- **Fair**: 5-10ms
- **Poor**: > 10ms

## 🔧 성능 임계값

### 시스템 전체 임계값

```javascript
const PERFORMANCE_THRESHOLDS = {
  // 응답 시간 (밀리초)
  MAX_RESPONSE_TIME: {
    frontend: 2000,      // 2초
    backend: 3000,       // 3초
    mlServer: 5000,      // 5초 (ML 추론 시간 고려)
    database: 1000,      // 1초
    redis: 10            // 10ms
  },
  
  // 처리량 (초당 요청)
  MIN_THROUGHPUT: {
    frontend: 200,
    backend: 100,
    mlServer: 50
  },
  
  // 에러율 (%)
  MAX_ERROR_RATE: 1,
  
  // 자원 사용률 (%)
  MAX_RESOURCE_USAGE: {
    cpu: 80,
    memory: 85,
    disk: 90
  }
};
```

### 알림 조건

다음 조건에서 성능 알림이 발생합니다:

- 평균 응답 시간이 임계값 초과
- 에러율이 1% 초과
- CPU 사용률이 80% 초과
- 메모리 사용률이 85% 초과
- 데이터베이스 캐시 히트율이 80% 미만

## 🎯 최적화 가이드

### Frontend 최적화

#### 1. 번들 크기 최적화
```bash
# 번들 분석
npm run build:analyze

# 최적화 방법
- Code splitting 구현
- Tree shaking 활용
- 이미지 최적화 (WebP, lazy loading)
- CDN 사용
```

#### 2. 로딩 성능 개선
```javascript
// Service Worker 구현
// Progressive Web App 기능
// Critical CSS inlining
// Resource hints (preload, prefetch)
```

### Backend 최적화

#### 1. GraphQL 최적화
```java
// Query complexity 제한
// N+1 문제 해결 (DataLoader 사용)
// 캐싱 전략 구현
// Connection pooling 최적화
```

#### 2. Spring Boot 성능 튜닝
```yaml
# application.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
  jpa:
    hibernate:
      jdbc:
        batch_size: 20
```

### ML Server 최적화

#### 1. 모델 추론 최적화
```python
# 모델 캐싱
# 배치 처리
# 비동기 처리
# GPU 활용 (가능한 경우)
```

#### 2. FastAPI 성능 튜닝
```python
# Uvicorn workers 증가
# 응답 압축
# 캐싱 미들웨어
# 연결 풀링
```

### 데이터베이스 최적화

#### 1. 쿼리 최적화
```sql
-- 인덱스 추가
CREATE INDEX CONCURRENTLY idx_events_user_start_time 
ON events(user_id, start_time);

-- 쿼리 재작성
-- 서브쿼리를 JOIN으로 변환
-- EXISTS 대신 JOIN 사용
```

#### 2. PostgreSQL 설정 최적화
```postgresql
# postgresql.conf
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 1GB
```

### Redis 최적화

#### 1. 메모리 최적화
```redis
# redis.conf
maxmemory-policy allkeys-lru
maxmemory 512MB

# 데이터 구조 최적화
# Hash 대신 String 사용 (작은 데이터)
# 적절한 TTL 설정
```

#### 2. 성능 최적화
```javascript
// Pipeline 사용
// 연결 풀링
// 캐시 계층화
// Lua 스크립트 활용
```

## 🔄 지속적인 모니터링

### 1. 자동화된 성능 테스트

```bash
# Crontab 설정 (매일 새벽 2시)
0 2 * * * cd /path/to/performance && ./run-performance-tests.sh
```

### 2. 성능 회귀 감지

```javascript
// CI/CD 파이프라인에 성능 테스트 통합
// 기준선 대비 성능 비교
// 성능 회귀 시 빌드 실패
```

### 3. 실시간 모니터링

```yaml
# Prometheus + Grafana 구성
# Application metrics 수집
# 알림 규칙 설정
# 대시보드 구성
```

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 테스트 실행 실패
```bash
# 서비스 상태 확인
./quick-test.sh

# 로그 확인
tail -f results/latest/artillery/*.log
```

#### 2. 높은 응답 시간
```bash
# 시스템 리소스 확인
top
htop
iotop

# 네트워크 확인
ping localhost
netstat -tulpn
```

#### 3. 데이터베이스 성능 문제
```sql
-- 현재 실행 중인 쿼리 확인
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- 느린 쿼리 로그 활성화
SET log_min_duration_statement = 1000;
```

### 지원 및 문의

성능 테스트 관련 문의사항은 개발팀에 문의해주세요.

---

*Geulpi Calendar Service Performance Testing Suite v1.0*