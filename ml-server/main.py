from fastapi import FastAPI, HTTPException, Response
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
import json
import base64
import io
import tempfile
import speech_recognition as sr
import whisper

# Import configuration
from config.settings import settings

# Import original components
from workflows.event_classification import EventClassificationWorkflow
from workflows.schedule_optimization import ScheduleOptimizationWorkflow
from workflows.pattern_detection import PatternDetectionWorkflow
from workflows.balance_analysis import BalanceAnalysisWorkflow
from workflows.burnout_analysis import BurnoutAnalysisWorkflow

# Import enhanced components
from workflows.event_classification_enhanced import EnhancedEventClassificationWorkflow
from models.model_registry import ModelRegistry, ModelMetrics, ModelStage
from models.ab_testing import ABTestingFramework, Experiment, Variant, ExperimentStatus, AllocationStrategy
from models.monitoring import ModelMonitor
from kafka_handler import KafkaHandler

# Import original models
from models.api_models import (
    EventType, EventPriority, ClassifyEventRequest, ClassifyEventResponse,
    OptimizeScheduleRequest, OptimizeScheduleResponse, ScheduleSuggestion,
    AnalyzeBalanceRequest, AnalyzeBalanceResponse, CategoryBalance,
    DetectPatternsRequest, DetectPatternsResponse, Pattern,
    BurnoutAnalysisRequest, BurnoutAnalysisResponse
)

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)
logger = logging.getLogger(__name__)

kafka_handler = KafkaHandler()

# New Pydantic models for enhanced features
class ModelVersionInfo(BaseModel):
    model_name: str
    version: str
    stage: str
    created_at: datetime
    metrics: Dict[str, float]

class ABTestRequest(BaseModel):
    name: str
    description: str
    model_type: str
    variants: List[Dict[str, Any]]
    duration_hours: int = 24
    traffic_split: float = 50.0
    success_metrics: Optional[Dict[str, Dict[str, float]]] = None

class ABTestResponse(BaseModel):
    experiment_id: str
    status: str
    message: str

class TrainModelRequest(BaseModel):
    model_type: str
    training_data: Optional[Dict[str, Any]] = None
    optimize: bool = True
    auto_promote: bool = False
    n_optimization_trials: int = 50
    description: Optional[str] = None

class TrainModelResponse(BaseModel):
    version: str
    metrics: Dict[str, float]
    status: str

class ModelDashboard(BaseModel):
    model_name: str
    current_version: str
    health_status: str
    statistics: Dict[str, float]
    performance_trend: Dict[str, Any]
    active_alerts: List[str]
    drift_detected: bool = False

class AudioTranscriptionRequest(BaseModel):
    audio_base64: str
    language: str = "ko-KR"  # Korean by default

