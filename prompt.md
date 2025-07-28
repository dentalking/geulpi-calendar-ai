# Master Prompt Cycle System

## 준비 단계
1. /geulpi-project-1 폴더에 schema.graphql 저장
2. 4개의 IntelliJ 창 열기
3. 각 창에서 해당 폴더로 이동 후 claude 실행

## CYCLE 1: 프로젝트 초기화 (모든 터미널 동시)

### Root Terminal
```
schema.graphql 파일을 읽고 Docker Compose 환경을 구성해줘. PostgreSQL, Redis, 그리고 3개 서비스(frontend:3000, backend:8080, ml-server:8000)를 포함해야 해. .env.example 파일도 만들어줘. use context7. Let's think step by step.
```

### Frontend Terminal
```
../schema.graphql을 기반으로 Next.js 14 프로젝트를 초기화해줘. App Router를 사용하고, GraphQL Codegen 설정을 포함해야 해. 기본 레이아웃은 좌측 캘린더, 우측 채팅 구조로 만들어줘. use context7. Let's think step by step.
```

### Backend Terminal
```
../schema.graphql을 구현하는 Spring Boot 3.x 프로젝트를 생성해줘. Spring GraphQL, Security, JPA를 포함하고, 모든 GraphQL 타입에 대한 Entity와 Resolver를 생성해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
FastAPI 프로젝트를 초기화하고 ../schema.graphql의 ML 관련 기능을 위한 엔드포인트를 만들어줘. Event 분류, 일정 최적화, 패턴 분석을 위한 더미 모델을 포함해줘. use context7. Let's think step by step.
```

## CYCLE 2: 인증 및 기본 연동

### Backend Terminal
```
Google OAuth 2.0 전체 플로우를 구현해줘. /auth/google, /auth/google/callback 엔드포인트를 만들고 JWT 발급 후 프론트엔드로 리다이렉트해줘. User 생성 및 조회가 가능해야 해. use context7. Let's think step by step.
```

### Frontend Terminal
```
Google OAuth 로그인 버튼을 만들고 백엔드 /auth/google로 리다이렉트해줘. 백엔드에서 JWT를 받아 저장하고 Apollo Client에 인증 헤더를 설정해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
Kafka consumer를 설정하고 백엔드에서 오는 요청을 처리할 수 있게 해줘. Health check 엔드포인트도 추가해줘. use context7. Let's think step by step.
```

### Root Terminal
```
모든 서비스의 health check를 확인하는 스크립트를 만들어줘. docker-compose up으로 전체 시스템이 실행되는지 확인해줘. use context7. Let's think step by step.
```

## CYCLE 3: 핵심 기능 구현

### Backend Terminal
```
Google Calendar API 연동을 구현해줘. 사용자의 기존 일정을 가져오고 Event 타입으로 변환하는 로직을 추가해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
Event 분류 모델을 구현해줘. 일정 제목과 시간을 기반으로 LifeArea를 예측하는 Random Forest 모델을 만들어줘. use context7. Let's think step by step.
```

### Frontend Terminal
```
캘린더 뷰를 구현하고 GraphQL subscription으로 실시간 업데이트를 받도록 해줘. 이벤트 클릭 시 상세 정보가 채팅창에 표시되게 해줘. use context7. Let's think step by step.
```

### Root Terminal
```
서비스 간 통신을 테스트하는 통합 테스트를 작성해줘. 로그인 → 일정 조회 → ML 분류 전체 플로우를 검증해줘. use context7. Let's think step by step.
```

## CYCLE 4: 채팅 인터페이스

### Frontend Terminal
```
채팅 인터페이스를 완성해줘. 자연어 입력을 받아 백엔드로 전송하고, AI 응답을 스트리밍으로 표시해줘. 제안된 일정은 캘린더에 미리보기로 표시해줘. use context7. Let's think step by step.
```

### Backend Terminal
```
processNaturalLanguage mutation을 구현해줘. OpenAI API를 사용해 의도를 파악하고, ML 서버와 협력해 일정을 생성/수정해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
일정 최적화 엔진을 구현해줘. 사용자의 목표 균형과 현재 일정을 비교해 최적의 시간대를 제안하는 XGBoost 모델을 만들어줘. use context7. Let's think step by step.
```

