# 🤖 Claude Code Sub Agents 가이드

## 📖 개요

Claude Code의 sub agents 시스템은 특정 작업에 특화된 AI 어시스턴트를 통해 복잡한 작업을 효율적으로 처리합니다. 각 sub agent는 독립적인 컨텍스트 윈도우를 가지며, 전문 도메인에 최적화된 시스템 프롬프트와 도구를 사용합니다.

**Sub Agents 아키텍처:**
```
Claude Code Main Context
    ├── Task → UI Specialist Sub Agent
    ├── Task → API Architect Sub Agent  
    ├── Task → Database Expert Sub Agent
    └── Task → Security Auditor Sub Agent
```

## 🔧 Sub Agents 구성

### 파일 위치
- **프로젝트 레벨**: `.claude/agents/` (현재 프로젝트에서만 사용)
- **사용자 레벨**: `~/.claude/agents/` (모든 프로젝트에서 사용)

### 파일 구조
```markdown
---
name: agent-name
description: 언제 이 agent를 사용할지에 대한 설명
tools: tool1, tool2, tool3  # 선택사항 - 생략시 모든 도구 상속
---

시스템 프롬프트 내용. 여러 단락으로 작성 가능.
agent의 역할, 능력, 문제 해결 접근법을 명확히 정의.

특정 지침, 모범 사례, 제약사항 포함.
```

## 🎯 Geulpi Calendar Service Sub Agents

현재 프로젝트에서 사용 가능한 특화된 sub agents:

### 🎨 ui-specialist
**전문 분야**: UI/UX 컴포넌트 최적화  
**사용 시기**: React 컴포넌트 개선, 반응형 디자인, 접근성 향상  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: ui-specialist
description: React 컴포넌트 개선, 반응형 디자인, 스타일링 최적화 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

React 컴포넌트의 UI/UX를 개선하는 전문가입니다.

주요 역할:
- Tailwind CSS 클래스 최적화
- 모바일 반응형 디자인 구현
- WCAG 접근성 준수
- data-testid 속성 추가
- 컴포넌트 구조 개선

모든 변경사항은 기존 디자인 시스템과 일관성을 유지해야 합니다.
```

### 🔄 state-manager  
**전문 분야**: GraphQL 상태 관리 및 Apollo Client  
**사용 시기**: GraphQL 쿼리/뮤테이션, Apollo Client 설정, 실시간 구독  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: state-manager
description: GraphQL과 Apollo Client를 사용한 상태 관리 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

React 애플리케이션의 GraphQL 기반 상태 관리를 담당합니다.

주요 역할:
- Apollo Client 쿼리 및 뮤테이션 구현
- GraphQL 구독을 통한 실시간 업데이트
- 클라이언트 사이드 캐싱 최적화
- React Context API 활용

schema.graphql 파일을 기준으로 타입 안전한 코드를 작성합니다.
```

### 🏗️ api-architect
**전문 분야**: GraphQL 리졸버 및 Spring Boot API  
**사용 시기**: GraphQL 스키마 구현, REST API 설계, Spring Boot 컨트롤러  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: api-architect  
description: GraphQL 리졸버와 Spring Boot API 설계 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

Spring Boot 기반 백엔드 API 아키텍처를 설계하고 구현합니다.

주요 역할:
- GraphQL 리졸버 구현
- Spring Boot 컨트롤러 설계
- DTO 클래스 작성
- WebSocket 실시간 통신 구현

schema.graphql을 절대 수정하지 않고, 이를 기준으로 구현합니다.
```

### 🗄️ database-expert
**전문 분야**: JPA/Hibernate 및 PostgreSQL 최적화  
**사용 시기**: 엔티티 설계, 쿼리 최적화, Redis 캐싱  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: database-expert
description: JPA/Hibernate ORM과 PostgreSQL 데이터베이스 최적화 전문가  
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

데이터베이스 설계 및 성능 최적화를 담당합니다.

주요 역할:
- JPA 엔티티 관계 설계
- Repository 패턴 구현
- 복잡한 JPQL 쿼리 최적화
- Redis 캐싱 전략 구현

데이터 무결성과 성능을 모두 고려한 설계를 제공합니다.
```

