# 🚀 Vercel 환경 변수 설정 가이드

## 📋 환경 변수 체크리스트

### 1. 필수 환경 변수

| 변수명 | 설명 | 예시 값 | 획득 방법 |
|--------|------|---------|-----------|
| `NEXTAUTH_URL` | NextAuth 기본 URL | `https://geulpi-calendar-ai.vercel.app` | Vercel 배포 후 자동 생성된 URL |
| `NEXTAUTH_SECRET` | NextAuth 암호화 키 | `K9Xy3mPqR5vN8wZ2aF6jH1sT4uL7bC0e` | `openssl rand -base64 32` 명령어로 생성 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `123456789012-xxxxx.apps.googleusercontent.com` | Google Cloud Console에서 생성 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 | `GOCSPX-xxxxxxxxxxxx` | Google Cloud Console에서 생성 |

### 2. API 연결 환경 변수

| 변수명 | 설명 | 개발 값 | 프로덕션 값 |
|--------|------|---------|-------------|
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL 엔드포인트 | `http://localhost:8080/graphql` | `https://api.geulpi.com/graphql` |
| `NEXT_PUBLIC_API_URL` | REST API 주소 | `http://localhost:8080` | `https://api.geulpi.com` |
| `NEXT_PUBLIC_GRAPHQL_WS_URL` | WebSocket URL | `ws://localhost:8080/graphql` | `wss://api.geulpi.com/graphql` |

### 3. 선택적 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_ML_SERVER_URL` | ML 서버 주소 | `http://localhost:8000` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | 없음 |
| `SENTRY_DSN` | 에러 트래킹 | 없음 |

## 🔧 Vercel에서 설정하는 방법

### Step 1: Vercel 프로젝트 대시보드
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 (geulpi-calendar-ai)
3. Settings 탭 클릭

### Step 2: Environment Variables 섹션
1. 좌측 메뉴에서 "Environment Variables" 클릭
2. 각 변수 추가:
   - Key: 변수명 입력
   - Value: 값 입력
   - Environment: Production, Preview, Development 선택
   - "Add" 클릭

### Step 3: 환경별 설정
```
Production (필수):
- NEXTAUTH_URL=https://geulpi-calendar-ai.vercel.app
- NEXTAUTH_SECRET=운영용_시크릿_키
- GOOGLE_CLIENT_ID=운영용_구글_ID
- GOOGLE_CLIENT_SECRET=운영용_구글_시크릿

Preview (선택):
- NEXTAUTH_URL=https://geulpi-calendar-ai-preview.vercel.app
- 나머지는 Production과 동일

Development (로컬 개발용):
- NEXTAUTH_URL=http://localhost:3000
- 개발용 Google OAuth 인증 정보
```

## 🚨 중요 보안 사항

1. **절대 커밋하지 말아야 할 것들:**
   - API 키
   - 시크릿 키
   - 데이터베이스 비밀번호

2. **Google OAuth 리디렉션 URI 설정:**
   ```
   Google Cloud Console에서 반드시 추가:
   - https://your-app.vercel.app/api/auth/callback/google
   - https://your-app-*.vercel.app/api/auth/callback/google (Preview용)
   ```

3. **NEXTAUTH_SECRET 생성:**
   ```bash
   # macOS/Linux
   openssl rand -base64 32
   
   # 또는 Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## 🎯 v5.0 AI 시스템과의 연동

환경 변수 설정 후:
1. Vercel이 자동으로 재배포 시작
2. 배포 완료되면 실제 URL로 접속 가능
3. AI가 코드를 수정하면 자동으로 Preview 배포
4. main 브랜치에 머지하면 Production 배포

## 📝 테스트 체크리스트

✅ Google 로그인 버튼이 나타나는가?
✅ 로그인 클릭 시 Google OAuth 화면이 뜨는가?
✅ 로그인 성공 후 대시보드로 리디렉션되는가?
✅ 새로고침해도 로그인 상태가 유지되는가?

## 🆘 문제 해결

### "Invalid redirect_uri" 에러
→ Google Cloud Console에서 리디렉션 URI 추가

### "NEXTAUTH_URL mismatch" 에러
→ Vercel 환경 변수의 URL과 실제 접속 URL이 일치하는지 확인

### 로그인 후 로컬호스트로 리디렉션
→ NEXTAUTH_URL이 production URL로 설정되었는지 확인