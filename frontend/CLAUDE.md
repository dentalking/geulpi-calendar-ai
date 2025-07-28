# Geulpi Calendar Service - Frontend

## 핵심 원칙
- ../schema.graphql을 절대 수정하지 않고 참조만 함
- GraphQL Codegen으로 타입 자동 생성
- Next.js 14 App Router 사용
- 좌측 캘린더 + 우측 채팅 UI 구조

## 기술 스택
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Apollo Client (GraphQL)
- react-big-calendar
- next-auth (Google OAuth)

## 개발 규칙
1. 모든 GraphQL 쿼리는 .graphql 파일로 분리
2. Codegen으로 생성된 타입만 사용
3. 서버 컴포넌트 우선, 필요시만 클라이언트 컴포넌트
4. 실시간 업데이트는 GraphQL Subscription 사용

## API 연동
- GraphQL Endpoint: http://localhost:8080/graphql
- WebSocket: ws://localhost:8080/graphql
- 인증: Bearer token in Authorization header

## UI/UX 원칙
- 모든 상호작용은 캘린더와 채팅으로 완결
- 드래그 앤 드롭 최소화, 대화형 인터페이스 우선
- 실시간 피드백 (optimistic UI)
- 토스처럼 단순하고 직관적인 디자인

## 현재 구현 상태
### ✅ 완료된 기능
- Google OAuth 로그인 (next-auth)
- 캘린더 뷰 (react-big-calendar)
- 채팅 UI 컴포넌트
- GraphQL 클라이언트 설정
- 온보딩 플로우 (라이프 영역 설정)
- 대시보드 (시간 분석, AI 인사이트)
- PWA 기본 설정 (manifest.json, service worker)
- 에러 바운더리 및 로딩 상태
- 접근성 기본 지원

### ⚠️ 구현 필요 기능
- 채팅으로 일정 생성/수정/삭제 (핵심)
- GraphQL Subscription 실시간 동기화
- AI 응답 스트리밍
- 이미지 업로드 및 OCR 연동
- 오프라인 동기화 및 충돌 해결