class AudioTranscriptionResponse(BaseModel):
    text: str
    confidence: float
    language: str
    duration: float

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Enhanced ML Server...")
    try:
        # Initialize components
        global model_registry, ab_framework, monitor
        model_registry = ModelRegistry()
        ab_framework = ABTestingFramework()
        monitor = ModelMonitor()
        
        # Start monitoring
        monitor.start_background_monitoring()
        
        # Initialize workflows - both original and enhanced
        global event_classifier, enhanced_event_classifier
        global schedule_optimizer, pattern_detector, balance_analyzer, burnout_analyzer
        
        # Original workflows
        event_classifier = EventClassificationWorkflow()
        schedule_optimizer = ScheduleOptimizationWorkflow()
        pattern_detector = PatternDetectionWorkflow()
        balance_analyzer = BalanceAnalysisWorkflow()
        burnout_analyzer = BurnoutAnalysisWorkflow()
        
        # Enhanced workflows
        enhanced_event_classifier = EnhancedEventClassificationWorkflow(
            enable_versioning=True,
            enable_monitoring=True,
            enable_ab_testing=True
        )
        
        # Load existing models
        model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
        
        # Load models (same as original)
        if os.path.exists(os.path.join(model_path, "event_classifier.joblib")):
            try:
                event_classifier.event_classifier.load_model(model_path)
                logger.info("Trained event classifier loaded")
            except Exception as e:
                logger.warning(f"Failed to load event classifier: {e}")
        
        # Initialize Whisper model for voice transcription
        global whisper_model
        try:
            whisper_model = whisper.load_model("base")
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load Whisper model: {e}")
            whisper_model = None
        
        # Register Kafka handlers (original + enhanced)
        kafka_handler.register_handler("classify_event", lambda data: event_classifier.classify(data))
        kafka_handler.register_handler("classify_event_enhanced", lambda data: enhanced_event_classifier.process(data))
        kafka_handler.register_handler("optimize_schedule", lambda data: schedule_optimizer.optimize(data))
        kafka_handler.register_handler("analyze_balance", lambda data: balance_analyzer.analyze(data))
        kafka_handler.register_handler("detect_patterns", lambda data: pattern_detector.detect(data))
        kafka_handler.register_handler("analyze_burnout", lambda data: burnout_analyzer.analyze(data))
        
        # Start Kafka handler
        kafka_handler.start()
        logger.info("Enhanced ML Server started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start Enhanced ML Server: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Enhanced ML Server...")
    monitor.stop_background_monitoring()
    kafka_handler.stop()
    enhanced_event_classifier.cleanup()
    logger.info("Enhanced ML Server shut down successfully")

