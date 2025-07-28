# Geulpi Calendar Service - Root Orchestrator

## 핵심 원칙
- schema.graphql은 절대 수정 불가 (Single Source of Truth)
- 모든 서비스는 schema.graphql 기반으로 타입 생성
- Docker Compose로 전체 서비스 통합
- 다른 3개 터미널에서 frontend, backend, ml-server 클로드 동시 실행 중
- **NEW**: AI-Enhanced E2E TDD 워크플로우 활용

## 프로젝트 구조
```
/geulpi-project-1 (현재 위치)
├── schema.graphql (변경 금지)
├── architecture.md (시스템 아키텍처 문서)
├── docker-compose.yml
├── docker-compose.test.yml (E2E 테스트용)
├── .env.example
├── /frontend (별도 클로드 실행 중)
├── /backend (별도 클로드 실행 중)
├── /ml-server (별도 클로드 실행 중)
├── /e2e (🤖 스마트 테스트 분석)
│   ├── analyzers/ (AI 기반 실패 분석)
│   ├── reporters/ (지능형 프롬프트 생성)
│   └── tests/ (E2E 테스트 시나리오)
├── /nginx (Nginx 리버스 프록시)
├── /scripts (설정 및 배포 스크립트)
├── /docs (API 문서 및 가이드)
└── /.github/workflows (CI/CD 설정)
```

## 환경 설정
- Nginx (HTTPS): https://localhost (리다이렉트 → https)
- Nginx (HTTP): http://localhost:80
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/graphql
- ML Server: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Kafka: localhost:9092

## 🤖 AI-Enhanced E2E TDD 시스템

### 스마트 테스팅 명령어
```bash
# AI 기반 스마트 E2E 사이클 (권장)
npm run test:e2e:smart

# 전통적인 피드백 루프
npm run test:e2e:feedback

# 일반 E2E 테스트
npm run test:e2e
```

### AI 시스템 작동 방식
1. **지능형 테스트 실행**: Playwright로 E2E 테스트 실행
2. **MCP 기반 분석**: Context7를 통해 최신 라이브러리 문서 실시간 조회
3. **프롬프트 자동 생성**: 각 서비스별 구체적인 수정 지침 생성
4. **Claude 인스턴스 알림**: 각 서비스의 PROMPT.md 파일에 AI 분석 결과 전달
5. **자동 재테스트**: 수정 완료 후 자동으로 테스트 재실행

### PROMPT.md 파일 처리
- E2E 테스트 실패 시 자동으로 생성됨
- MCP 기반 최신 문서와 모범 사례 포함
- 구체적인 코드 예제와 수정 방법 제시
- 완료 후 반드시 삭제하여 시스템에 완료 신호 전송

## 통합 테스트 전략
1. 각 서비스가 health check 엔드포인트 구현
2. Docker Compose로 전체 시스템 실행
3. AI 기반 지능형 E2E 테스트로 서비스 간 통신 검증
4. 실패 시 자동으로 구체적인 수정 지침 생성

## Git 전략
- main 브랜치에 직접 커밋
- 각 서비스는 독립적으로 커밋 가능
- 통합 테스트 통과 후 태그 생성
- **NEW**: AI 기반 테스트 통과 후 커밋 권장

## 🎯 루트 오케스트레이터 역할
1. **시스템 전체 조율**: 각 서비스 간 일관성 유지
2. **AI 기반 품질 관리**: 스마트 E2E 테스트로 전체 품질 보장
3. **문서 동기화**: architecture.md와 실제 구현 일치성 확인
4. **프롬프트 조율**: 각 서비스의 PROMPT.md 생성 및 모니터링

## ⚡ 빠른 개발 사이클
```bash
# 1. 새 기능 개발 시작
npm run tdd -- --feature new-feature-name

# 2. AI 기반 전체 검증
npm run test:e2e:smart

# 3. 모든 테스트 통과 시 완료
```

이 시스템은 Context7 MCP와 연동하여 실시간으로 최신 라이브러리 문서를 조회하고, 각 서비스의 클로드 인스턴스에게 구체적이고 실행 가능한 수정 지침을 제공합니다.