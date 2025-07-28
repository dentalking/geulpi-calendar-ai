# Geulpi Calendar Service 통합 테스트 주도 개발 (TDD) 가이드

이 문서는 Frontend, Backend, ML Server를 통합하여 테스트 주도 개발을 진행하기 위한 가이드입니다. 전체 시스템의 안정성과 신뢰성을 보장하는 것이 목표입니다.

## 🎯 TDD 목표
- 서비스 간 통합 지점의 안정성 검증
- End-to-End 사용자 시나리오 검증
- 성능 및 확장성 테스트
- 장애 시나리오 대응 검증

## 📋 통합 테스트 시나리오

### Stage 1: 기본 통합 테스트 환경 구축
```
1. Docker Compose 기반 테스트 환경:
   - 전체 서비스 스택 실행 스크립트 작성
   - 테스트 전용 환경 변수 설정 (.env.test)
   - 테스트 데이터베이스 초기화 스크립트
   - 서비스 간 네트워크 연결 검증

2. 테스트 자동화 프레임워크:
   - Playwright 기반 E2E 테스트 환경 구축
   - API 통합 테스트를 위한 Postman/Newman 설정
   - 성능 테스트를 위한 K6 설정
   - 테스트 결과 리포팅 시스템

3. CI/CD 파이프라인 통합:
   - GitHub Actions 워크플로우 작성
   - 병렬 테스트 실행 전략
   - 테스트 커버리지 통합 (Frontend + Backend)
   - 실패 시 자동 롤백 메커니즘
```

### Stage 2: 핵심 사용자 플로우 테스트
```
테스트 시나리오: 신규 사용자 온보딩 및 첫 일정 생성

1. 회원가입 플로우:
   GIVEN: 신규 사용자가 서비스에 접속
   WHEN: Google OAuth로 로그인 시도
   THEN: 
     - JWT 토큰 발급 확인
     - 사용자 정보 DB 저장 확인
     - Frontend 리다이렉션 확인

2. 온보딩 프로세스:
   GIVEN: 로그인된 신규 사용자
   WHEN: 라이프 영역 설정 및 밸런스 목표 입력
   THEN:
     - GraphQL mutation 성공 확인
     - 사용자 선호도 DB 저장 확인
     - ML 서버 초기 분석 트리거 확인

3. 자연어 일정 생성:
   GIVEN: 온보딩 완료된 사용자
   WHEN: "내일 오후 3시에 팀 미팅 추가해줘" 입력
   THEN:
     - NLP 처리 결과 확인
     - 일정 DB 생성 확인
     - 캘린더 UI 업데이트 확인
     - Google Calendar 동기화 확인

4. 실시간 동기화:
   GIVEN: 여러 디바이스에서 로그인한 사용자
   WHEN: 한 디바이스에서 일정 수정
   THEN:
     - GraphQL Subscription 동작 확인
     - 모든 디바이스 실시간 업데이트 확인
     - 충돌 해결 메커니즘 확인
```

### Stage 3: 외부 서비스 통합 테스트
```
1. Google Calendar 동기화:
   - 양방향 동기화 테스트
   - 충돌 해결 시나리오
   - API 쿼터 초과 시 동작
   - 오프라인 → 온라인 전환 시 동기화

2. ML 서버 통신:
   - Kafka 메시지 전달 확인
   - 타임아웃 시나리오 처리
   - ML 서버 다운 시 Fallback
   - 배치 처리 성능 테스트

3. OpenAI API 통합:
   - API 응답 지연 처리
   - 토큰 한도 초과 시나리오
   - 에러 응답 처리
   - 캐싱 동작 확인
```

### Stage 4: 성능 및 부하 테스트
```
1. 동시 사용자 시나리오:
   - 1,000명 동시 접속 테스트
   - 초당 100개 일정 생성 부하
   - GraphQL 쿼리 복잡도 테스트
   - 데이터베이스 커넥션 풀 테스트

2. 대용량 데이터 처리:
   - 사용자당 10,000개 일정 처리
   - 복잡한 패턴 분석 성능
   - 대시보드 로딩 시간
   - 메모리 사용량 모니터링

3. 실시간 기능 스트레스 테스트:
   - 1,000개 동시 WebSocket 연결
   - 초당 500개 실시간 업데이트
   - 메시지 순서 보장 확인
   - 재연결 시나리오

4. ML 모델 추론 성능:
   - 배치 추론 처리량
   - 응답 시간 분포 (P50, P95, P99)
   - 캐시 히트율 측정
   - GPU vs CPU 성능 비교
```

