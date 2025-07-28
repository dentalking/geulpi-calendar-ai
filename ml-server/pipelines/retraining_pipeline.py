#!/usr/bin/env python3
"""
Automated Model Retraining Pipeline
Inspired by Apache Airflow DAG patterns for ML model lifecycle management
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import json
import numpy as np
from threading import Lock
import schedule
import os

from models.model_registry import ModelRegistry, ModelMetrics, ModelStage
from models.model_optimizer import ModelOptimizer, AutoMLOptimizer
from models.monitoring import ModelMonitor
from models.ab_testing import ABTestingFramework, Experiment, ExperimentStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskStatus(str, Enum):
    """Task execution status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRY = "retry"

class TriggerCondition(str, Enum):
    """Pipeline trigger conditions"""
    SCHEDULED = "scheduled"
    DATA_DRIFT = "data_drift"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    MANUAL = "manual"
    MODEL_FEEDBACK = "model_feedback"

@dataclass
class TaskConfig:
    """Configuration for pipeline tasks"""
    task_id: str
    function: Callable
    dependencies: List[str] = None
    retry_count: int = 3
    timeout_seconds: int = 3600
    resources: Dict[str, Any] = None
    on_failure: str = "fail"  # fail, skip, continue

@dataclass
class PipelineConfig:
    """Configuration for retraining pipeline"""
    pipeline_id: str
    model_name: str
    schedule_interval: str = "0 2 * * *"  # Daily at 2 AM
    max_concurrent_tasks: int = 4
    retry_policy: Dict[str, Any] = None
    notifications: Dict[str, Any] = None
    
@dataclass
class TaskResult:
    """Result of a task execution"""
    task_id: str
    status: TaskStatus
    start_time: datetime
    end_time: Optional[datetime]
    output: Dict[str, Any]
    error: Optional[str] = None
    metrics: Dict[str, float] = None

