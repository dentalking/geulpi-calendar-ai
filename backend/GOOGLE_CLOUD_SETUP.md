# Google Cloud Setup Guide for Geulpi Backend

## 현재 설정 상태

✅ **완료된 항목:**
- Project ID: `geulpi-prod`
- Service Account: `geulpi-backend@geulpi-prod.iam.gserviceaccount.com`
- Service Account Key: `geulpi-backend-key.json` (생성됨)
- 활성화된 APIs:
  - Google Calendar API
  - Cloud Vision API
  - Cloud Speech-to-Text API
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Distance Matrix API

## ⚠️ 추가로 필요한 설정

### 1. OAuth2 클라이언트 ID & Secret 확인

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 `geulpi-prod` 선택
3. **APIs & Services** > **Credentials** 이동
4. **OAuth 2.0 Client IDs** 섹션에서 기존 클라이언트 확인
5. 클라이언트 이름 클릭하여 상세 정보 확인:
   - Client ID 복사
   - Client Secret 복사
6. `.env` 파일 업데이트:
   ```env
   GOOGLE_CLIENT_ID=실제-클라이언트-ID
   GOOGLE_CLIENT_SECRET=실제-클라이언트-secret
   ```

### 2. OAuth2 리다이렉트 URI 설정

OAuth2 클라이언트 설정에서 다음 URI들이 추가되어 있는지 확인:
- `http://localhost:3000/auth/callback` (개발용)
- `https://localhost/auth/callback` (개발용 HTTPS)
- `https://geulpi.com/auth/callback` (프로덕션용 - 도메인에 맞게 수정)

### 3. API 키 확인

1. **APIs & Services** > **Credentials** > **API Keys**
2. 기존 API 키 클릭하여 키 값 복사
3. `.env` 파일 업데이트:
   ```env
   GOOGLE_API_KEY=실제-API-키
   ```

### 4. OAuth 동의 화면 설정 확인

1. **APIs & Services** > **OAuth consent screen**
2. 다음 항목들이 설정되어 있는지 확인:
   - App name: Geulpi Calendar
   - User support email
   - Authorized domains: localhost (개발용)
   - Scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/calendar`

### 5. 서비스 계정 권한 확인

`geulpi-backend@geulpi-prod.iam.gserviceaccount.com` 서비스 계정에 다음 역할이 부여되어 있는지 확인:
- Cloud Vision API User
- Cloud Speech-to-Text User
- Service Account Token Creator (필요시)

확인 명령어:
```bash
gcloud projects get-iam-policy geulpi-prod \
  --filter="bindings.members:serviceAccount:geulpi-backend@geulpi-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### 6. API 할당량 및 청구 확인

1. **APIs & Services** > **Dashboard**
2. 각 API의 사용량 및 할당량 확인
3. **Billing** 섹션에서 청구 계정이 연결되어 있는지 확인

## 로컬 개발 환경 테스트

1. 환경 변수 설정 확인:
   ```bash
   cd backend
   source .env  # 또는 환경에 맞는 방법으로 환경 변수 로드
   ```

2. Google Cloud 인증 테스트:
   ```bash
   gcloud auth application-default print-access-token
   ```

3. Spring Boot 애플리케이션 실행:
   ```bash
   ./gradlew bootRun
   ```

## 문제 해결

### 인증 오류 발생 시
```bash
# Application Default Credentials 재설정
gcloud auth application-default login

# 서비스 계정 키 재생성
gcloud iam service-accounts keys create ./geulpi-backend-key-new.json \
  --iam-account=geulpi-backend@geulpi-prod.iam.gserviceaccount.com
```

### API 활성화 확인
```bash
# 특정 API 활성화 상태 확인
gcloud services list --enabled | grep "calendar"

# API 활성화 (필요시)
gcloud services enable calendar-json.googleapis.com
```

## 보안 주의사항

1. **절대 커밋하지 말아야 할 파일들:**
   - `geulpi-backend-key.json`
   - `.env` 파일
   - 모든 API 키와 시크릿

2. **프로덕션 배포 시:**
   - 서비스 계정 키 대신 Workload Identity 사용 권장
   - 환경 변수는 Secret Manager 사용
   - API 키에 IP 제한 설정

## 다음 단계

1. `.env` 파일의 TODO 항목들을 실제 값으로 업데이트
2. Spring Boot 애플리케이션 실행 및 테스트
3. Google OAuth2 로그인 플로우 테스트
4. 각 Google API 연동 테스트 (Calendar, Vision, Speech)