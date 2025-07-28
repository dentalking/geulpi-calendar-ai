# Geulpi Calendar Service - 성능 병목 지점 분석 및 최적화 가이드

## 🎯 분석 개요

Geulpi Calendar Service의 성능 테스트 스위트를 기반으로 한 잠재적 병목 지점 분석 및 최적화 전략입니다.

## 📊 주요 병목 지점 분석

### 1. 🗄️ 데이터베이스 계층 병목

#### 잠재적 문제점
- **복잡한 이벤트 조회 쿼리**: 사용자별 월간/주간 이벤트 조회 시 JOIN 연산 과다
- **날짜 범위 검색**: `start_time`, `end_time` 범위 검색 시 인덱스 부족
- **실시간 충돌 감지**: 동시 이벤트 스케줄링 시 락 경합
- **집계 쿼리**: 대시보드 통계 생성 시 비효율적인 GROUP BY

#### 성능 영향
```sql
-- 느린 쿼리 예시 (예상 실행 시간: 500-2000ms)
SELECT u.*, COUNT(e.id) as event_count 
FROM users u 
LEFT JOIN events e ON u.id = e.user_id 
WHERE e.start_time >= '2024-01-01' 
  AND e.end_time <= '2024-12-31'
GROUP BY u.id
ORDER BY event_count DESC;
```

#### 최적화 전략
```sql
-- 복합 인덱스 추가
CREATE INDEX CONCURRENTLY idx_events_user_time_range 
ON events(user_id, start_time, end_time);

-- 부분 인덱스 (활성 이벤트만)
CREATE INDEX CONCURRENTLY idx_events_active 
ON events(user_id, start_time) 
WHERE deleted_at IS NULL;

-- 구체화된 뷰 (대시보드 통계)
CREATE MATERIALIZED VIEW user_event_stats AS
SELECT user_id, 
       COUNT(*) as total_events,
       COUNT(CASE WHEN start_time >= CURRENT_DATE THEN 1 END) as future_events
FROM events 
GROUP BY user_id;
```

### 2. 🧠 ML Server 계층 병목

#### 잠재적 문제점
- **모델 로딩 지연**: Cold start 시 모델 초기화 시간 (2-5초)
- **최적화 알고리즘**: 복잡한 제약 조건 하에서 일정 최적화 시간 증가
- **메모리 사용량**: 대용량 데이터 처리 시 메모리 부족
- **동시성 제한**: CPU intensive 작업으로 인한 동시 요청 처리 한계

#### 성능 영향
```python
# 병목 지점 예시
def optimize_schedule(events, constraints, preferences):
    # 모델 로딩: 2-3초
    model = load_optimization_model()
    
    # 데이터 전처리: 500ms-1s
    processed_data = preprocess_events(events)
    
    # 최적화 실행: 3-10초 (이벤트 수에 따라)
    result = model.optimize(processed_data, constraints)
    
    return result
```

#### 최적화 전략
```python
# 1. 모델 사전 로딩 및 캐싱
class ModelCache:
    _instance = None
    _models = {}
    
    @classmethod
    def get_model(cls, model_type):
        if model_type not in cls._models:
            cls._models[model_type] = load_model(model_type)
        return cls._models[model_type]

# 2. 비동기 처리
@app.post("/optimize-schedule")
async def optimize_schedule_async(request: OptimizationRequest):
    result = await asyncio.to_thread(
        optimize_schedule_sync, 
        request.events, 
        request.constraints
    )
    return result

# 3. 결과 캐싱
@lru_cache(maxsize=1000)
def cached_optimization(events_hash, constraints_hash):
    return optimize_schedule(events, constraints)
```

### 3. 🌐 Frontend 계층 병목

#### 잠재적 문제점
- **대용량 번들**: JavaScript 번들 크기 과다 (1MB+)
- **캘린더 렌더링**: 월간 뷰에서 대량 이벤트 렌더링 지연
- **실시간 업데이트**: WebSocket 연결 및 상태 동기화 오버헤드
- **메모리 누수**: 장시간 사용 시 메모리 증가