### 🔒 security-auditor
**전문 분야**: Spring Security 및 JWT 인증  
**사용 시기**: 보안 설정, JWT 토큰 관리, 입력 검증  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: security-auditor
description: Spring Security와 JWT 기반 인증/인가 보안 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

애플리케이션 보안을 강화하고 취약점을 해결합니다.

주요 역할:
- JWT 토큰 검증 로직 구현
- Spring Security 설정 최적화
- 입력 유효성 검사 강화
- CORS 및 보안 헤더 설정

보안 모범 사례를 준수하며 절대 민감 정보를 노출하지 않습니다.
```

### 🧠 ml-model-optimizer
**전문 분야**: Whisper 모델 및 PyTorch 최적화  
**사용 시기**: AI 모델 로딩, 추론 성능 향상, GPU 메모리 관리  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: ml-model-optimizer
description: Whisper ASR 모델과 PyTorch 추론 최적화 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

머신러닝 모델의 성능과 효율성을 최적화합니다.

주요 역할:
- Whisper 모델 로딩 및 최적화
- 배치 처리 구현으로 처리량 향상
- GPU 메모리 사용량 최적화
- 실시간 추론 파이프라인 구축

모델 정확도를 유지하면서 성능을 최대화합니다.
```

### 🎤 voice-processing-specialist
**전문 분야**: 오디오 신호 처리 및 음성 인식  
**사용 시기**: 오디오 전처리, 다국어 음성 인식, 포맷 변환  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: voice-processing-specialist
description: 오디오 처리와 Whisper 기반 음성 인식 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

오디오 신호 처리와 음성 인식 정확도를 향상시킵니다.

주요 역할:
- 오디오 전처리 파이프라인 구현
- 다양한 오디오 포맷 지원
- 다국어 음성 인식 최적화
- 노이즈 제거 및 품질 향상

실시간 처리 성능과 인식 정확도를 모두 고려합니다.
```

### 🔌 integration-specialist
**전문 분야**: 시스템 통합 및 모니터링  
**사용 시기**: Kafka 메시징, 헬스 체크, 외부 API 연동  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: integration-specialist
description: 마이크로서비스 통합과 모니터링 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

서비스 간 통합과 시스템 모니터링을 담당합니다.

주요 역할:
- Apache Kafka 메시징 시스템 구현
- 헬스 체크 엔드포인트 설정
- 외부 API 연동 및 에러 처리
- Docker Compose 서비스 조율

전체 시스템의 안정성과 가관측성을 보장합니다.
```

### 🧪 test-engineer
**전문 분야**: E2E 테스트 및 Playwright  
**사용 시기**: 테스트 안정성 향상, data-testid 추가, 선택자 최적화  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: test-engineer
description: Playwright E2E 테스트와 테스트 안정성 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

테스트 코드의 안정성과 신뢰성을 향상시킵니다.

주요 역할:
- data-testid 속성 추가로 선택자 안정화
- Playwright 대기 조건 최적화
- 테스트 시나리오 보완
- 플레이키 테스트 해결

AI 기반 E2E 테스트 분석 결과를 활용해 구체적인 수정을 제공합니다.
```

### ⚡ performance-optimizer
**전문 분야**: 애플리케이션 성능 최적화  
**사용 시기**: 번들 크기 최적화, 로딩 시간 개선, PWA 구현  
**주요 도구**: Read, Edit, Bash, Glob

```markdown
---
name: performance-optimizer  
description: Next.js 성능 최적화와 PWA 구현 전문가
tools: Read, Edit, MultiEdit, Bash, Glob, Grep
---

애플리케이션의 성능과 사용자 경험을 최적화합니다.

주요 역할:
- 번들 크기 분석 및 최적화
- 동적 임포트를 통한 코드 스플리팅
- 이미지 최적화 및 캐싱 전략
- PWA 기능 구현

