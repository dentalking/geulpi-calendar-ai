from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import numpy as np
from enum import Enum
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from workflows.event_classification import EventClassificationWorkflow
from workflows.schedule_optimization import ScheduleOptimizationWorkflow
from workflows.pattern_detection import PatternDetectionWorkflow
from workflows.balance_analysis import BalanceAnalysisWorkflow
from workflows.burnout_analysis import BurnoutAnalysisWorkflow
from kafka_handler import KafkaHandler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

kafka_handler = KafkaHandler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ML Server...")
    try:
        # Initialize workflows
        global event_classifier, schedule_optimizer, pattern_detector, balance_analyzer, burnout_analyzer
        event_classifier = EventClassificationWorkflow()
        schedule_optimizer = ScheduleOptimizationWorkflow()
        pattern_detector = PatternDetectionWorkflow()
        balance_analyzer = BalanceAnalysisWorkflow()
        burnout_analyzer = BurnoutAnalysisWorkflow()
        
        # Check for trained models
        model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
        
        # Load Event Classifier
        if os.path.exists(os.path.join(model_path, "event_classifier.joblib")):
            try:
                logger.info(f"Loading trained event classifier from {model_path}")
                event_classifier.event_classifier.load_model(model_path)
                logger.info("Trained event classifier loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained event classifier: {e}")
                logger.info("Using default initialized event classifier")
        else:
            logger.info("No trained event classifier found, using default initialized model")
            logger.info("Run POST /train/event-classifier to train the model")
        
        # Load Schedule Optimizer models
        optimizer_files = ["balance_model.joblib", "slot_scorer.joblib", 
                          "balance_scaler.joblib", "slot_scaler.joblib"]
        optimizer_exists = all(os.path.exists(os.path.join(model_path, f)) for f in optimizer_files)
        
        if optimizer_exists:
            try:
                logger.info(f"Loading trained schedule optimizer from {model_path}")
                schedule_optimizer.optimizer.load_models(model_path)
                logger.info("Trained schedule optimizer loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained schedule optimizer: {e}")
                logger.info("Using default initialized schedule optimizer")
        else:
            logger.info("No trained schedule optimizer found, using default initialized models")
            logger.info("Run POST /train/schedule-optimizer to train the models")
        
        # Load Pattern Detector models
        pattern_files = ["kmeans_model.joblib", "dbscan_model.joblib", 
                        "pattern_scaler.joblib", "anomaly_detector.joblib"]
        pattern_exists = all(os.path.exists(os.path.join(model_path, f)) for f in pattern_files)
        
        if pattern_exists:
            try:
                logger.info(f"Loading trained pattern detector from {model_path}")
                pattern_detector.detector.load_models(model_path)
                logger.info("Trained pattern detector loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained pattern detector: {e}")
                logger.info("Using default initialized pattern detector")
        else:
            logger.info("No trained pattern detector found, using default initialized models")
            logger.info("Run POST /train/pattern-detector to train the models")
        
        # Load Burnout Predictor model
        burnout_files = ["burnout_risk_model.joblib", "burnout_scaler.joblib"]
        burnout_exists = all(os.path.exists(os.path.join(model_path, f)) for f in burnout_files)
        
        if burnout_exists:
            try:
                logger.info(f"Loading trained burnout predictor from {model_path}")
                burnout_analyzer.predictor.load_models(model_path)
                logger.info("Trained burnout predictor loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained burnout predictor: {e}")
                logger.info("Using default initialized burnout predictor")
        else:
            logger.info("No trained burnout predictor found, using default initialized models")
            logger.info("Run POST /train/burnout-predictor to train the models")
        
        # Register Kafka handlers
        kafka_handler.register_handler("classify_event", lambda data: event_classifier.classify(data))
        kafka_handler.register_handler("optimize_schedule", lambda data: schedule_optimizer.optimize(data))
        kafka_handler.register_handler("analyze_balance", lambda data: balance_analyzer.analyze(data))
        kafka_handler.register_handler("detect_patterns", lambda data: pattern_detector.detect(data))
        kafka_handler.register_handler("analyze_burnout", lambda data: burnout_analyzer.analyze(data))
        
        # Start Kafka handler
        kafka_handler.start()
        logger.info("ML Server started successfully")
    except Exception as e:
        logger.error(f"Failed to start ML Server: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down ML Server...")
    kafka_handler.stop()
    logger.info("ML Server shut down successfully")

