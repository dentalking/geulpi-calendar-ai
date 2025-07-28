from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import asyncio
import time
import logging
from datetime import datetime
import numpy as np

from models.model_registry import ModelRegistry, ModelMetrics, ModelStage
from models.model_optimizer import ModelOptimizer, AutoMLOptimizer
from models.ab_testing import (
    ABTestingFramework, Experiment, ExperimentStatus, 
    AllocationStrategy, Variant, ExperimentResult
)
from models.monitoring import ModelMonitor, Alert, MetricType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedWorkflow(ABC):
    """Base class for ML workflows with versioning, A/B testing, and monitoring"""
    
    def __init__(self, 
                 workflow_name: str,
                 model_type: str,
                 enable_versioning: bool = True,
                 enable_monitoring: bool = True,
                 enable_ab_testing: bool = True,
                 redis_host: str = "localhost",
                 redis_port: int = 6379):
        
        self.workflow_name = workflow_name
        self.model_type = model_type
        
        # Components
        self.model_registry = ModelRegistry(redis_host=redis_host, redis_port=redis_port) if enable_versioning else None
        self.monitor = ModelMonitor() if enable_monitoring else None
        self.ab_framework = ABTestingFramework(redis_host=redis_host, redis_port=redis_port) if enable_ab_testing else None
        self.optimizer = ModelOptimizer()
        
        # Current model info
        self.current_model = None
        self.current_version = None
        self.active_experiment = None
        
        # Setup monitoring if enabled
        if self.monitor:
            self._setup_default_alerts()
            self.monitor.start_background_monitoring()
    
    @abstractmethod
    async def train_model(self, training_data: Any, **kwargs) -> Tuple[Any, ModelMetrics]:
        """Train a new model version - must be implemented by subclass"""
        pass
    
    @abstractmethod
    async def predict(self, input_data: Any, **kwargs) -> Any:
        """Make prediction - must be implemented by subclass"""
        pass
    
    @abstractmethod
    def extract_features(self, input_data: Any) -> np.ndarray:
        """Extract features from input - must be implemented by subclass"""
        pass
    
    async def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Main processing method with A/B testing and monitoring"""
        start_time = time.time()
        
        try:
            # Determine which model to use
            model, version = await self._get_model_for_request(request.get("request_id"))
            
            # Extract features for drift detection
            if self.monitor:
                features = self.extract_features(request)
                drift_result = self.monitor.detect_drift(
                    self.model_type,
                    version,
                    features.reshape(1, -1)
                )
                
                if drift_result.has_drift:
                    logger.warning(f"Drift detected: {drift_result.recommendation}")
            
            # Make prediction
            result = await self.predict(request, model=model, version=version)
            
            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            success = result.get("success", True)
            
            # Record metrics
            if self.monitor:
                self.monitor.record_prediction(
                    model_name=self.model_type,
                    model_version=version,
                    latency_ms=latency_ms,
                    success=success,
                    input_data=request,
                    prediction=result
                )
                
                # Record resource usage periodically
                if np.random.random() < 0.01:  # 1% of requests
                    self.monitor.record_resource_usage(self.model_type)
            
            # Record A/B test result if applicable
            if self.active_experiment and self.ab_framework:
                variant_name = self._get_variant_name(version)
                if variant_name:
                    await self.ab_framework.record_result(
                        ExperimentResult(
                            variant_name=variant_name,
                            request_id=request.get("request_id", ""),
                            timestamp=datetime.now(),
                            success=success,
                            latency_ms=latency_ms,
                            metrics=result.get("metrics", {})
                        )
                    )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in {self.workflow_name}: {e}")
            
            # Record failure
            if self.monitor:
                self.monitor.record_prediction(
                    model_name=self.model_type,
                    model_version=version if 'version' in locals() else "unknown",
                    latency_ms=(time.time() - start_time) * 1000,
                    success=False
                )
            
            raise
    
    async def train_and_register_model(self, 
                                     training_data: Any,
                                     optimize: bool = True,
                                     auto_promote: bool = False,
                                     **kwargs) -> str:
        """Train, optimize, and register a new model version"""
        logger.info(f"Training new {self.model_type} model")
        
        # Train model
        model, metrics = await self.train_model(training_data, **kwargs)
        
        # Optimize if requested
        if optimize:
            logger.info("Optimizing model")
            
            # Extract features and labels for optimization
            X, y = self._prepare_optimization_data(training_data)
            
            # Hyperparameter optimization
            opt_result = self.optimizer.optimize_hyperparameters(
                model_type=type(model).__name__,
                X_train=X,
                y_train=y,
                n_trials=kwargs.get("n_optimization_trials", 50)
            )
            
            # Update model with best params
            model.set_params(**opt_result.best_params)
            model.fit(X, y)
            
            # Update metrics
            metrics.custom_metrics = {
                "optimization_score": opt_result.best_score,
                "model_size_mb": opt_result.model_size_mb,
                "inference_time_ms": opt_result.inference_time_ms
            }
            
            # Try to reduce model size if needed
            if opt_result.model_size_mb > kwargs.get("max_model_size_mb", 100):
                logger.info("Compressing model")
                model = self.optimizer.optimize_model_size(
                    model,
                    compression_ratio=kwargs.get("compression_ratio", 0.8)
                )
        
        # Register model
        if self.model_registry:
            version = self.model_registry.register_model(
                model=model,
                model_name=self.model_type,
                metrics=metrics,
                tags={
                    "workflow": self.workflow_name,
                    "optimized": str(optimize),
                    "training_date": datetime.now().isoformat()
                },
                description=kwargs.get("description", f"Auto-generated {self.model_type} model")
            )
            
            logger.info(f"Registered model version {version}")
            
            # Auto-promote if requested
            if auto_promote:
                # First promote to staging
                self.model_registry.promote_model(self.model_type, version, ModelStage.STAGING)
                
                # Run validation
                if await self._validate_model(model, version, training_data):
                    self.model_registry.promote_model(self.model_type, version, ModelStage.PRODUCTION)
                    logger.info(f"Auto-promoted version {version} to production")
                else:
                    logger.warning(f"Version {version} failed validation, keeping in staging")
            
            return version
        
        # If no registry, just update current model
        self.current_model = model
        self.current_version = "latest"
        return "latest"
    
    async def start_ab_test(self,
                          name: str,
                          description: str,
                          variant_configs: List[Dict[str, Any]],
                          duration_hours: int = 24,
                          success_metrics: Dict[str, Dict[str, float]] = None) -> str:
        """Start an A/B test between model versions"""
        if not self.ab_framework:
            raise ValueError("A/B testing not enabled")
        
        # Create variants
        variants = []
        for config in variant_configs:
            variant = Variant(
                name=config["name"],
                model_name=self.model_type,
                model_version=config["version"],
                traffic_percentage=config.get("traffic_percentage", 50),
                metadata=config.get("metadata", {})
            )
            variants.append(variant)
        
        # Default success metrics if not provided
        if not success_metrics:
            success_metrics = {
                "success_rate": {"threshold": 0.95, "weight": 1.0},
                "avg_latency_ms": {"threshold": 100, "weight": 0.5}
            }
        
        # Create experiment
        experiment = Experiment(
            experiment_id=f"{self.model_type}_{int(time.time())}",
            name=name,
            description=description,
            model_type=self.model_type,
            variants=variants,
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=duration_hours),
            status=ExperimentStatus.RUNNING,
            allocation_strategy=AllocationStrategy.FIXED,
            success_metrics=success_metrics,
            minimum_sample_size=kwargs.get("minimum_sample_size", 1000)
        )
        
        experiment_id = await self.ab_framework.create_experiment(experiment)
        self.active_experiment = experiment_id
        
        logger.info(f"Started A/B test {experiment_id}")
        return experiment_id
    
    async def _get_model_for_request(self, request_id: Optional[str] = None) -> Tuple[Any, str]:
        """Get model and version for a request"""
        # Check if A/B test is active
        if self.active_experiment and self.ab_framework:
            try:
                variant = await self.ab_framework.get_variant(
                    self.active_experiment,
                    user_id=request_id
                )
                
                if self.model_registry:
                    model = self.model_registry.get_model(
                        variant.model_name,
                        version=variant.model_version
                    )
                    return model, variant.model_version
            except Exception as e:
                logger.warning(f"A/B test error: {e}, falling back to production model")
        
        # Get production model
        if self.model_registry:
            try:
                model = self.model_registry.get_model(self.model_type, stage="Production")
                # Get version info
                versions = self.model_registry.client.get_latest_versions(
                    self.model_type,
                    stages=["Production"]
                )
                version = versions[0].version if versions else "unknown"
                return model, version
            except:
                logger.warning("No production model found, using current model")
        
        # Fallback to current model
        if self.current_model:
            return self.current_model, self.current_version or "current"
        
        raise ValueError("No model available")
    
    async def _validate_model(self, model: Any, version: str, validation_data: Any) -> bool:
        """Validate model before promotion"""
        try:
            # Extract validation set
            X_val, y_val = self._prepare_validation_data(validation_data)
            
            # Make predictions
            predictions = model.predict(X_val)
            
            # Calculate metrics
            from sklearn.metrics import accuracy_score, precision_score, recall_score
            
            accuracy = accuracy_score(y_val, predictions)
            precision = precision_score(y_val, predictions, average='weighted', zero_division=0)
            recall = recall_score(y_val, predictions, average='weighted', zero_division=0)
            
            # Check thresholds
            if accuracy < 0.9 or precision < 0.85 or recall < 0.85:
                logger.warning(f"Model {version} failed validation: acc={accuracy}, prec={precision}, rec={recall}")
                return False
            
            logger.info(f"Model {version} passed validation: acc={accuracy}, prec={precision}, rec={recall}")
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False
    
    def _setup_default_alerts(self):
        """Setup default monitoring alerts"""
        # Success rate alert
        self.monitor.add_alert(Alert(
            name=f"{self.model_type}_low_success_rate",
            metric_name="prediction",
            condition="<",
            threshold=0.95,
            window_seconds=300,
            severity="critical",
            message_template="Success rate dropped to {value:.2%} (threshold: {threshold:.2%})"
        ))
        
        # Latency alert
        self.monitor.add_alert(Alert(
            name=f"{self.model_type}_high_latency",
            metric_name="latency_ms",
            condition=">",
            threshold=100,
            window_seconds=300,
            severity="warning",
            message_template="Average latency increased to {value:.0f}ms (threshold: {threshold:.0f}ms)"
        ))
        
        # Drift alert
        self.monitor.add_alert(Alert(
            name=f"{self.model_type}_drift_detected",
            metric_name="drift_score",
            condition=">",
            threshold=0.15,
            window_seconds=600,
            severity="warning",
            message_template="Model drift detected: score={value:.3f} (threshold: {threshold:.3f})"
        ))
    
    def _get_variant_name(self, version: str) -> Optional[str]:
        """Get variant name for a model version in active experiment"""
        # This is a simplified implementation
        # In practice, you'd look up the variant from the experiment config
        return f"v{version}"
    
    @abstractmethod
    def _prepare_optimization_data(self, training_data: Any) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for optimization - must be implemented by subclass"""
        pass
    
    @abstractmethod
    def _prepare_validation_data(self, validation_data: Any) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for validation - must be implemented by subclass"""
        pass
    
    async def get_workflow_status(self) -> Dict[str, Any]:
        """Get comprehensive workflow status"""
        status = {
            "workflow_name": self.workflow_name,
            "model_type": self.model_type,
            "current_version": self.current_version,
            "components": {
                "versioning_enabled": self.model_registry is not None,
                "monitoring_enabled": self.monitor is not None,
                "ab_testing_enabled": self.ab_framework is not None
            }
        }
        
        # Add model registry info
        if self.model_registry:
            try:
                versions = self.model_registry.client.search_model_versions(f"name='{self.model_type}'")
                status["model_versions"] = {
                    "total": len(versions),
                    "production": [v.version for v in versions if v.current_stage == "Production"],
                    "staging": [v.version for v in versions if v.current_stage == "Staging"]
                }
            except:
                status["model_versions"] = {"error": "Unable to fetch versions"}
        
        # Add monitoring info
        if self.monitor:
            status["monitoring"] = self.monitor.get_model_dashboard(
                self.model_type,
                self.current_version or "current"
            )
        
        # Add A/B test info
        if self.ab_framework and self.active_experiment:
            try:
                status["active_experiment"] = await self.ab_framework.get_experiment_results(
                    self.active_experiment
                )
            except:
                status["active_experiment"] = None
        
        return status
    
    def cleanup(self):
        """Cleanup resources"""
        if self.monitor:
            self.monitor.stop_background_monitoring()
        
        logger.info(f"Cleaned up {self.workflow_name}")