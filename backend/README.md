# Geulpi Calendar Backend

## Google OAuth2 설정

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Credentials" 메뉴로 이동
4. "Create Credentials" > "OAuth client ID" 선택
5. Application type: "Web application" 선택
6. 다음 설정 추가:
   - Authorized JavaScript origins: `http://localhost:8080`
   - Authorized redirect URIs: `http://localhost:8080/oauth2/callback/google`
7. Client ID와 Client Secret 저장

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용 추가:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret-key-minimum-512-bits
```

JWT Secret 생성:
```bash
./gradlew run --args="com.geulpi.calendar.util.JwtSecretGenerator"
```

### 3. 애플리케이션 실행

```bash
./gradlew bootRun
```

## API 엔드포인트

### 인증
- `GET /auth/google` - Google OAuth2 로그인 시작
- `GET /auth/me` - 현재 사용자 정보 조회
- `POST /auth/validate` - JWT 토큰 검증
- `POST /auth/refresh` - JWT 토큰 갱신

### GraphQL
- `POST /graphql` - GraphQL 엔드포인트
- `GET /graphiql` - GraphQL Playground (개발 환경)

## OAuth2 플로우

1. 클라이언트가 `/auth/google`로 리다이렉트
2. 사용자가 Google 로그인 완료
3. Google이 `/oauth2/callback/google`로 콜백
4. 서버가 JWT 토큰 생성
5. 클라이언트를 `http://localhost:3000/auth/callback?token=JWT_TOKEN`으로 리다이렉트
6. 클라이언트가 토큰을 저장하고 이후 요청에 사용

## 개발 환경 요구사항

- Java 17
- PostgreSQL 14+
- Redis 6+
- Kafka (선택사항)