### Root Terminal
```
채팅을 통한 일정 관리 시나리오를 테스트해줘. "내일 오후에 회의 잡아줘" 같은 자연어 명령이 제대로 처리되는지 확인해줘. use context7. Let's think step by step.
```

## CYCLE 5: 온보딩 구현

### Frontend Terminal
```
온보딩 플로우를 구현해줘. Google 연동 → 삶의 영역 설정 → 이상적 균형 설정 → 첫 제안 표시 순서로 진행되게 해줘. use context7. Let's think step by step.
```

### Backend Terminal
```
completeOnboarding mutation을 구현하고, 사용자의 기존 캘린더 데이터를 분석해 초기 패턴을 생성해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
과거 일정 데이터에서 패턴을 찾는 클러스터링 모델을 구현해줘. 사용자의 행동 패턴을 자동으로 발견해줘. use context7. Let's think step by step.
```

### Root Terminal
```
온보딩 전체 플로우를 테스트하고, 새 사용자가 5분 안에 서비스를 시작할 수 있는지 확인해줘. use context7. Let's think step by step.
```

## CYCLE 6: 분석 및 인사이트

### Backend Terminal
```
timeBalance와 insights 쿼리를 구현해줘. 주간/월간 리포트를 생성하고 사용자에게 의미 있는 인사이트를 제공해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
번아웃 위험도 예측 모델을 구현해줘. 일정 밀도, 휴식 시간, 야근 패턴을 분석해 경고를 생성해줘. use context7. Let's think step by step.
```

### Frontend Terminal
```
대시보드 뷰를 추가해 시간 균형을 시각화하고, AI 인사이트를 카드 형태로 표시해줘. 클릭 시 관련 액션을 수행할 수 있게 해줘. use context7. Let's think step by step.
```

### Root Terminal
```
1주일 치 더미 데이터를 생성하고, 분석 기능이 정확한 인사이트를 제공하는지 검증해줘. use context7. Let's think step by step.
```

## CYCLE 7: 고급 기능

### Frontend Terminal
```
OCR 기능을 구현해줘. 이미지를 드래그 앤 드롭하면 백엔드로 전송하고, 추출된 일정을 미리보기로 표시해줘. use context7. Let's think step by step.
```

### Backend Terminal
```
processOCR과 processSpeech mutation을 구현해줘. 이미지와 음성에서 일정 정보를 추출하고 Event로 변환해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
모든 ML 모델의 성능을 최적화하고, A/B 테스트를 위한 모델 버전 관리 시스템을 구축해줘. use context7. Let's think step by step.
```

### Root Terminal
```
프로덕션 배포를 위한 설정을 추가해줘. 환경변수 관리, 로깅, 모니터링 설정을 포함해줘. use context7. Let's think step by step.
```

## CYCLE 8: 최종 통합 및 최적화

### Root Terminal
```
전체 시스템의 성능을 테스트하고 병목 지점을 찾아줘. 응답 시간이 느린 부분을 최적화해줘. use context7. Let's think step by step.
```

### Frontend Terminal
```
UI/UX를 최종 점검하고, 로딩 상태, 에러 처리, 오프라인 대응을 완성해줘. Lighthouse 점수 90점 이상을 목표로 최적화해줘. use context7. Let's think step by step.
```

### Backend Terminal
```
캐싱 전략을 구현하고, 자주 사용되는 쿼리를 최적화해줘. Rate limiting과 보안 설정을 최종 점검해줘. use context7. Let's think step by step.
```

### ML Server Terminal
```
모델 재학습 파이프라인을 구축하고, 실시간 추론 성능이 100ms 이하가 되도록 최적화해줘. use context7. Let's think step by step.
```

## 사용 방법
1. 각 사이클을 순서대로 진행
2. 모든 터미널에 동시에 프롬프트 입력
3. 각 클로드가 작업 완료하면 다음 사이클로 진행
4. 문제 발생 시 해당 터미널에서 디버깅 후 계속 진행

## 주의사항
- schema.graphql은 절대 수정하지 않음
- 각 클로드는 다른 서비스의 진행 상황을 모르므로, 의존성이 있는 작업은 순서 지켜서 진행
- 통합 테스트는 Root 터미널에서만 실행
- 각 사이클 완료 후 git commit 권장