app = FastAPI(title="Geulpi ML Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EventType(str, Enum):
    WORK = "WORK"
    PERSONAL = "PERSONAL"
    HEALTH = "HEALTH"
    SOCIAL = "SOCIAL"
    LEARNING = "LEARNING"
    OTHER = "OTHER"

class EventPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ClassifyEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    startTime: datetime
    endTime: datetime
    location: Optional[str] = None

class ClassifyEventResponse(BaseModel):
    eventType: EventType
    priority: EventPriority
    confidence: float
    suggestedTags: List[str]

class OptimizeScheduleRequest(BaseModel):
    userId: str
    targetDate: date
    preferences: Optional[Dict[str, Any]] = None

class ScheduleSuggestion(BaseModel):
    eventId: str
    originalTime: datetime
    suggestedTime: datetime
    reason: str
    impact: float

class OptimizeScheduleResponse(BaseModel):
    suggestions: List[ScheduleSuggestion]
    balanceScore: float
    estimatedImprovement: float

class AnalyzeBalanceRequest(BaseModel):
    userId: str
    startDate: date
    endDate: date

class CategoryBalance(BaseModel):
    category: EventType
    percentage: float
    recommendedPercentage: float
    status: str

class AnalyzeBalanceResponse(BaseModel):
    overallScore: float
    categoryBreakdown: List[CategoryBalance]
    insights: List[str]
    recommendations: List[str]

class DetectPatternsRequest(BaseModel):
    userId: str
    lookbackDays: int = 30

class Pattern(BaseModel):
    patternType: str
    description: str
    frequency: float
    confidence: float
    examples: List[Dict[str, Any]]

class DetectPatternsResponse(BaseModel):
    patterns: List[Pattern]
    anomalies: List[Dict[str, Any]]

class BurnoutAnalysisRequest(BaseModel):
    userId: str
    lookbackDays: int = 30
    includeRecommendations: bool = True

class RiskSeverity(BaseModel):
    level: str
    urgency: str
    description: str
    color: str

class PreventiveAction(BaseModel):
    action: str
    title: str
    description: str
    priority: str
    timeline: str

class MonitoringMetric(BaseModel):
    metric: str
    target: str
    current: Any

class MonitoringPlan(BaseModel):
    check_frequency: str
    review_period_days: int
    next_check: str
    metrics_to_track: List[MonitoringMetric]
    alert_thresholds: Dict[str, Any]
    escalation_plan: Dict[str, str]

class BurnoutAnalysisResponse(BaseModel):
    riskScore: float
    riskLevel: str
    severity: RiskSeverity
    warnings: List[str]
    riskFactors: Dict[str, Any]
    trend: Dict[str, Any]
    recommendations: Optional[List[str]] = None
    preventiveActions: Optional[List[PreventiveAction]] = None
    monitoringPlan: Optional[MonitoringPlan] = None

# Workflow instances will be initialized in lifespan
event_classifier: Optional[EventClassificationWorkflow] = None
schedule_optimizer: Optional[ScheduleOptimizationWorkflow] = None
pattern_detector: Optional[PatternDetectionWorkflow] = None
balance_analyzer: Optional[BalanceAnalysisWorkflow] = None
burnout_analyzer: Optional[BurnoutAnalysisWorkflow] = None

@app.get("/health")
async def health_check():
    try:
        # Check if workflows are initialized
        workflows_status = {
            "event_classifier": event_classifier is not None,
            "schedule_optimizer": schedule_optimizer is not None,
            "pattern_detector": pattern_detector is not None,
            "balance_analyzer": balance_analyzer is not None,
            "burnout_analyzer": burnout_analyzer is not None
        }
        
        # Get Kafka metrics
        kafka_status = {
            "consumer": kafka_handler.get_consumer_metrics(),
            "producer": kafka_handler.get_producer_metrics()
        }
        
        # Overall health status
        is_healthy = all(workflows_status.values()) and \
                    kafka_status["consumer"].get("status") == "active" and \
                    kafka_status["producer"].get("status") == "active"
        
        return {
            "status": "healthy" if is_healthy else "degraded",
            "service": "ml-server",
            "timestamp": datetime.now().isoformat(),
            "details": {
                "workflows": workflows_status,
                "kafka": kafka_status
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "ml-server",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.post("/classify-event", response_model=ClassifyEventResponse)
async def classify_event(request: ClassifyEventRequest):
    if not event_classifier:
        raise HTTPException(status_code=503, detail="Event classifier not initialized")
    try:
        result = await event_classifier.classify(request.dict())
        return ClassifyEventResponse(**result)
    except Exception as e:
        logger.error(f"Event classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize-schedule", response_model=OptimizeScheduleResponse)
async def optimize_schedule(request: OptimizeScheduleRequest):
    if not schedule_optimizer:
        raise HTTPException(status_code=503, detail="Schedule optimizer not initialized")
    try:
        result = await schedule_optimizer.optimize(request.dict())
        return OptimizeScheduleResponse(**result)
    except Exception as e:
        logger.error(f"Schedule optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-balance", response_model=AnalyzeBalanceResponse)
async def analyze_balance(request: AnalyzeBalanceRequest):
    if not balance_analyzer:
        raise HTTPException(status_code=503, detail="Balance analyzer not initialized")
    try:
        result = await balance_analyzer.analyze(request.dict())
        return AnalyzeBalanceResponse(**result)
    except Exception as e:
        logger.error(f"Balance analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-patterns", response_model=DetectPatternsResponse)
async def detect_patterns(request: DetectPatternsRequest):
    if not pattern_detector:
        raise HTTPException(status_code=503, detail="Pattern detector not initialized")
    try:
        result = await pattern_detector.detect(request.dict())
        return DetectPatternsResponse(**result)
    except Exception as e:
        logger.error(f"Pattern detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-burnout", response_model=BurnoutAnalysisResponse)
async def analyze_burnout(request: BurnoutAnalysisRequest):
    if not burnout_analyzer:
        raise HTTPException(status_code=503, detail="Burnout analyzer not initialized")
    try:
        result = await burnout_analyzer.analyze(request.dict())
        return BurnoutAnalysisResponse(**result)
    except Exception as e:
        logger.error(f"Burnout analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kafka/test")
async def test_kafka_connection():
    """Test endpoint to verify Kafka connectivity"""
    try:
        # Send a test event
        kafka_handler.send_event("ml_server_test", {
            "message": "Kafka connection test",
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "status": "success",
            "message": "Test event sent to Kafka",
            "kafka_status": {
                "consumer": kafka_handler.get_consumer_metrics(),
                "producer": kafka_handler.get_producer_metrics()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kafka test failed: {str(e)}")

@app.post("/train/event-classifier")
async def train_event_classifier_endpoint():
    """Trigger training of the event classification model"""
    try:
        from train_models import train_event_classifier
        
        # Run training in background (in production, use a task queue)
        import threading
        thread = threading.Thread(target=train_event_classifier)
        thread.start()
        
        return {
            "status": "training_started",
            "message": "Event classifier training initiated",
            "note": "Check logs for progress"
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/schedule-optimizer")
async def train_schedule_optimizer_endpoint():
    """Trigger training of the schedule optimization models"""
    try:
        from train_models import train_schedule_optimizer
        
        # Run training in background (in production, use a task queue)
        import threading
        thread = threading.Thread(target=train_schedule_optimizer)
        thread.start()
        
        return {
            "status": "training_started",
            "message": "Schedule optimizer training initiated",
            "note": "Check logs for progress. This will train both balance scoring and time slot recommendation models."
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/pattern-detector")
async def train_pattern_detector_endpoint():
    """Trigger training of the pattern detection models"""
    try:
        from train_models import train_pattern_detector
        
        # Run training in background (in production, use a task queue)
        import threading
        thread = threading.Thread(target=train_pattern_detector)
        thread.start()
        
        return {
            "status": "training_started",
            "message": "Pattern detector training initiated",
            "note": "Check logs for progress. This will train clustering and anomaly detection models."
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/burnout-predictor")
async def train_burnout_predictor_endpoint():
    """Trigger training of the burnout prediction model"""
    try:
        from train_models import train_burnout_predictor
        
        # Run training in background (in production, use a task queue)
        import threading
        thread = threading.Thread(target=train_burnout_predictor)
        thread.start()
        
        return {
            "status": "training_started",
            "message": "Burnout predictor training initiated",
            "note": "Check logs for progress. This will train the XGBoost burnout risk model."
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/all")
async def train_all_models_endpoint():
    """Trigger training of all ML models"""
    try:
        from train_models import main as train_all
        
        # Run training in background (in production, use a task queue)
        import threading
        thread = threading.Thread(target=train_all)
        thread.start()
        
        return {
            "status": "training_started",
            "message": "Training all ML models initiated",
            "note": "Check logs for progress. This will train all ML models including event classifier, schedule optimizer, pattern detector, and burnout predictor."
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/status")
async def get_models_status():
    """Get status of ML models"""
    try:
        model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
        
        # Check Event Classifier
        event_classifier_trained = os.path.exists(os.path.join(model_path, "event_classifier.joblib"))
        
        # Check Schedule Optimizer models
        balance_model_trained = os.path.exists(os.path.join(model_path, "balance_model.joblib"))
        slot_scorer_trained = os.path.exists(os.path.join(model_path, "slot_scorer.joblib"))
        balance_scaler_trained = os.path.exists(os.path.join(model_path, "balance_scaler.joblib"))
        slot_scaler_trained = os.path.exists(os.path.join(model_path, "slot_scaler.joblib"))
        
        optimizer_trained = all([balance_model_trained, slot_scorer_trained, 
                               balance_scaler_trained, slot_scaler_trained])
        
        # Check Pattern Detector models
        kmeans_trained = os.path.exists(os.path.join(model_path, "kmeans_model.joblib"))
        dbscan_trained = os.path.exists(os.path.join(model_path, "dbscan_model.joblib"))
        pattern_scaler_trained = os.path.exists(os.path.join(model_path, "pattern_scaler.joblib"))
        anomaly_detector_trained = os.path.exists(os.path.join(model_path, "anomaly_detector.joblib"))
        
        pattern_detector_trained = all([kmeans_trained, dbscan_trained, 
                                       pattern_scaler_trained, anomaly_detector_trained])
        
        # Check Burnout Predictor models
        burnout_risk_trained = os.path.exists(os.path.join(model_path, "burnout_risk_model.joblib"))
        burnout_scaler_trained = os.path.exists(os.path.join(model_path, "burnout_scaler.joblib"))
        
        burnout_predictor_trained = all([burnout_risk_trained, burnout_scaler_trained])
        
        models_info = {
            "event_classifier": {
                "trained": event_classifier_trained,
                "path": model_path,
                "model_file": "event_classifier.joblib",
                "features": {
                    "text_features": event_classifier.event_classifier.text_vectorizer.get_feature_names_out().tolist()[:10] if event_classifier and hasattr(event_classifier.event_classifier.text_vectorizer, 'vocabulary_') else [],
                    "n_features": len(event_classifier.event_classifier.text_vectorizer.get_feature_names_out()) if event_classifier and hasattr(event_classifier.event_classifier.text_vectorizer, 'vocabulary_') else 0,
                    "categories": event_classifier.event_classifier.categories if event_classifier else []
                }
            },
            "schedule_optimizer": {
                "trained": optimizer_trained,
                "path": model_path,
                "components": {
                    "balance_model": balance_model_trained,
                    "slot_scorer": slot_scorer_trained,
                    "balance_scaler": balance_scaler_trained,
                    "slot_scaler": slot_scaler_trained
                },
                "features": {
                    "balance_features": 30,  # From extract_schedule_features
                    "slot_features": 10,     # From _extract_slot_features
                    "target_categories": list(schedule_optimizer.optimizer.target_balance.keys()) if schedule_optimizer else ["WORK", "HEALTH", "SOCIAL", "LEARNING", "PERSONAL"]
                }
            },
            "pattern_detector": {
                "trained": pattern_detector_trained,
                "path": model_path,
                "components": {
                    "kmeans_model": kmeans_trained,
                    "dbscan_model": dbscan_trained,
                    "pattern_scaler": pattern_scaler_trained,
                    "anomaly_detector": anomaly_detector_trained
                },
                "features": {
                    "comprehensive_features": 26,  # From extract_comprehensive_features
                    "clustering_algorithms": ["K-Means", "DBSCAN", "Hierarchical"],
                    "pattern_types": ["behavioral_cluster", "temporal_peak", "category_preference", "weekly_pattern"],
                    "anomaly_detection": "Isolation Forest"
                },
                "capabilities": {
                    "pattern_detection": True,
                    "anomaly_detection": True,
                    "behavioral_insights": True,
                    "multi_algorithm_clustering": True
                }
            },
            "burnout_predictor": {
                "trained": burnout_predictor_trained,
                "path": model_path,
                "components": {
                    "risk_model": burnout_risk_trained,
                    "scaler": burnout_scaler_trained
                },
                "features": {
                    "total_features": 37,  # All burnout risk features
                    "feature_categories": [
                        "schedule_density (7)",
                        "rest_time (7)", 
                        "overtime (7)",
                        "workload_trend (5)",
                        "work_life_balance (7)",
                        "behavioral_patterns (4)"
                    ],
                    "risk_levels": ["low", "medium", "high", "critical"]
                },
                "capabilities": {
                    "risk_prediction": True,
                    "warning_generation": True,
                    "recommendation_engine": True,
                    "trend_analysis": True,
                    "preventive_actions": True,
                    "monitoring_plans": True
                }
            },
            "training_endpoints": {
                "event_classifier": "POST /train/event-classifier",
                "schedule_optimizer": "POST /train/schedule-optimizer",
                "pattern_detector": "POST /train/pattern-detector",
                "burnout_predictor": "POST /train/burnout-predictor",
                "all_models": "POST /train/all"
            }
        }
        
        return models_info
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)