class RetrainingPipeline:
    """Automated model retraining pipeline"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.tasks: Dict[str, TaskConfig] = {}
        self.task_results: Dict[str, TaskResult] = {}
        self.pipeline_state = {}
        self.is_running = False
        self.lock = Lock()
        
        # Components
        self.model_registry = ModelRegistry()
        self.optimizer = ModelOptimizer()
        self.monitor = ModelMonitor()
        self.ab_framework = ABTestingFramework()
        
        # Schedule setup
        self._setup_scheduled_triggers()
        self._setup_event_triggers()
        
    def add_task(self, task_config: TaskConfig):
        """Add a task to the pipeline"""
        self.tasks[task_config.task_id] = task_config
        logger.info(f"Added task: {task_config.task_id}")
    
    def _setup_scheduled_triggers(self):
        """Setup time-based triggers"""
        if self.config.schedule_interval:
            # Parse cron-like schedule
            if self.config.schedule_interval == "@daily":
                schedule.every().day.at("02:00").do(self._trigger_pipeline, TriggerCondition.SCHEDULED)
            elif self.config.schedule_interval == "@hourly":
                schedule.every().hour.at(":00").do(self._trigger_pipeline, TriggerCondition.SCHEDULED)
            elif self.config.schedule_interval.startswith("0 "):
                # Parse simple cron format "0 2 * * *" -> daily at 2 AM
                parts = self.config.schedule_interval.split()
                if len(parts) >= 2:
                    hour = int(parts[1])
                    schedule.every().day.at(f"{hour:02d}:00").do(self._trigger_pipeline, TriggerCondition.SCHEDULED)
    
    def _setup_event_triggers(self):
        """Setup event-based triggers"""
        # Monitor for data drift
        asyncio.create_task(self._monitor_drift())
        
        # Monitor for performance degradation
        asyncio.create_task(self._monitor_performance())
    
    async def _monitor_drift(self):
        """Monitor for data drift and trigger retraining"""
        while True:
            try:
                # Check drift from monitoring system
                dashboard = self.monitor.get_model_dashboard(self.config.model_name, "current")
                
                # Simplified drift check
                if dashboard.get("health_status") == "critical":
                    logger.warning(f"Critical health status detected for {self.config.model_name}")
                    await self._trigger_pipeline(TriggerCondition.DATA_DRIFT)
                
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error monitoring drift: {e}")
                await asyncio.sleep(60)
    
    async def _monitor_performance(self):
        """Monitor for performance degradation"""
        while True:
            try:
                dashboard = self.monitor.get_model_dashboard(self.config.model_name, "current")
                stats = dashboard.get("statistics", {})
                
                # Check performance thresholds
                if (stats.get("success_rate", 1.0) < 0.90 or 
                    stats.get("recent_accuracy", 1.0) < 0.85):
                    
                    logger.warning(f"Performance degradation detected for {self.config.model_name}")
                    await self._trigger_pipeline(TriggerCondition.PERFORMANCE_DEGRADATION)
                
                await asyncio.sleep(600)  # Check every 10 minutes
            except Exception as e:
                logger.error(f"Error monitoring performance: {e}")
                await asyncio.sleep(120)
    
    async def _trigger_pipeline(self, trigger: TriggerCondition):
        """Trigger pipeline execution"""
        with self.lock:
            if self.is_running:
                logger.info(f"Pipeline already running, skipping trigger: {trigger}")
                return
            
            self.is_running = True
        
        try:
            logger.info(f"Triggering pipeline due to: {trigger}")
            await self._execute_pipeline(trigger)
        finally:
            with self.lock:
                self.is_running = False
    
    async def _execute_pipeline(self, trigger: TriggerCondition):
        """Execute the complete pipeline"""
        start_time = datetime.now()
        pipeline_success = True
        
        try:
            # Initialize pipeline state
            self.pipeline_state = {
                "trigger": trigger,
                "start_time": start_time,
                "model_name": self.config.model_name
            }
            
            # Build execution plan
            execution_plan = self._build_execution_plan()
            
            # Execute tasks in dependency order
            for batch in execution_plan:
                batch_tasks = []
                for task_id in batch:
                    task_config = self.tasks[task_id]
                    batch_tasks.append(self._execute_task(task_config))
                
                # Execute batch concurrently
                results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Check for failures
                for i, result in enumerate(results):
                    task_id = batch[i]
                    if isinstance(result, Exception):
                        logger.error(f"Task {task_id} failed: {result}")
                        self.task_results[task_id] = TaskResult(
                            task_id=task_id,
                            status=TaskStatus.FAILED,
                            start_time=datetime.now(),
                            end_time=datetime.now(),
                            output={},
                            error=str(result)
                        )
                        pipeline_success = False
                        break
                
                if not pipeline_success:
                    break
            
            # Pipeline completion
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"Pipeline completed in {duration:.2f}s with status: {'SUCCESS' if pipeline_success else 'FAILED'}")
            
            # Send notifications
            await self._send_notifications(pipeline_success, duration, trigger)
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            await self._send_notifications(False, 0, trigger, str(e))
    
    def _build_execution_plan(self) -> List[List[str]]:
        """Build DAG execution plan with dependency resolution"""
        # Simple topological sort for task dependencies
        execution_plan = []
        remaining_tasks = set(self.tasks.keys())
        completed_tasks = set()
        
        while remaining_tasks:
            # Find tasks with no unmet dependencies
            ready_tasks = []
            for task_id in remaining_tasks:
                task = self.tasks[task_id]
                dependencies = task.dependencies or []
                
                if all(dep in completed_tasks for dep in dependencies):
                    ready_tasks.append(task_id)
            
            if not ready_tasks:
                # Circular dependency or missing dependency
                logger.error(f"Cannot resolve dependencies for: {remaining_tasks}")
                break
            
            execution_plan.append(ready_tasks)
            completed_tasks.update(ready_tasks)
            remaining_tasks -= set(ready_tasks)
        
        return execution_plan
    
    async def _execute_task(self, task_config: TaskConfig) -> TaskResult:
        """Execute a single task with retry logic"""
        task_id = task_config.task_id
        start_time = datetime.now()
        
        for attempt in range(task_config.retry_count + 1):
            try:
                logger.info(f"Executing task: {task_id} (attempt {attempt + 1})")
                
                # Execute task function
                if asyncio.iscoroutinefunction(task_config.function):
                    output = await asyncio.wait_for(
                        task_config.function(self.pipeline_state),
                        timeout=task_config.timeout_seconds
                    )
                else:
                    output = await asyncio.wait_for(
                        asyncio.to_thread(task_config.function, self.pipeline_state),
                        timeout=task_config.timeout_seconds
                    )
                
                # Task succeeded
                result = TaskResult(
                    task_id=task_id,
                    status=TaskStatus.SUCCESS,
                    start_time=start_time,
                    end_time=datetime.now(),
                    output=output or {}
                )
                
                self.task_results[task_id] = result
                logger.info(f"Task {task_id} completed successfully")
                return result
                
            except asyncio.TimeoutError:
                error_msg = f"Task {task_id} timed out after {task_config.timeout_seconds}s"
                logger.error(error_msg)
                
                if attempt < task_config.retry_count:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                
                result = TaskResult(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    start_time=start_time,
                    end_time=datetime.now(),
                    output={},
                    error=error_msg
                )
                
            except Exception as e:
                error_msg = f"Task {task_id} failed: {str(e)}"
                logger.error(error_msg)
                
                if attempt < task_config.retry_count:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                
                result = TaskResult(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    start_time=start_time,
                    end_time=datetime.now(),
                    output={},
                    error=error_msg
                )
        
        self.task_results[task_id] = result
        return result
    
    async def _send_notifications(self, success: bool, duration: float, trigger: TriggerCondition, error: str = None):
        """Send pipeline completion notifications"""
        if not self.config.notifications:
            return
        
        status = "SUCCESS" if success else "FAILED"
        message = {
            "pipeline_id": self.config.pipeline_id,
            "model_name": self.config.model_name,
            "status": status,
            "trigger": trigger.value,
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat(),
            "error": error
        }
        
        logger.info(f"Pipeline notification: {json.dumps(message, indent=2)}")
    
    def run_scheduler(self):
        """Run the scheduled pipeline checks"""
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

# Pre-defined pipeline tasks
class PipelineTasks:
    """Collection of common pipeline tasks"""
    
    @staticmethod
    async def collect_training_data(state: Dict[str, Any]) -> Dict[str, Any]:
        """Collect fresh training data"""
        logger.info("Collecting training data...")
        
        # Simulate data collection
        await asyncio.sleep(2)
        
        # In real implementation, this would:
        # - Query databases for new data
        # - Apply data quality checks
        # - Prepare training/validation splits
        
        sample_size = np.random.randint(5000, 15000)
        data_quality = np.random.uniform(0.85, 0.98)
        
        return {
            "data_size": sample_size,
            "data_quality": data_quality,
            "data_path": f"/tmp/training_data_{int(time.time())}"
        }
    
    @staticmethod
    async def validate_data_quality(state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate data quality"""
        logger.info("Validating data quality...")
        
        # Get data from previous task
        data_info = state.get("collect_training_data", {})
        data_quality = data_info.get("data_quality", 0.0)
        
        if data_quality < 0.90:
            raise ValueError(f"Data quality {data_quality:.2f} below threshold 0.90")
        
        return {"validation_passed": True, "quality_score": data_quality}
    
    @staticmethod
    async def train_candidate_model(state: Dict[str, Any]) -> Dict[str, Any]:
        """Train a new candidate model"""
        logger.info("Training candidate model...")
        
        # Simulate training with optimization
        await asyncio.sleep(5)
        
        # In real implementation:
        # - Load training data
        # - Run hyperparameter optimization
        # - Train best model
        # - Evaluate performance
        
        accuracy = np.random.uniform(0.88, 0.96)
        latency_ms = np.random.uniform(35, 85)  # Target < 100ms
        
        return {
            "model_version": f"v{int(time.time())}",
            "accuracy": accuracy,
            "latency_ms": latency_ms,
            "model_size_mb": np.random.uniform(5, 25)
        }
    
    @staticmethod
    async def validate_candidate_model(state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate candidate model"""
        logger.info("Validating candidate model...")
        
        model_info = state.get("train_candidate_model", {})
        accuracy = model_info.get("accuracy", 0.0)
        latency_ms = model_info.get("latency_ms", 1000)
        
        # Validation thresholds
        if accuracy < 0.90:
            raise ValueError(f"Model accuracy {accuracy:.3f} below threshold 0.90")
        
        if latency_ms > 100:
            raise ValueError(f"Model latency {latency_ms:.1f}ms above threshold 100ms")
        
        return {"validation_passed": True}
    
    @staticmethod
    async def register_model_version(state: Dict[str, Any]) -> Dict[str, Any]:
        """Register new model version"""
        logger.info("Registering model version...")
        
        model_info = state.get("train_candidate_model", {})
        model_name = state.get("model_name", "unknown_model")
        
        # Simulate model registration
        version = model_info.get("model_version", "v1")
        
        return {
            "registered_version": version,
            "stage": "staging",
            "registry_id": f"{model_name}_{version}"
        }
    
    @staticmethod
    async def run_ab_test(state: Dict[str, Any]) -> Dict[str, Any]:
        """Run A/B test between current and candidate model"""
        logger.info("Running A/B test...")
        
        # Simulate A/B test
        await asyncio.sleep(3)
        
        model_info = state.get("train_candidate_model", {})
        candidate_accuracy = model_info.get("accuracy", 0.90)
        
        # Simulate current model performance
        current_accuracy = np.random.uniform(0.85, 0.93)
        
        improvement = candidate_accuracy - current_accuracy
        statistical_significance = abs(improvement) > 0.02
        
        return {
            "candidate_better": improvement > 0,
            "improvement": improvement,
            "statistical_significance": statistical_significance,
            "test_duration_hours": 2
        }
    
    @staticmethod
    async def promote_to_production(state: Dict[str, Any]) -> Dict[str, Any]:
        """Promote model to production"""
        logger.info("Promoting model to production...")
        
        ab_test_result = state.get("run_ab_test", {})
        model_info = state.get("register_model_version", {})
        
        if not ab_test_result.get("candidate_better", False):
            logger.info("Candidate model not better, skipping promotion")
            return {"promoted": False, "reason": "candidate_not_better"}
        
        version = model_info.get("registered_version", "unknown")
        
        return {
            "promoted": True,
            "production_version": version,
            "promotion_time": datetime.now().isoformat()
        }

def create_standard_retraining_pipeline(model_name: str) -> RetrainingPipeline:
    """Create a standard retraining pipeline for a model"""
    
    config = PipelineConfig(
        pipeline_id=f"{model_name}_retraining",
        model_name=model_name,
        schedule_interval="0 2 * * *",  # Daily at 2 AM
        max_concurrent_tasks=2,
        notifications={"slack": True, "email": True}
    )
    
    pipeline = RetrainingPipeline(config)
    
    # Add tasks in dependency order
    pipeline.add_task(TaskConfig(
        task_id="collect_training_data",
        function=PipelineTasks.collect_training_data,
        timeout_seconds=1800
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="validate_data_quality",
        function=PipelineTasks.validate_data_quality,
        dependencies=["collect_training_data"]
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="train_candidate_model",
        function=PipelineTasks.train_candidate_model,
        dependencies=["validate_data_quality"],
        timeout_seconds=3600
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="validate_candidate_model",
        function=PipelineTasks.validate_candidate_model,
        dependencies=["train_candidate_model"]
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="register_model_version",
        function=PipelineTasks.register_model_version,
        dependencies=["validate_candidate_model"]
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="run_ab_test",
        function=PipelineTasks.run_ab_test,
        dependencies=["register_model_version"],
        timeout_seconds=7200  # 2 hours for A/B test
    ))
    
    pipeline.add_task(TaskConfig(
        task_id="promote_to_production",
        function=PipelineTasks.promote_to_production,
        dependencies=["run_ab_test"],
        on_failure="continue"  # Don't fail if promotion is skipped
    ))
    
    return pipeline

async def main():
    """Main function to run retraining pipeline"""
    # Create pipeline for event classifier
    pipeline = create_standard_retraining_pipeline("event_classifier")
    
    # Start monitoring tasks
    monitor_task = asyncio.create_task(pipeline._monitor_drift())
    performance_task = asyncio.create_task(pipeline._monitor_performance())
    
    # Run scheduler in background
    import threading
    scheduler_thread = threading.Thread(target=pipeline.run_scheduler, daemon=True)
    scheduler_thread.start()
    
    logger.info("Retraining pipeline started. Monitoring for triggers...")
    
    # Keep running
    try:
        await asyncio.gather(monitor_task, performance_task)
    except KeyboardInterrupt:
        logger.info("Shutting down retraining pipeline...")

if __name__ == "__main__":
    asyncio.run(main())