## 최종 디렉토리 구조
```
frontend/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # 인증 관련 라우트 그룹
│   │   ├── login/           # 로그인 페이지
│   │   └── auth/            # OAuth 콜백 처리
│   │       └── callback/
│   ├── (protected)/         # 인증 필수 라우트 그룹
│   │   ├── calendar/        # 메인 캘린더 페이지
│   │   ├── dashboard/       # 대시보드 페이지
│   │   └── onboarding/      # 온보딩 플로우
│   ├── api/                 # API 라우트
│   │   └── auth/            # NextAuth API
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 랜딩 페이지
│   └── globals.css          # 전역 스타일
│
├── components/              # 재사용 가능한 컴포넌트
│   ├── calendar/           # 캘린더 관련 컴포넌트
│   │   ├── Calendar.tsx    # 메인 캘린더 뷰
│   │   ├── EventCard.tsx   # 일정 카드
│   │   └── EventForm.tsx   # 일정 입력 폼
│   ├── chat/               # 채팅 관련 컴포넌트
│   │   ├── Chat.tsx        # 기본 채팅 UI
│   │   ├── ChatWithOCR.tsx # OCR 기능 포함 채팅
│   │   ├── MessageList.tsx # 메시지 목록
│   │   └── MessageInput.tsx# 메시지 입력
│   ├── dashboard/          # 대시보드 컴포넌트
│   │   ├── TimeBalance.tsx # 시간 밸런스 차트
│   │   ├── Insights.tsx    # AI 인사이트
│   │   └── Analytics.tsx   # 분석 차트
│   ├── onboarding/         # 온보딩 컴포넌트
│   │   ├── LifeAreasStep.tsx
│   │   ├── BalanceStep.tsx
│   │   └── SuggestionsStep.tsx
│   ├── common/             # 공통 컴포넌트
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingStates.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── ProtectedRoute.tsx
│   └── ui/                 # shadcn/ui 컴포넌트
│
├── lib/                    # 라이브러리 및 유틸리티
│   ├── apollo/            # Apollo Client 설정
│   │   ├── client.ts      # Apollo Client 인스턴스
│   │   ├── cache.ts       # 캐시 설정
│   │   └── links.ts       # HTTP/WS 링크 설정
│   ├── auth/              # 인증 관련
│   │   ├── config.ts      # NextAuth 설정
│   │   └── utils.ts       # 인증 유틸리티
│   └── utils.ts           # 공통 유틸리티
│
├── hooks/                 # 커스텀 훅
│   ├── useAuth.ts         # 인증 관련 훅
│   ├── useCalendar.ts     # 캘린더 관련 훅
│   ├── useChat.ts         # 채팅 관련 훅
│   ├── useSubscription.ts # GraphQL 구독 훅
│   └── useOnlineStatus.ts # 온라인 상태 훅
│
├── graphql/               # GraphQL 쿼리/뮤테이션/구독
│   ├── fragments/         # 재사용 가능한 프래그먼트
│   │   ├── event.graphql
│   │   └── user.graphql
│   ├── queries/           # 쿼리
│   │   ├── events.graphql
│   │   ├── dashboard.graphql
│   │   └── user.graphql
│   ├── mutations/         # 뮤테이션
│   │   ├── auth.graphql
│   │   ├── chat.graphql
│   │   ├── events.graphql
│   │   └── onboarding.graphql
│   └── subscriptions/     # 구독
│       ├── events.graphql
│       └── chat.graphql
│
├── generated/             # GraphQL Codegen 생성 파일
│   ├── graphql.tsx        # 타입 및 훅
│   └── introspection.json # 스키마 인트로스펙션
│
├── styles/                # 스타일 파일
│   ├── calendar.css       # 캘린더 커스텀 스타일
│   ├── accessibility.css  # 접근성 스타일
│   └── animations.css     # 애니메이션
│
├── utils/                 # 유틸리티 함수
│   ├── date.ts            # 날짜 관련 유틸
│   ├── event.ts           # 일정 관련 유틸
│   ├── accessibility.ts   # 접근성 유틸
│   ├── performance.ts     # 성능 측정 유틸
│   └── serviceWorker.ts   # SW 관련 유틸
│
├── contexts/              # React Context
│   ├── AuthContext.tsx    # 인증 컨텍스트
│   ├── ThemeContext.tsx   # 테마 컨텍스트
│   └── OfflineContext.tsx # 오프라인 컨텍스트
│
├── types/                 # TypeScript 타입 정의
│   ├── auth.d.ts          # 인증 관련 타입
│   ├── calendar.d.ts      # 캘린더 관련 타입
│   └── global.d.ts        # 전역 타입
│
├── public/                # 정적 파일
│   ├── manifest.json      # PWA 매니페스트
│   ├── sw.js              # Service Worker
│   ├── icons/             # 앱 아이콘
│   └── images/            # 이미지 파일
│
├── tests/                 # 테스트 파일
│   ├── unit/              # 단위 테스트
│   ├── integration/       # 통합 테스트
│   └── e2e/               # E2E 테스트
│
└── 설정 파일들
    ├── .env.local         # 환경 변수
    ├── .env.example       # 환경 변수 예시
    ├── next.config.js     # Next.js 설정
    ├── tsconfig.json      # TypeScript 설정
    ├── codegen.ts         # GraphQL Codegen 설정
    ├── tailwind.config.ts # Tailwind 설정
    ├── jest.config.js     # Jest 설정
    └── playwright.config.ts # Playwright 설정
```

## 개발 명령어
```bash
# 개발 서버 실행
npm run dev

# GraphQL 타입 생성 (schema 변경 시)
npm run codegen

# 타입 체크 (추가 필요)
npm run typecheck

# 린트
npm run lint

# 빌드
npm run build
```

## GraphQL 사용 패턴
### 쿼리 작성 (graphql/*.graphql)
```graphql
# graphql/chat.graphql
mutation ChatWithEventManagement($input: String!) {
  chatWithEventManagement(input: $input) {
    message
    events {
      id
      title
      startTime
      endTime
    }
  }
}
```

### 컴포넌트에서 사용
```typescript
import { useChatWithEventManagementMutation } from '@/generated/graphql';

const [sendMessage] = useChatWithEventManagementMutation({
  refetchQueries: ['GetEvents'],
  optimisticResponse: { ... }
});
```

## 다음 작업 우선순위
1. **채팅 기반 일정 관리** - ChatWithOCR 컴포넌트 완성
2. **실시간 동기화** - GraphQL Subscription 설정
3. **AI 스트리밍** - 타이핑 인디케이터 및 부분 응답
4. **오프라인 지원** - Service Worker 고도화

더 자세한 구현 가이드는 prompt.md 참조