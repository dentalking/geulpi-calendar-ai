# Geulpi Calendar Service - Backend

## 핵심 원칙
- ../schema.graphql을 절대 수정하지 않고 구현만 함
- Spring Boot 3.x + GraphQL
- 모든 외부 API 통신 담당
- ML 서버와 비동기 통신

## 현재 구현 상태
✅ 기본 구조 설정 완료
- Spring Boot 3.2.5 프로젝트 구조
- Entity, Repository, Service, Resolver 레이어 생성
- GraphQL 설정 및 스키마 연결
- 데이터베이스 연결 설정

⏳ 구현 필요
- GraphQL Resolver 비즈니스 로직
- 외부 API 연동 (Google, OpenAI)
- ML 서버 Kafka 통신
- 테스트 코드 작성

## 기술 스택
- Spring Boot 3.2.5
- Build Tool: Gradle (Kotlin DSL)
- Spring GraphQL
- Spring Security OAuth2 + JWT
- Spring Data JPA + PostgreSQL
- Redis (캐싱, 세션)
- Kafka (ML 서버 통신)
- Liquibase (DB 마이그레이션)

## 외부 API 연동
- Google Calendar API
- Google OAuth 2.0
- Google Maps/Places API
- Google Speech-to-Text API
- OpenAI API (텍스트 처리)

## ML 서버 통신
- Kafka Topic: ml-requests, ml-responses
- 비동기 처리 (CompletableFuture)
- 타임아웃: 30초

## 데이터베이스 스키마
- GraphQL 스키마와 1:1 매핑
- Liquibase로 마이그레이션 관리
- 인덱스 최적화 필수

## 보안
- OAuth2 + JWT 하이브리드 인증
  - Google OAuth2로 로그인
  - 성공 시 JWT 토큰 발급
  - API 요청은 JWT로 인증
- Google OAuth 통합 (spring-boot-starter-oauth2-client)
- API Rate Limiting
- CORS 설정

## 개발 가이드
- 구현 가이드는 prompt.md 파일 참조
- 단계별 구현 순서와 체크리스트 포함
- 각 Phase별 우선순위 설정됨