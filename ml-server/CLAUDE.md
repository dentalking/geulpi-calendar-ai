# Geulpi Calendar Service - ML Server

## 핵심 원칙
- ../schema.graphql의 타입 정의 준수
- FastAPI로 REST API 제공
- 전통 ML 모델 (XGBoost, Random Forest) 사용
- Kafka로 백엔드와 통신
- Backend에서 전처리된 수치 데이터를 받아 ML 처리

## 프로젝트 구조
```
/ml-server
├── main.py                    # 메인 FastAPI 앱
├── main_enhanced.py           # 향상된 기능이 포함된 버전
├── main_optimized.py          # 성능 최적화 버전
├── kafka_handler.py           # Kafka 통신 처리
├── train_models.py            # 모델 학습 스크립트
├── /models
│   ├── classifiers.py         # ML 분류 모델들
│   ├── optimizer.py           # 일정 최적화 모델
│   ├── pattern_detector.py    # 패턴 감지 모델
│   ├── burnout_predictor.py   # 번아웃 예측 모델
│   ├── model_registry.py      # 모델 관리 레지스트리
│   ├── monitoring.py          # 모델 모니터링
│   └── /trained               # 학습된 모델 저장소
├── /workflows                 # LangGraph 워크플로우
│   ├── event_classification.py
│   ├── schedule_optimization.py
│   ├── pattern_detection.py
│   └── balance_analysis.py
├── /optimization              # 성능 최적화 모듈
│   ├── inference_optimizer.py
│   └── model_optimizer.py
└── /config
    └── performance_config.py  # 성능 설정

## 기술 스택
- FastAPI
- LangGraph (워크플로우 관리)
- Scikit-learn, XGBoost
- Pandas, NumPy
- Redis (모델 캐싱)
- Kafka Consumer/Producer

## 현재 실행 중인 파일
- **main.py**: 메인 서버 (이전 main_enhanced.py에서 이름 변경됨)
- **kafka_handler.py**: Kafka 메시지 처리

## LangGraph 워크플로우 구조
1. Event Processing Pipeline (workflows/event_classification.py)
    - validate_features: 입력된 특성 벡터 검증
    - classify_event: 카테고리 분류 (Random Forest)
    - confidence_check: 신뢰도 검증
    - human_in_loop: 낮은 신뢰도 시 사용자 확인

2. Schedule Optimization Pipeline (workflows/schedule_optimization.py)
    - analyze_current: 현재 일정 분석
    - calculate_balance: 균형 점수 계산
    - generate_suggestions: 최적화 제안 생성 (XGBoost)
    - rank_alternatives: 대안 순위 결정

3. Pattern Detection Pipeline (workflows/pattern_detection.py)
    - collect_data: 과거 데이터 수집
    - feature_engineering: 시계열 특성 추출
    - cluster_behaviors: 패턴 클러스터링 (K-means/DBSCAN)
    - validate_patterns: 패턴 검증

## API 엔드포인트 (main.py 기준)
- POST /classify-event - 이벤트 분류
- POST /optimize-schedule - 일정 최적화
- POST /analyze-balance - 균형 분석
- GET /detect-patterns - 패턴 감지
- POST /predict-burnout - 번아웃 예측
- GET /model-performance - 모델 성능 확인
- POST /retrain-models - 모델 재학습
- GET /health - 헬스체크

## 데이터 처리 흐름
1. Backend에서 전처리된 수치 벡터 수신
2. Feature engineering 및 정규화
3. 모델 추론 (<100ms 목표)
4. 결과 캐싱 (Redis)
5. Kafka를 통해 Backend로 응답

## 주요 모델 파일
- models/classifiers.py: EventClassifier, PriorityPredictor
- models/optimizer.py: ScheduleOptimizer
- models/pattern_detector.py: PatternDetector
- models/burnout_predictor.py: BurnoutPredictor

## 개발 워크플로우
1. 새로운 기능 추가 시:
   - workflows/ 디렉토리에 LangGraph 워크플로우 추가
   - models/ 디렉토리에 ML 모델 클래스 추가
   - main_enhanced.py에 엔드포인트 추가

2. 모델 학습:
   ```bash
   # 모든 모델 학습 (권장)
   python train_models_enhanced.py
   ```
   
   학습되는 모델들:
   - EventClassifier: 이벤트 카테고리 분류
   - ScheduleOptimizer: 일정 최적화
   - PatternDetector: 사용 패턴 감지
   - BurnoutPredictor: 번아웃 위험도 예측

3. 테스트:
   ```bash
   python test_enhanced_features.py
   ```

## 자주 사용하는 명령어
```bash
# 서버 실행 (Python 3.11 권장)
uvicorn main:app --reload --port 8000