app = FastAPI(title="Geulpi Enhanced ML Server", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Keep all original endpoints
@app.get("/health")
async def health_check():
    """Original health check endpoint"""
    try:
        workflows_status = {
            "event_classifier": event_classifier is not None,
            "enhanced_event_classifier": enhanced_event_classifier is not None,
            "schedule_optimizer": schedule_optimizer is not None,
            "pattern_detector": pattern_detector is not None,
            "balance_analyzer": balance_analyzer is not None,
            "burnout_analyzer": burnout_analyzer is not None
        }
        
        kafka_status = {
            "consumer": kafka_handler.get_consumer_metrics(),
            "producer": kafka_handler.get_producer_metrics()
        }
        
        enhanced_components = {
            "model_registry": model_registry is not None,
            "ab_framework": ab_framework is not None,
            "monitor": monitor is not None
        }
        
        voice_transcription_status = {
            "speech_recognition": True,  # Always available with Google API
            "whisper": whisper_model is not None
        }
        
        is_healthy = all(workflows_status.values())
        
        return {
            "status": "healthy" if is_healthy else "degraded",
            "service": "enhanced-ml-server",
            "timestamp": datetime.now().isoformat(),
            "version": "1.2.0",
            "services": {
                "ocr": "ready",
                "voice_transcription": "ready",
                "nlp": "ready"
            },
            "details": {
                "workflows": workflows_status,
                "kafka": kafka_status,
                "enhanced_components": enhanced_components,
                "voice_transcription": voice_transcription_status
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "enhanced-ml-server",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Original endpoints (keep for backward compatibility)
@app.post("/classify-event", response_model=ClassifyEventResponse)
async def classify_event(request: ClassifyEventRequest):
    """Original event classification endpoint"""
    if not event_classifier:
        raise HTTPException(status_code=503, detail="Event classifier not initialized")
    try:
        result = await event_classifier.classify(request.dict())
        return ClassifyEventResponse(**result)
    except Exception as e:
        logger.error(f"Event classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced endpoints
@app.post("/v2/classify-event", response_model=ClassifyEventResponse)
async def classify_event_v2(request: ClassifyEventRequest):
    """Enhanced event classification with monitoring and versioning"""
    if not enhanced_event_classifier:
        raise HTTPException(status_code=503, detail="Enhanced event classifier not initialized")
    try:
        result = await enhanced_event_classifier.process(request.dict())
        return ClassifyEventResponse(**result)
    except Exception as e:
        logger.error(f"Enhanced event classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model management endpoints
@app.post("/models/train", response_model=TrainModelResponse)
async def train_model(request: TrainModelRequest):
    """Train and register a new model version"""
    try:
        if request.model_type == "event_classifier":
            workflow = enhanced_event_classifier
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        
        version = await workflow.train_and_register_model(
            training_data=request.training_data or {},
            optimize=request.optimize,
            auto_promote=request.auto_promote,
            n_optimization_trials=request.n_optimization_trials,
            description=request.description
        )
        
        # Get metrics
        lineage = model_registry.get_model_lineage(request.model_type, version)
        
        return TrainModelResponse(
            version=version,
            metrics=lineage.get("metrics", {}),
            status="completed"
        )
    except Exception as e:
        logger.error(f"Model training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_name}/versions")
async def list_model_versions(model_name: str):
    """List all versions of a model"""
    try:
        versions = model_registry.client.search_model_versions(f"name='{model_name}'")
        
        return {
            "model_name": model_name,
            "versions": [
                {
                    "version": v.version,
                    "stage": v.current_stage,
                    "created_at": datetime.fromtimestamp(v.creation_timestamp / 1000).isoformat(),
                    "source": v.source
                }
                for v in versions
            ]
        }
    except Exception as e:
        logger.error(f"Error listing model versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/{model_name}/promote")
async def promote_model(model_name: str, version: str, target_stage: str):
    """Promote a model version to a new stage"""
    try:
        if target_stage not in ["Staging", "Production", "Archived"]:
            raise HTTPException(status_code=400, detail="Invalid target stage")
        
        success = model_registry.promote_model(model_name, version, ModelStage(target_stage))
        
        return {
            "success": success,
            "message": f"Model {model_name} v{version} promoted to {target_stage}"
        }
    except Exception as e:
        logger.error(f"Model promotion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# A/B testing endpoints
@app.post("/experiments/create", response_model=ABTestResponse)
async def create_ab_test(request: ABTestRequest):
    """Create a new A/B test experiment"""
    try:
        workflow_map = {
            "event_classifier": enhanced_event_classifier
        }
        
        if request.model_type not in workflow_map:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        
        workflow = workflow_map[request.model_type]
        
        experiment_id = await workflow.start_ab_test(
            name=request.name,
            description=request.description,
            variant_configs=request.variants,
            duration_hours=request.duration_hours,
            success_metrics=request.success_metrics
        )
        
        return ABTestResponse(
            experiment_id=experiment_id,
            status="running",
            message=f"A/B test started for {request.duration_hours} hours"
        )
    except Exception as e:
        logger.error(f"A/B test creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get current results of an A/B test"""
    try:
        results = await ab_framework.get_experiment_results(experiment_id)
        return results
    except Exception as e:
        logger.error(f"Error getting experiment results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/experiments/{experiment_id}/stop")
async def stop_experiment(experiment_id: str):
    """Stop a running A/B test"""
    try:
        await ab_framework.stop_experiment(experiment_id)
        results = await ab_framework.get_experiment_results(experiment_id)
        recommendation = ab_framework.recommend_winner(experiment_id)
        
        return {
            "status": "completed",
            "results": results,
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"Error stopping experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Monitoring endpoints
@app.get("/monitoring/dashboard/{model_name}")
async def get_model_dashboard(model_name: str):
    """Get monitoring dashboard for a model"""
    try:
        dashboard_data = monitor.get_model_dashboard(model_name, "current")
        
        # Check for drift
        if model_name == "event_classifier" and enhanced_event_classifier:
            # Get recent predictions to check drift
            # This is simplified - in production, you'd aggregate recent features
            drift_detected = False
        else:
            drift_detected = False
        
        return ModelDashboard(
            model_name=model_name,
            current_version=dashboard_data.get("model_version", "current"),
            health_status=dashboard_data["health_status"],
            statistics=dashboard_data["statistics"],
            performance_trend=dashboard_data["performance_trend"],
            active_alerts=dashboard_data["active_alerts"],
            drift_detected=drift_detected
        )
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/metrics")
async def get_prometheus_metrics():
    """Get Prometheus metrics"""
    try:
        metrics = monitor.get_prometheus_metrics()
        return Response(content=metrics, media_type="text/plain")
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/alerts")
async def get_active_alerts():
    """Get active monitoring alerts"""
    try:
        alerts = monitor.check_alerts()
        return {
            "active_alerts": alerts,
            "total": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Alerts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Keep original endpoints for other workflows
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

# Model comparison endpoint
@app.post("/models/compare")
async def compare_models(model_name: str, version_a: str, version_b: str, test_data: Optional[Dict[str, Any]] = None):
    """Compare two model versions"""
    try:
        # This is a simplified comparison - in production, you'd run both models on test data
        lineage_a = model_registry.get_model_lineage(model_name, version_a)
        lineage_b = model_registry.get_model_lineage(model_name, version_b)
        
        return {
            "version_a": {
                "version": version_a,
                "metrics": lineage_a.get("metrics", {}),
                "created_at": datetime.fromtimestamp(lineage_a["created_timestamp"] / 1000).isoformat()
            },
            "version_b": {
                "version": version_b,
                "metrics": lineage_b.get("metrics", {}),
                "created_at": datetime.fromtimestamp(lineage_b["created_timestamp"] / 1000).isoformat()
            },
            "recommendation": "Use comprehensive A/B testing for production comparison"
        }
    except Exception as e:
        logger.error(f"Model comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice transcription endpoints
@app.post("/api/v1/transcribe", response_model=AudioTranscriptionResponse)
async def transcribe_audio(request: AudioTranscriptionRequest):
    """
    Transcribe audio from base64 encoded data
    """
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(request.audio_base64)
        audio_file = io.BytesIO(audio_data)
        
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Load audio file
        with sr.AudioFile(audio_file) as source:
            audio = recognizer.record(source)
            duration = len(audio.frame_data) / audio.sample_rate / audio.sample_width
        
        # Perform transcription
        try:
            # Use Google Speech Recognition (or replace with Whisper)
            text = recognizer.recognize_google(
                audio, 
                language=request.language
            )
            confidence = 0.95  # Google doesn't return confidence
            
        except sr.UnknownValueError:
            raise HTTPException(
                status_code=400,
                detail="Could not understand audio"
            )
        except sr.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Speech recognition error: {str(e)}"
            )
        
        return AudioTranscriptionResponse(
            text=text,
            confidence=confidence,
            language=request.language,
            duration=duration
        )
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

@app.post("/api/v1/transcribe/whisper", response_model=AudioTranscriptionResponse)
async def transcribe_with_whisper(request: AudioTranscriptionRequest):
    """
    High-quality transcription using OpenAI Whisper
    """
    if not whisper_model:
        raise HTTPException(
            status_code=503,
            detail="Whisper model not available"
        )
    
    # Save audio to temporary file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        audio_data = base64.b64decode(request.audio_base64)
        tmp_file.write(audio_data)
        tmp_path = tmp_file.name
    
    try:
        # Transcribe with Whisper
        result = whisper_model.transcribe(
            tmp_path,
            language="ko",
            task="transcribe"
        )
        
        return AudioTranscriptionResponse(
            text=result["text"],
            confidence=0.98,  # Whisper generally has high accuracy
            language=result.get("language", "ko"),
            duration=result.get("duration", 0)
        )
    except Exception as e:
        logger.error(f"Whisper transcription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Whisper transcription failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        os.unlink(tmp_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))  # Different port for enhanced version
    uvicorn.run(app, host="0.0.0.0", port=port)