#### 성능 영향
```javascript
// 병목 지점 예시 - 캘린더 렌더링
function renderCalendarEvents(events) {
    // 1000+ 이벤트 렌더링 시 2-5초 소요
    return events.map(event => (
        <EventComponent 
            key={event.id}
            event={event}
            onUpdate={handleEventUpdate}  // 리렌더링 트리거
        />
    ));
}
```

#### 최적화 전략
```javascript
// 1. 가상화 (Virtualization)
import { FixedSizeList as List } from 'react-window';

function VirtualizedEventList({ events }) {
    return (
        <List
            height={600}
            itemCount={events.length}
            itemSize={80}
            itemData={events}
        >
            {EventItem}
        </List>
    );
}

// 2. 메모이제이션
const MemoizedEventComponent = React.memo(EventComponent, (prevProps, nextProps) => {
    return prevProps.event.id === nextProps.event.id &&
           prevProps.event.updatedAt === nextProps.event.updatedAt;
});

// 3. 코드 분할
const CalendarView = lazy(() => import('./CalendarView'));
const AnalyticsView = lazy(() => import('./AnalyticsView'));

// 4. 번들 최적화
// webpack.config.js
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                }
            }
        }
    }
};
```

### 4. 🚀 Backend API 계층 병목

#### 잠재적 문제점
- **N+1 쿼리 문제**: GraphQL 리졸버에서 관련 데이터 로딩
- **과도한 데이터 전송**: 불필요한 필드 포함
- **캐시 미스**: 빈번한 데이터베이스 조회
- **동시성 처리**: 높은 부하에서 스레드 풀 고갈

#### 성능 영향
```java
// N+1 문제 예시
@GraphQLQuery
public List<Event> getUserEvents(@GraphQLArgument String userId) {
    User user = userService.findById(userId);
    
    // 각 이벤트마다 별도 쿼리 실행 (N+1 문제)
    return user.getEvents().stream()
        .map(event -> {
            event.setLocation(locationService.findById(event.getLocationId()));
            event.setAttendees(attendeeService.findByEventId(event.getId()));
            return event;
        })
        .collect(Collectors.toList());
}
```

#### 최적화 전략
```java
// 1. DataLoader 패턴
@Component
public class LocationDataLoader {
    @Autowired
    private LocationService locationService;
    
    private final DataLoader<String, Location> dataLoader;
    
    public LocationDataLoader() {
        this.dataLoader = DataLoader.newDataLoader(locationIds -> 
            CompletableFuture.completedFuture(
                locationService.findByIds(locationIds)
            )
        );
    }
}

// 2. 프로젝션 사용
@Query("SELECT e.id, e.title, e.startTime, l.name as locationName " +
       "FROM Event e LEFT JOIN e.location l WHERE e.userId = :userId")
List<EventProjection> findEventProjectionsByUserId(@Param("userId") String userId);

// 3. 캐싱 전략
@Cacheable(value = "user-events", key = "#userId", unless = "#result.isEmpty()")
public List<Event> getUserEvents(String userId) {
    return eventRepository.findByUserIdWithLocationAndAttendees(userId);
}

// 4. 연결 풀 최적화
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 20000
      idle-timeout: 300000
      max-lifetime: 1200000
```

### 5. 📦 Redis 캐시 계층 병목

#### 잠재적 문제점
- **캐시 미스율 높음**: 비효율적인 캐시 키 설계
- **메모리 부족**: TTL 설정 부재로 인한 메모리 누적
- **네트워크 라운드트립**: 개별 캐시 조회로 인한 지연
- **데이터 일관성**: 캐시 무효화 누락

#### 성능 영향
```javascript
// 비효율적인 캐시 사용 예시
async function getUserEvents(userId) {
    const events = [];
    const eventIds = await redis.get(`user:${userId}:event_ids`);
    
    // 각 이벤트마다 개별 조회 (N+1 문제)
    for (const eventId of eventIds) {
        const event = await redis.get(`event:${eventId}`);
        events.push(JSON.parse(event));
    }
    
    return events;
}
```