# 모델 학습
python train_models_enhanced.py

# Docker 실행 (권장 - Python 호환성 문제 해결)
docker-compose up ml-server

# Docker 빌드 후 실행
docker-compose build ml-server
docker-compose up ml-server

# 종속성 설치 (Python 3.11 필요)
pip install -r requirements_optimized.txt

# 테스트 실행
pytest tests/

# 모델 버전 관리
python scripts/manage_model_versions.py list-models
python scripts/manage_model_versions.py list-versions event_classifier
python scripts/manage_model_versions.py promote event_classifier 1.0.1 --stage production
```

## 중요 참고사항
- **Python 버전**: Python 3.11 사용 권장. Python 3.13은 scikit-learn과 호환성 문제가 있음
- **Docker 사용 권장**: 의존성 문제를 피하기 위해 Docker 환경 사용 추천

## 환경 변수
- REDIS_HOST: Redis 호스트 (기본: localhost)
- REDIS_PORT: Redis 포트 (기본: 6379)
- KAFKA_BOOTSTRAP_SERVERS: Kafka 서버 (기본: localhost:9092)
- MODEL_CACHE_TTL: 모델 캐시 TTL (기본: 3600)

## 디버깅 팁
1. 모델 로딩 실패 시:
   - trained/ 디렉토리에 모델 파일 확인
   - train_models_enhanced.py 실행하여 모델 재학습

2. Kafka 연결 실패 시:
   - docker-compose로 Kafka 실행 확인
   - KAFKA_BOOTSTRAP_SERVERS 환경변수 확인

3. 성능 이슈:
   - optimization/inference_optimizer.py의 설정 조정
   - Redis 캐시 활용 확인

## 코드 패턴
### 새로운 워크플로우 추가
```python
# workflows/new_workflow.py
from langgraph.graph import StateGraph, END
from typing import TypedDict

class WorkflowState(TypedDict):
    input: dict
    output: dict

workflow = StateGraph(WorkflowState)
# 노드 추가...
```

### 새로운 모델 추가
```python
# models/new_model.py
from .model_registry import ModelRegistry

class NewModel:
    def __init__(self):
        self.model = None
        
    def train(self, X, y):
        # 학습 로직
        pass
        
    def predict(self, X):
        # 예측 로직
        pass

# 레지스트리에 등록
ModelRegistry.register("new_model", NewModel)
```

## 통합 테스트 체크리스트
- [ ] 모든 엔드포인트 응답 확인
- [ ] Kafka 메시지 송수신 테스트
- [ ] Redis 캐싱 동작 확인
- [ ] 모델 추론 성능 (<100ms)
- [ ] 메모리 사용량 모니터링

## 현재 작업 상태 (2025-07-26)
### 완료된 작업
- ✅ train_models_enhanced.py에 모든 모델 학습 메서드 추가
- ✅ Docker 설정을 main.py 사용하도록 업데이트 (main_enhanced.py에서 이름 변경)
- ✅ Python 3.13 호환성 문제 문서화
- ✅ CLAUDE.md 파일 대폭 개선
- ✅ 테스트 디렉토리 구조 생성 및 워크플로우별 테스트 추가
- ✅ 환경 변수 기반 설정 시스템 구현 (config/settings.py)
- ✅ 모델 버전 관리 시스템 구현 (models/version_manager.py)
- ✅ 이전 main_*.py 파일들을 archived/ 디렉토리로 이동

### 다음 단계
1. Docker 환경에서 모델 학습:
   ```bash
   docker-compose run ml-server python train_models_enhanced.py
   ```
2. Docker 환경에서 서버 실행 및 테스트
3. Kafka/Redis 연결 확인
4. API 엔드포인트 통합 테스트
5. 모델 버전 관리 시스템 테스트