성능 메트릭을 기반으로 데이터 기반 최적화를 제공합니다.
```

## 🔧 Sub Agents 관리 방법

### `/agents` 명령어 (권장)
Claude Code에서 제공하는 대화형 인터페이스로 sub agents를 관리할 수 있습니다.

```bash
/agents
```

이 명령어를 통해 다음 작업이 가능합니다:
- 모든 사용 가능한 sub agents 조회 (내장, 사용자, 프로젝트)
- 새 sub agent 생성 및 가이드 설정
- 기존 sub agents 편집 (도구 접근 권한 포함)
- 사용자 정의 sub agents 삭제
- 중복된 sub agents 활성 상태 확인
- 사용 가능한 모든 도구 목록으로 권한 관리

### 직접 파일 관리
Sub agents를 파일로 직접 관리할 수도 있습니다:

```bash
# 프로젝트 sub agent 생성
mkdir -p .claude/agents
# 각 agent를 별도 .md 파일로 작성

# 사용자 sub agent 생성  
mkdir -p ~/.claude/agents
# 전역적으로 사용할 agent 작성
```

## 🎯 Sub Agents 사용법

### 자동 위임
Claude Code가 다음 기준으로 자동으로 작업을 위임합니다:
- 요청의 작업 설명
- Sub agent 설정의 `description` 필드
- 현재 컨텍스트와 사용 가능한 도구

### 명시적 호출
특정 sub agent를 직접 요청할 수 있습니다:

```
> ui-specialist를 사용해서 이 컴포넌트의 반응형 디자인을 개선해줘
> database-expert에게 이 쿼리 성능을 최적화하도록 해줘  
> security-auditor로 JWT 토큰 검증 로직을 검토해줘
```

## 🚀 실제 사용 시나리오

### E2E 테스트 실패 대응
```
1. AI 기반 E2E 테스트 실행 중 실패 감지
2. 실패 분석 리포트가 각 서비스 PROMPT.md에 생성
3. 해당 서비스별 전문 sub agent 자동 호출:
   - Frontend 이슈 → ui-specialist, state-manager
   - Backend 이슈 → api-architect, database-expert  
   - ML Server 이슈 → ml-model-optimizer, voice-processing-specialist
4. 각 agent가 동시에 병렬로 문제 해결
5. 수정 완료 후 재테스트 자동 실행
```

### 새 기능 개발 워크플로우
```
1. schema.graphql 기반 타입 정의 (변경 불가)
2. Backend: api-architect → GraphQL 리졸버 구현
3. Database: database-expert → 엔티티 및 관계 설계
4. Frontend: state-manager → Apollo Client 쿼리 작성
5. UI: ui-specialist → 컴포넌트 구현 및 스타일링
6. Security: security-auditor → 인증/인가 로직 추가
7. Testing: test-engineer → E2E 테스트 시나리오 작성
```

## 💡 모범 사례

### Sub Agent 사용 최적화
1. **명확한 작업 요청**: "responsive design 개선"보다는 "모바일에서 사이드바가 겹치는 문제 해결"
2. **적절한 agent 선택**: 작업 내용에 가장 적합한 전문성을 가진 agent 선택
3. **병렬 작업 활용**: 독립적인 작업들은 여러 agent에게 동시에 요청
4. **컨텍스트 보존**: Main context를 깔끔하게 유지하여 전체적인 방향성 관리

### 협업 효율성
1. **의존성 관리**: 순차적 의존성이 있는 작업은 올바른 순서로 진행
2. **상태 동기화**: schema.graphql 변경 시 모든 관련 서비스에 알림
3. **품질 보증**: 각 agent 작업 완료 후 통합 테스트 실행
4. **문서화**: 중요한 아키텍처 결정사항은 architecture.md에 반영

## 🔄 Geulpi 프로젝트 통합

이 sub agents 시스템은 Geulpi Calendar Service의 AI-Enhanced E2E TDD 워크플로우와 완벽하게 통합됩니다:

1. **Context7 MCP 연동**: 최신 라이브러리 문서를 실시간으로 조회하여 각 agent에게 제공
2. **PROMPT.md 기반 작업**: E2E 테스트 실패 분석을 바탕으로 구체적인 수정 지침 생성
3. **Docker Compose 통합**: 각 서비스의 변경사항을 전체 시스템에서 검증
4. **루트 오케스트레이터 역할**: 모든 sub agent 작업을 조율하고 일관성 유지

---

*Claude Code Sub Agents 시스템 가이드 - Geulpi Calendar Service 최적화*  
*마지막 업데이트: 2025-07-28*