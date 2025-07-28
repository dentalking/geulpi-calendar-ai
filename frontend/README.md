# Geulpi Calendar Frontend

Next.js 14 기반 스마트 캘린더 프론트엔드

## 시작하기

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
```bash
cp .env.local.example .env.local
# .env.local 파일을 편집하여 실제 값 입력
```

3. GraphQL 타입 생성:
```bash
npm run codegen
```

4. 개발 서버 실행:
```bash
npm run dev
```

## 주요 기능

### 📅 캘린더 뷰
- react-big-calendar 기반 월간/주간/일간 뷰
- 드래그 앤 드롭으로 일정 이동 (예정)
- 시각적으로 개선된 커스텀 스타일

### 💬 자연어 일정 관리
- AI 기반 자연어 처리
- 채팅으로 일정 추가/수정/삭제
- 일정 클릭 시 상세 정보 표시
- 실시간 피드백

### 🚀 실시간 업데이트
- GraphQL Subscription을 통한 실시간 동기화
- 다른 사용자의 일정 변경사항 즉시 반영
- WebSocket 기반 양방향 통신

### 🔐 인증 및 보안
- Google OAuth 2.0 로그인
- JWT 기반 인증
- 보호된 라우트

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Apollo Client
- **Calendar**: react-big-calendar
- **Date**: date-fns
- **GraphQL**: GraphQL Codegen, graphql-ws

## 사용 예시

### 자연어 명령어
- "내일 오후 3시에 회의 추가해줘"
- "다음 주 월요일 점심 약속 잡아줘"
- "오늘 일정 모두 보여줘"
- "선택한 일정 삭제해줘"
- "회의 시간을 오후 4시로 변경해줘"