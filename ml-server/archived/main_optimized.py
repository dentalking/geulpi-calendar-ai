"""
Optimized ML Server with performance enhancements
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import numpy as np
from enum import Enum
import asyncio
import logging
import os
import gc
import time
from contextlib import asynccontextmanager
import uvloop  # High-performance event loop

# Performance optimizations imports
from config.performance_config import (
    performance_manager, 
    performance_monitor,
    AsyncBatchProcessor,
    PerformanceConfig
)

# Original workflow imports
from workflows.event_classification import EventClassificationWorkflow
from workflows.schedule_optimization import ScheduleOptimizationWorkflow
from workflows.pattern_detection import PatternDetectionWorkflow
from workflows.balance_analysis import BalanceAnalysisWorkflow
from workflows.burnout_analysis import BurnoutAnalysisWorkflow
from kafka_handler import KafkaHandler

# Set up high-performance event loop
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for workflows and processors
event_classifier = None
schedule_optimizer = None
pattern_detector = None
balance_analyzer = None
burnout_analyzer = None
kafka_handler = None

# Batch processors for different operations
classification_batch_processor = None
optimization_batch_processor = None


class OptimizedEventClassificationBatch(AsyncBatchProcessor):
    """Batch processor for event classification"""
    
    async def _batch_process(self, requests: list) -> list:
        """Process batch of classification requests"""
        global event_classifier
        
        # Extract batch data
        batch_titles = [req['title'] for req in requests]
        batch_descriptions = [req['description'] for req in requests]
        batch_contexts = [req.get('context', {}) for req in requests]
        
        # Process batch efficiently
        results = []
        for i, req in enumerate(requests):
            try:
                # Use cached result if available
                cache_key = performance_manager.get_cache_key(
                    "event_classification",
                    title=req['title'],
                    description=req['description']
                )
                
                cached_result = performance_manager.cache_get(cache_key)
                if cached_result:
                    results.append(cached_result)
                    continue
                
                # Process individual request
                result = await event_classifier.process({
                    "title": req['title'],
                    "description": req['description'],
                    "context": req.get('context', {}),
                    "user_history": req.get('user_history', {})
                })
                
                # Cache result
                performance_manager.cache_set(cache_key, result)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error in batch classification for request {i}: {e}")
                results.append({
                    "error": str(e),
                    "classification": "unknown",
                    "confidence": 0.0
                })
        
        return results


class OptimizedScheduleOptimizationBatch(AsyncBatchProcessor):
    """Batch processor for schedule optimization"""
    
    async def _batch_process(self, requests: list) -> list:
        """Process batch of optimization requests"""
        global schedule_optimizer
        
        results = []
        for req in requests:
            try:
                # Check cache first
                cache_key = performance_manager.get_cache_key(
                    "schedule_optimization",
                    user_id=req['user_id'],
                    events_count=len(req.get('events', [])),
                    constraints=str(req.get('constraints', {}))
                )
                
                cached_result = performance_manager.cache_get(cache_key)
                if cached_result:
                    results.append(cached_result)
                    continue
                
                # Process optimization
                result = await schedule_optimizer.process({
                    "user_id": req['user_id'],
                    "events": req.get('events', []),
                    "preferences": req.get('preferences', {}),
                    "constraints": req.get('constraints', {})
                })
                
                # Cache result with shorter TTL (optimizations change frequently)
                performance_manager.cache_set(cache_key, result, ttl=60)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error in batch optimization: {e}")
                results.append({
                    "error": str(e),
                    "optimization_score": 0.0,
                    "suggestions": []
                })
        
        return results


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with optimized startup and shutdown"""
    # Startup
    logger.info("Starting Optimized ML Server...")
    
    try:
        # Initialize global variables
        global (event_classifier, schedule_optimizer, pattern_detector, 
                balance_analyzer, burnout_analyzer, kafka_handler,
                classification_batch_processor, optimization_batch_processor)
        
        # Initialize Kafka handler
        kafka_handler = KafkaHandler()
        
        # Pre-load all models in parallel for faster startup
        startup_tasks = []
        
        # Initialize workflows
        startup_tasks.append(initialize_event_classifier())
        startup_tasks.append(initialize_schedule_optimizer())
        startup_tasks.append(initialize_pattern_detector())
        startup_tasks.append(initialize_balance_analyzer())
        startup_tasks.append(initialize_burnout_analyzer())
        
        # Run initialization tasks in parallel
        await asyncio.gather(*startup_tasks, return_exceptions=True)
        
        # Initialize batch processors
        classification_batch_processor = OptimizedEventClassificationBatch(
            batch_size=16, timeout=0.05  # Smaller batches, faster response
        )
        optimization_batch_processor = OptimizedScheduleOptimizationBatch(
            batch_size=8, timeout=0.1   # Optimization takes longer
        )
        
        # Pre-warm models with dummy data
        await prewarm_models()
        
        logger.info("ML Server startup completed successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    # Shutdown
    logger.info("Shutting down ML Server...")
    
    # Clean up resources
    if kafka_handler:
        await kafka_handler.close()
    
    # Clear caches
    performance_manager.cache_delete("ml_cache:*")
    
    # Force garbage collection
    gc.collect()
    
    logger.info("ML Server shutdown completed")


async def initialize_event_classifier():
    """Initialize event classifier with optimizations"""
    global event_classifier
    
    logger.info("Initializing event classifier...")
    event_classifier = EventClassificationWorkflow()
    
    # Load pre-trained model if available
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    if os.path.exists(os.path.join(model_path, "event_classifier.joblib")):
        try:
            event_classifier.event_classifier.load_model(model_path)
            logger.info("Pre-trained event classifier loaded")
        except Exception as e:
            logger.warning(f"Failed to load event classifier: {e}")


async def initialize_schedule_optimizer():
    """Initialize schedule optimizer with optimizations"""
    global schedule_optimizer
    
    logger.info("Initializing schedule optimizer...")
    schedule_optimizer = ScheduleOptimizationWorkflow()
    
    # Load pre-trained models
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    optimizer_files = ["balance_model.joblib", "slot_scorer.joblib"]
    
    if all(os.path.exists(os.path.join(model_path, f)) for f in optimizer_files):
        try:
            schedule_optimizer.optimizer.load_models(model_path)
            logger.info("Pre-trained schedule optimizer loaded")
        except Exception as e:
            logger.warning(f"Failed to load schedule optimizer: {e}")


async def initialize_pattern_detector():
    """Initialize pattern detector with optimizations"""
    global pattern_detector
    
    logger.info("Initializing pattern detector...")
    pattern_detector = PatternDetectionWorkflow()
    
    # Load pre-trained models
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    pattern_files = ["kmeans_model.joblib", "dbscan_model.joblib"]
    
    if all(os.path.exists(os.path.join(model_path, f)) for f in pattern_files):
        try:
            pattern_detector.detector.load_models(model_path)
            logger.info("Pre-trained pattern detector loaded")
        except Exception as e:
            logger.warning(f"Failed to load pattern detector: {e}")


async def initialize_balance_analyzer():
    """Initialize balance analyzer"""
    global balance_analyzer
    
    logger.info("Initializing balance analyzer...")
    balance_analyzer = BalanceAnalysisWorkflow()


async def initialize_burnout_analyzer():
    """Initialize burnout analyzer with optimizations"""
    global burnout_analyzer
    
    logger.info("Initializing burnout analyzer...")
    burnout_analyzer = BurnoutAnalysisWorkflow()
    
    # Load pre-trained model
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    burnout_files = ["burnout_risk_model.joblib", "burnout_scaler.joblib"]
    
    if all(os.path.exists(os.path.join(model_path, f)) for f in burnout_files):
        try:
            burnout_analyzer.predictor.load_models(model_path)
            logger.info("Pre-trained burnout predictor loaded")
        except Exception as e:
            logger.warning(f"Failed to load burnout predictor: {e}")


async def prewarm_models():
    """Pre-warm models with dummy data to avoid cold start delays"""
    logger.info("Pre-warming models...")
    
    try:
        # Pre-warm event classifier
        if event_classifier:
            await event_classifier.process({
                "title": "Test Meeting",
                "description": "Test description",
                "context": {},
                "user_history": {}
            })
        
        # Pre-warm schedule optimizer
        if schedule_optimizer:
            await schedule_optimizer.process({
                "user_id": "test_user",
                "events": [],
                "preferences": {},
                "constraints": {}
            })
        
        logger.info("Model pre-warming completed")
        
    except Exception as e:
        logger.warning(f"Model pre-warming failed: {e}")


# Initialize FastAPI app with optimizations
app = FastAPI(
    title="Geulpi ML Server - Optimized",
    description="High-performance ML service for calendar optimization",
    version="2.0.0",
    default_response_class=ORJSONResponse,  # Faster JSON serialization
    lifespan=lifespan
)

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models (same as original)
class EventData(BaseModel):
    title: str
    description: Optional[str] = ""
    context: Optional[Dict[str, Any]] = {}
    user_history: Optional[Dict[str, Any]] = {}


class EventClassificationResponse(BaseModel):
    classification: str
    confidence: float
    category: Optional[str] = None
    priority: Optional[str] = None
    estimated_duration: Optional[int] = None
    suggestions: Optional[List[str]] = []
    processing_time_ms: Optional[float] = None


class OptimizationRequest(BaseModel):
    user_id: str
    events: List[Dict[str, Any]]
    preferences: Optional[Dict[str, Any]] = {}
    constraints: Optional[Dict[str, Any]] = {}


class OptimizationResponse(BaseModel):
    optimization_score: float
    optimized_events: List[Dict[str, Any]]
    suggestions: List[str]
    conflicts_resolved: int
    balance_improvement: float
    processing_time_ms: Optional[float] = None


# Health endpoint with performance metrics
@app.get("/health")
async def health_check():
    """Enhanced health check with performance metrics"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "models_loaded": {
            "event_classifier": event_classifier is not None,
            "schedule_optimizer": schedule_optimizer is not None,
            "pattern_detector": pattern_detector is not None,
            "balance_analyzer": balance_analyzer is not None,
            "burnout_analyzer": burnout_analyzer is not None
        },
        "cache_status": performance_manager.redis_client is not None,
        "request_count": performance_manager.request_count,
        "concurrent_limit": performance_manager.config.max_concurrent_requests
    }


@app.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    import psutil
    import asyncio
    
    return {
        "memory": {
            "used_mb": psutil.virtual_memory().used / 1024 / 1024,
            "available_mb": psutil.virtual_memory().available / 1024 / 1024,
            "percent": psutil.virtual_memory().percent
        },
        "cpu": {
            "percent": psutil.cpu_percent(),
            "count": psutil.cpu_count()
        },
        "requests": {
            "total": performance_manager.request_count,
            "concurrent": performance_manager.config.max_concurrent_requests - performance_manager.semaphore._value
        },
        "event_loop": {
            "running": asyncio.get_running_loop().is_running()
        }
    }


# Optimized endpoints
@app.post("/classify-event", response_model=EventClassificationResponse)
@performance_monitor("classify_event")
async def classify_event_optimized(event_data: EventData):
    """Optimized event classification with caching and batching"""
    start_time = time.time()
    
    # Rate limiting
    await performance_manager.acquire_semaphore()
    
    try:
        # Check cache first
        cache_key = performance_manager.get_cache_key(
            "event_classification",
            title=event_data.title,
            description=event_data.description
        )
        
        cached_result = performance_manager.cache_get(cache_key)
        if cached_result:
            cached_result["processing_time_ms"] = (time.time() - start_time) * 1000
            cached_result["cached"] = True
            return cached_result
        
        # Use batch processor for better throughput
        result = await classification_batch_processor.add_request({
            "title": event_data.title,
            "description": event_data.description,
            "context": event_data.context,
            "user_history": event_data.user_history
        })
        
        # Add processing time
        result["processing_time_ms"] = (time.time() - start_time) * 1000
        result["cached"] = False
        
        # Run garbage collection if needed
        if performance_manager.should_run_gc():
            asyncio.create_task(run_background_gc())
        
        return result
        
    except Exception as e:
        logger.error(f"Error in classify_event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        performance_manager.release_semaphore()


@app.post("/optimize-schedule", response_model=OptimizationResponse)
@performance_monitor("optimize_schedule")
async def optimize_schedule_optimized(request: OptimizationRequest):
    """Optimized schedule optimization with caching"""
    start_time = time.time()
    
    # Rate limiting
    await performance_manager.acquire_semaphore()
    
    try:
        # Use batch processor
        result = await optimization_batch_processor.add_request({
            "user_id": request.user_id,
            "events": request.events,
            "preferences": request.preferences,
            "constraints": request.constraints
        })
        
        # Add processing time
        result["processing_time_ms"] = (time.time() - start_time) * 1000
        
        return result
        
    except Exception as e:
        logger.error(f"Error in optimize_schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        performance_manager.release_semaphore()


@app.post("/detect-patterns")
@performance_monitor("detect_patterns")
async def detect_patterns_optimized(
    user_id: str,
    events: List[Dict[str, Any]],
    timeframe_days: int = 30,
    pattern_types: List[str] = None
):
    """Optimized pattern detection with caching"""
    start_time = time.time()
    
    await performance_manager.acquire_semaphore()
    
    try:
        # Check cache
        cache_key = performance_manager.get_cache_key(
            "pattern_detection",
            user_id=user_id,
            events_count=len(events),
            timeframe_days=timeframe_days,
            pattern_types=pattern_types
        )
        
        cached_result = performance_manager.cache_get(cache_key)
        if cached_result:
            cached_result["processing_time_ms"] = (time.time() - start_time) * 1000
            return cached_result
        
        # Process pattern detection
        result = await pattern_detector.process({
            "user_id": user_id,
            "events": events,
            "timeframe_days": timeframe_days,
            "pattern_types": pattern_types or ["time", "category", "productivity"]
        })
        
        # Cache result (patterns don't change frequently)
        performance_manager.cache_set(cache_key, result, ttl=1800)  # 30 minutes
        
        result["processing_time_ms"] = (time.time() - start_time) * 1000
        return result
        
    except Exception as e:
        logger.error(f"Error in detect_patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        performance_manager.release_semaphore()


@app.post("/predict-burnout")
@performance_monitor("predict_burnout")
async def predict_burnout_optimized(
    user_id: str,
    schedule_data: Dict[str, Any],
    health_metrics: Optional[Dict[str, Any]] = None,
    work_patterns: Optional[Dict[str, Any]] = None
):
    """Optimized burnout prediction with caching"""
    start_time = time.time()
    
    await performance_manager.acquire_semaphore()
    
    try:
        # Check cache
        cache_key = performance_manager.get_cache_key(
            "burnout_prediction",
            user_id=user_id,
            schedule_data=str(schedule_data),
            health_metrics=str(health_metrics)
        )
        
        cached_result = performance_manager.cache_get(cache_key)
        if cached_result:
            cached_result["processing_time_ms"] = (time.time() - start_time) * 1000
            return cached_result
        
        # Process burnout prediction
        result = await burnout_analyzer.process({
            "user_id": user_id,
            "schedule_data": schedule_data,
            "health_metrics": health_metrics or {},
            "work_patterns": work_patterns or {}
        })
        
        # Cache result (burnout risk changes slowly)
        performance_manager.cache_set(cache_key, result, ttl=3600)  # 1 hour
        
        result["processing_time_ms"] = (time.time() - start_time) * 1000
        return result
        
    except Exception as e:
        logger.error(f"Error in predict_burnout: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        performance_manager.release_semaphore()


async def run_background_gc():
    """Run garbage collection in background"""
    logger.info("Running background garbage collection")
    gc.collect()


@app.post("/batch-optimize")
@performance_monitor("batch_optimize")
async def batch_optimize(requests: List[OptimizationRequest]):
    """Batch optimization endpoint for multiple requests"""
    start_time = time.time()
    
    # Limit batch size for memory management
    if len(requests) > 20:
        raise HTTPException(status_code=400, detail="Batch size too large (max 20)")
    
    await performance_manager.acquire_semaphore()
    
    try:
        # Process all requests in parallel
        tasks = []
        for req in requests:
            task = optimization_batch_processor.add_request({
                "user_id": req.user_id,
                "events": req.events,
                "preferences": req.preferences,
                "constraints": req.constraints
            })
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "error": str(result),
                    "optimization_score": 0.0,
                    "suggestions": []
                })
            else:
                processed_results.append(result)
        
        return {
            "results": processed_results,
            "total_processing_time": (time.time() - start_time) * 1000,
            "batch_size": len(requests)
        }
        
    except Exception as e:
        logger.error(f"Error in batch_optimize: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        performance_manager.release_semaphore()


if __name__ == "__main__":
    import uvicorn
    
    # Run with optimized settings
    uvicorn.run(
        "main_optimized:app",
        host="0.0.0.0",
        port=8000,
        workers=1,  # Single worker for ML models
        loop="uvloop",  # High-performance event loop
        http="httptools",  # Fast HTTP parser
        access_log=False,  # Disable access logs for performance
        log_level="info"
    )