### Stage 5: 장애 복구 시나리오
```
1. 서비스 장애 시나리오:
   - Backend 서버 재시작
   - ML 서버 다운
   - 데이터베이스 연결 끊김
   - Redis 캐시 초기화

2. 네트워크 장애:
   - 간헐적 네트워크 끊김
   - 높은 레이턴시 환경
   - 패킷 손실 시나리오
   - DNS 장애

3. 데이터 일관성:
   - 트랜잭션 롤백 테스트
   - 분산 트랜잭션 실패
   - 이벤트 중복 처리
   - 데이터 복구 시나리오

4. 보안 침해 대응:
   - DDoS 공격 시뮬레이션
   - SQL Injection 시도
   - JWT 토큰 탈취 시나리오
   - Rate Limiting 동작 확인
```

### Stage 6: 모니터링 및 관찰성 검증
```
1. 로그 수집 및 분석:
   - 분산 로그 추적
   - 에러 로그 집계
   - 성능 메트릭 수집
   - 비즈니스 메트릭 추적

2. 알림 시스템:
   - 임계값 도달 시 알림
   - 에스컬레이션 동작
   - 자동 복구 트리거
   - 알림 그룹화

3. 대시보드 검증:
   - 실시간 메트릭 업데이트
   - 히스토리컬 데이터 조회
   - 드릴다운 기능
   - 커스텀 쿼리 실행
```

### Stage 7: 배포 파이프라인 테스트
```
1. Blue-Green 배포:
   - 무중단 배포 검증
   - 트래픽 전환 테스트
   - 롤백 시나리오
   - 데이터베이스 마이그레이션

2. Canary 배포:
   - 점진적 트래픽 증가
   - 메트릭 기반 자동 롤백
   - A/B 테스트 통합
   - 사용자 세그먼트 라우팅

3. 멀티 리전 배포:
   - 리전 간 데이터 동기화
   - 지연 시간 최적화
   - 장애 조치 (Failover)
   - 글로벌 로드 밸런싱
```

## 🚀 실행 가이드

### 로컬 통합 테스트 실행
```bash
# 1. 테스트 환경 준비
cp .env.example .env.test
docker-compose -f docker-compose.test.yml build

# 2. 전체 스택 실행
docker-compose -f docker-compose.test.yml up -d

# 3. 헬스체크 대기
./scripts/wait-for-services.sh

# 4. 테스트 데이터 초기화
./scripts/init-test-data.sh

# 5. 통합 테스트 실행
npm run test:integration

# 6. E2E 테스트 실행
npm run test:e2e

# 7. 성능 테스트 실행
k6 run tests/performance/load-test.js

# 8. 테스트 환경 정리
docker-compose -f docker-compose.test.yml down -v
```

### CI/CD 파이프라인에서 실행
```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Test Environment
        run: |
          cp .env.example .env.test
          docker-compose -f docker-compose.test.yml up -d
          
      - name: Run Integration Tests
        run: |
          ./scripts/wait-for-services.sh
          ./scripts/run-integration-tests.sh
          
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
          
      - name: Cleanup
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v
```

## 📊 테스트 메트릭 목표
- E2E 테스트 성공률: 100%
- API 통합 테스트 커버리지: >90%
- 평균 응답 시간: <200ms (P95)
- 동시 사용자 처리: >1,000
- 시스템 가용성: 99.9%

## 📌 주의사항
- 모든 테스트는 독립적으로 실행 가능해야 함
- 테스트 데이터는 자동으로 생성/정리되어야 함
- 실제 외부 API 호출은 모킹 처리
- 테스트 실패 시 상세한 로그 제공
- 정기적인 테스트 시나리오 업데이트