#### 최적화 전략
```javascript
// 1. 파이프라인 사용
async function getUserEventsOptimized(userId) {
    const pipeline = redis.pipeline();
    const eventIds = await redis.get(`user:${userId}:event_ids`);
    
    eventIds.forEach(eventId => {
        pipeline.get(`event:${eventId}`);
    });
    
    const results = await pipeline.exec();
    return results.map(([err, result]) => JSON.parse(result));
}

// 2. 데이터 구조 최적화
// Hash 사용으로 관련 데이터 그룹화
await redis.hset(`user:${userId}:events`, {
    'event:1': JSON.stringify(event1),
    'event:2': JSON.stringify(event2)
});

// 3. 캐시 계층화
class CacheManager {
    async get(key) {
        // L1: 로컬 메모리 캐시
        let value = this.localCache.get(key);
        if (value) return value;
        
        // L2: Redis 캐시
        value = await this.redis.get(key);
        if (value) {
            this.localCache.set(key, value, { ttl: 60 });
            return value;
        }
        
        // L3: 데이터베이스
        value = await this.database.get(key);
        await this.redis.setex(key, 300, value);
        this.localCache.set(key, value, { ttl: 60 });
        
        return value;
    }
}
```

## 🎯 우선순위별 최적화 로드맵

### 🔴 High Priority (즉시 해결)

1. **데이터베이스 인덱스 추가**
   - `events(user_id, start_time)` 복합 인덱스
   - `events(start_time, end_time)` 범위 검색 인덱스

2. **GraphQL N+1 문제 해결**
   - DataLoader 패턴 구현
   - Batch loading 활성화

3. **ML 모델 캐싱**
   - 애플리케이션 시작 시 모델 사전 로딩
   - 최적화 결과 캐싱

### 🟡 Medium Priority (1-2주 내)

1. **Frontend 번들 최적화**
   - 코드 분할 구현
   - Tree shaking 활성화
   - 이미지 최적화

2. **Redis 캐시 전략 개선**
   - 파이프라인 사용
   - TTL 설정 표준화
   - 캐시 계층화

3. **연결 풀 최적화**
   - 데이터베이스 연결 풀 튜닝
   - HTTP 클라이언트 연결 풀

### 🟢 Low Priority (1개월 내)

1. **모니터링 및 알림**
   - 성능 메트릭 수집
   - 자동 알림 설정
   - 성능 회귀 감지

2. **수평 확장 준비**
   - 로드 밸런싱
   - 데이터베이스 읽기 복제본
   - 캐시 클러스터링

## 📈 예상 성능 향상

### 데이터베이스 최적화 후
- 쿼리 응답 시간: **500ms → 50ms** (90% 개선)
- 처리량: **100 req/s → 500 req/s** (400% 향상)

### ML Server 최적화 후
- Cold start 시간: **3s → 200ms** (93% 개선)
- 최적화 응답 시간: **8s → 2s** (75% 개선)

### Frontend 최적화 후
- 초기 로딩 시간: **3s → 1.2s** (60% 개선)
- 캘린더 렌더링: **2s → 300ms** (85% 개선)

### Cache 최적화 후
- 캐시 히트율: **60% → 95%** (58% 향상)
- 평균 응답 시간: **200ms → 50ms** (75% 개선)

## 🔧 구현 체크리스트

### 데이터베이스 최적화
- [ ] 성능 크리티컬 인덱스 추가
- [ ] 느린 쿼리 식별 및 최적화
- [ ] 연결 풀 설정 튜닝
- [ ] 쿼리 실행 계획 분석

### Backend 최적화  
- [ ] DataLoader 패턴 구현
- [ ] 캐싱 전략 구현
- [ ] 비동기 처리 개선
- [ ] 응답 압축 활성화

### ML Server 최적화
- [ ] 모델 사전 로딩 구현
- [ ] 결과 캐싱 시스템
- [ ] 배치 처리 최적화
- [ ] 리소스 모니터링

### Frontend 최적화
- [ ] 번들 분할 구현
- [ ] 컴포넌트 메모이제이션
- [ ] 이미지 최적화
- [ ] 가상화 구현

### 모니터링 설정
- [ ] 성능 메트릭 수집
- [ ] 알림 규칙 설정
- [ ] 대시보드 구성
- [ ] 로그 분석 시스템

---

이 분석을 바탕으로 우선순위에 따라 최적화 작업을 진행하여 Geulpi Calendar Service의 전반적인 성능을 크게 향상시킬 수 있습니다.