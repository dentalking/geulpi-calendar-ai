#!/usr/bin/env python3
"""
Enhanced model training script with optimization and versioning
"""

import asyncio
import logging
import os
import numpy as np
from datetime import datetime, timedelta
import json
from typing import Dict, Any, List, Tuple

from models.classifiers import EventClassifier
from models.optimizer import ScheduleOptimizer
from models.pattern_detector import PatternDetector
from models.burnout_predictor import BurnoutPredictor
from models.model_registry import ModelRegistry, ModelMetrics, ModelStage
from models.model_optimizer import ModelOptimizer, AutoMLOptimizer
from models.version_manager import version_manager
import mlflow

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedModelTrainer:
    """Enhanced trainer with optimization and versioning"""
    
    def __init__(self):
        self.model_registry = ModelRegistry()
        self.optimizer = ModelOptimizer()
        self.model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
        os.makedirs(self.model_path, exist_ok=True)
    
    def generate_enhanced_event_data(self, n_samples: int = 10000) -> Tuple[List[str], np.ndarray, np.ndarray]:
        """Generate enhanced synthetic training data for event classification"""
        logger.info(f"Generating {n_samples} enhanced training samples...")
        
        # Enhanced templates with more variety
        templates = {
            'WORK': [
                "{} team meeting with {}",
                "Project {} review and planning",
                "Client call regarding {}",
                "Sprint planning for {}",
                "Code review: {}",
                "1:1 with {} about {}",
                "{} presentation preparation",
                "Deadline: {} deliverable",
                "Interview candidate for {} position",
                "Budget review for {} project",
                "Performance review discussion",
                "Strategic planning: {}"
            ],
            'HEALTH': [
                "{} workout at gym",
                "Running {} miles",
                "Yoga and meditation session",
                "Doctor appointment: {}",
                "Personal training: {}",
                "Swimming {} laps",
                "Annual health checkup",
                "{} fitness class",
                "Nutrition consultation",
                "Mental health check-in",
                "Physical therapy for {}",
                "Sleep study appointment"
            ],
            'SOCIAL': [
                "Dinner with {} at {}",
                "{}'s birthday celebration",
                "Coffee catch-up with {}",
                "Movie night: {}",
                "Game night with friends",
                "Networking event at {}",
                "Happy hour with {} team",
                "Weekend trip to {}",
                "Concert: {}",
                "Book club meeting",
                "Community volunteer at {}",
                "Date night at {}"
            ],
            'LEARNING': [
                "Study {}: Chapter {}",
                "Online course: {}",
                "{} tutorial session",
                "Workshop: {} fundamentals",
                "Certification prep: {}",
                "Research paper on {}",
                "Conference: {}",
                "Webinar: {} best practices",
                "Practice {} skills",
                "Language learning: {}",
                "Professional development: {}",
                "Skill assessment: {}"
            ],
            'PERSONAL': [
                "Grocery shopping at {}",
                "House cleaning: {} room",
                "Personal project: {}",
                "Errands: {} and {}",
                "Car maintenance at {}",
                "Banking and finances",
                "Home improvement: {}",
                "Meal prep for week",
                "Organize {}",
                "Self-care: {}",
                "Plan {} vacation",
                "Review {} goals"
            ]
        }
        
        # Enhanced topics and names
        topics = [
            "AI/ML", "Python", "JavaScript", "Cloud", "DevOps", "Security",
            "Marketing", "Sales", "Finance", "Product", "Design", "Data Science",
            "Backend", "Frontend", "Mobile", "Infrastructure", "Analytics", "Strategy"
        ]
        
        names = [
            "Sarah", "John", "Maria", "David", "Lisa", "Michael", "Emma", "James",
            "engineering", "product", "design", "leadership", "executive", "stakeholders"
        ]
        
        places = [
            "Downtown", "Westside", "Italian restaurant", "Coffee shop", 
            "Conference center", "Park", "Beach", "Mountains", "City center"
        ]
        
        # Generate samples
        texts = []
        temporal_features = []
        labels = []
        
        # Add noise and edge cases
        noise_ratio = 0.05
        
        for i in range(n_samples):
            if np.random.random() < noise_ratio:
                # Add noisy/ambiguous samples
                text = np.random.choice([
                    "Busy day ahead",
                    "Important stuff",
                    "TBD",
                    "Placeholder",
                    "Check calendar"
                ])
                category = "OTHER"
            else:
                # Normal samples
                category = np.random.choice(list(templates.keys()))
                template = np.random.choice(templates[category])
                
                # Fill template
                n_placeholders = template.count("{}")
                if n_placeholders == 0:
                    text = template
                elif n_placeholders == 1:
                    if category in ['WORK', 'LEARNING']:
                        text = template.format(np.random.choice(topics))
                    elif category == 'SOCIAL':
                        text = template.format(np.random.choice(names))
                    else:
                        text = template.format(np.random.choice(places))
                else:
                    fills = []
                    for _ in range(n_placeholders):
                        if np.random.random() < 0.5:
                            fills.append(np.random.choice(topics))
                        else:
                            fills.append(np.random.choice(names))
                    text = template.format(*fills)
            
            texts.append(text)
            
            # Generate realistic temporal features
            if category == 'WORK':
                hour = np.random.choice([9, 10, 11, 14, 15, 16], p=[0.2, 0.2, 0.1, 0.2, 0.2, 0.1])
                dow = np.random.choice([0, 1, 2, 3, 4], p=[0.2, 0.25, 0.25, 0.25, 0.05])
                duration = np.random.choice([0.5, 1.0, 1.5, 2.0], p=[0.3, 0.4, 0.2, 0.1])
            elif category == 'HEALTH':
                hour = np.random.choice([6, 7, 8, 17, 18, 19], p=[0.2, 0.2, 0.1, 0.2, 0.2, 0.1])
                dow = np.random.randint(0, 7)
                duration = np.random.choice([0.5, 1.0, 1.5], p=[0.2, 0.6, 0.2])
            elif category == 'SOCIAL':
                hour = np.random.choice([12, 13, 18, 19, 20, 21], p=[0.1, 0.1, 0.2, 0.3, 0.2, 0.1])
                dow = np.random.choice([4, 5, 6], p=[0.3, 0.4, 0.3])
                duration = np.random.choice([1.0, 2.0, 3.0, 4.0], p=[0.1, 0.4, 0.3, 0.2])
            elif category == 'LEARNING':
                hour = np.random.choice([9, 10, 14, 15, 19, 20], p=[0.1, 0.1, 0.2, 0.2, 0.2, 0.2])
                dow = np.random.randint(0, 7)
                duration = np.random.choice([1.0, 1.5, 2.0, 3.0], p=[0.2, 0.3, 0.3, 0.2])
            else:  # PERSONAL/OTHER
                hour = np.random.randint(8, 22)
                dow = np.random.choice([5, 6], p=[0.4, 0.6]) if np.random.random() < 0.6 else np.random.randint(0, 5)
                duration = np.random.choice([0.5, 1.0, 2.0], p=[0.3, 0.5, 0.2])
            
            # Add some variance
            hour = max(0, min(23, hour + np.random.randint(-1, 2)))
            duration = max(0.25, duration + np.random.normal(0, 0.25))
            
            # Create temporal features
            start_time = datetime(2024, 1, 1 + dow, hour)
            end_time = start_time + timedelta(hours=duration)
            
            classifier = EventClassifier()
            temp_feat = classifier._extract_temporal_features(start_time, end_time)
            temporal_features.append(temp_feat[0])
            
            # Label
            labels.append(classifier.category_to_idx.get(category, 5))
        
        logger.info(f"Generated {len(texts)} samples with distribution: {np.bincount(labels)}")
        return texts, np.array(temporal_features), np.array(labels)
    
    async def train_event_classifier_enhanced(self):
        """Train event classifier with optimization and versioning"""
        logger.info("=== Training Enhanced Event Classifier ===")
        
        # Generate enhanced training data
        X_text, X_temporal, y = self.generate_enhanced_event_data(n_samples=5000)
        
        # Create classifier
        classifier = EventClassifier()
        
        # Feature extraction
        logger.info("Extracting features...")
        X_text_features = classifier.text_vectorizer.fit_transform(X_text)
        X_combined = classifier._combine_features(X_text_features, X_temporal)
        X_scaled = classifier.scaler.fit_transform(X_combined)
        
        # Split data
        from sklearn.model_selection import train_test_split
        X_train, X_val, y_train, y_val = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Optimize hyperparameters
        logger.info("Optimizing hyperparameters...")
        opt_result = self.optimizer.optimize_hyperparameters(
            model_type="RandomForest",
            X_train=X_train,
            y_train=y_train,
            n_trials=30,
            optimization_metric="f1_weighted"
        )
        
        logger.info(f"Best parameters: {opt_result.best_params}")
        logger.info(f"Best score: {opt_result.best_score:.4f}")
        
        # Train final model with best params
        from sklearn.ensemble import RandomForestClassifier
        final_model = RandomForestClassifier(**opt_result.best_params, n_jobs=-1)
        final_model.fit(X_train, y_train)
        
        # Evaluate
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        y_pred = final_model.predict(X_val)
        
        metrics = ModelMetrics(
            accuracy=accuracy_score(y_val, y_pred),
            precision=precision_score(y_val, y_pred, average='weighted'),
            recall=recall_score(y_val, y_pred, average='weighted'),
            f1_score=f1_score(y_val, y_pred, average='weighted'),
            latency_ms=opt_result.inference_time_ms,
            memory_mb=opt_result.memory_usage_mb,
            custom_metrics={
                "n_features": X_train.shape[1],
                "n_trees": final_model.n_estimators,
                "optimization_score": opt_result.best_score
            }
        )
        
        logger.info(f"Validation metrics: {metrics}")
        
        # Update classifier with optimized model
        classifier.model = final_model
        classifier.is_trained = True
        
        # Save locally using traditional method for backward compatibility
        classifier.save_model(self.model_path)
        
        # Also save with version manager
        version_info = version_manager.save_model(
            model=classifier,
            model_name="event_classifier",
            metrics={
                "accuracy": float(metrics["accuracy"]),
                "precision": float(metrics["precision"]),
                "recall": float(metrics["recall"]),
                "f1": float(metrics["f1"])
            },
            metadata={
                "training_samples": len(texts),
                "feature_dim": features.shape[1],
                "categories": list(classifier.label_encoder.classes_)
            }
        )
        logger.info(f"Saved EventClassifier as version {version_info.version}")
        
        # Register in MLflow
        try:
            version = self.model_registry.register_model(
                model=classifier,
                model_name="event_classifier",
                metrics=metrics,
                tags={
                    "optimizer": "optuna",
                    "n_trials": "30",
                    "training_samples": str(len(X_train))
                },
                description="Optimized event classifier with enhanced features"
            )
            
            logger.info(f"Registered model version {version}")
            
            # Promote to staging
            self.model_registry.promote_model("event_classifier", version, ModelStage.STAGING)
            logger.info(f"Promoted version {version} to staging")
            
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
    
    async def compare_models(self, model_name: str):
        """Compare different versions of a model"""
        logger.info(f"=== Comparing {model_name} Versions ===")
        
        try:
            versions = self.model_registry.client.search_model_versions(f"name='{model_name}'")
            
            if len(versions) < 2:
                logger.info("Not enough versions to compare")
                return
            
            # Sort by version number
            versions.sort(key=lambda x: int(x.version))
            
            # Compare last two versions
            v1, v2 = versions[-2], versions[-1]
            
            logger.info(f"\nComparing version {v1.version} vs {v2.version}:")
            
            # Get metrics
            run1 = self.model_registry.client.get_run(v1.run_id)
            run2 = self.model_registry.client.get_run(v2.run_id)
            
            metrics1 = run1.data.metrics
            metrics2 = run2.data.metrics
            
            # Compare key metrics
            for metric in ['accuracy', 'f1_score', 'latency_ms']:
                if metric in metrics1 and metric in metrics2:
                    val1 = metrics1[metric]
                    val2 = metrics2[metric]
                    improvement = ((val2 - val1) / val1) * 100 if metric != 'latency_ms' else ((val1 - val2) / val1) * 100
                    logger.info(f"  {metric}: {val1:.4f} → {val2:.4f} ({improvement:+.1f}%)")
            
        except Exception as e:
            logger.error(f"Comparison failed: {e}")
    
    def generate_schedule_data(self, n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic data for schedule optimization"""
        logger.info(f"Generating {n_samples} schedule optimization samples...")
        
        # Features: [hour, day_of_week, event_count, work_hours, personal_hours, priority_avg]
        X = []
        y = []  # optimization score
        
        for _ in range(n_samples):
            hour = np.random.randint(0, 24)
            day_of_week = np.random.randint(0, 7)
            event_count = np.random.randint(0, 10)
            work_hours = np.random.uniform(0, 12)
            personal_hours = np.random.uniform(0, 8)
            priority_avg = np.random.uniform(1, 5)
            
            # Calculate optimization score based on balance
            balance_score = 1 - abs(work_hours - personal_hours) / 10
            efficiency_score = (24 - event_count) / 24 if event_count < 24 else 0
            priority_score = priority_avg / 5
            
            optimization_score = (balance_score * 0.4 + efficiency_score * 0.3 + priority_score * 0.3)
            
            X.append([hour, day_of_week, event_count, work_hours, personal_hours, priority_avg])
            y.append(optimization_score)
        
        return np.array(X), np.array(y)
    
    def generate_pattern_data(self, n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic data for pattern detection"""
        logger.info(f"Generating {n_samples} pattern detection samples...")
        
        # Features: weekly aggregated features
        X = []
        y = []  # pattern labels (0: normal, 1: overloaded, 2: underutilized)
        
        for _ in range(n_samples):
            avg_daily_events = np.random.uniform(0, 15)
            work_ratio = np.random.uniform(0, 1)
            weekend_activity = np.random.uniform(0, 1)
            consistency_score = np.random.uniform(0, 1)
            
            # Determine pattern
            if avg_daily_events > 10 and work_ratio > 0.8:
                pattern = 1  # overloaded
            elif avg_daily_events < 3 and work_ratio < 0.3:
                pattern = 2  # underutilized
            else:
                pattern = 0  # normal
            
            X.append([avg_daily_events, work_ratio, weekend_activity, consistency_score])
            y.append(pattern)
        
        return np.array(X), np.array(y)
    
    def generate_burnout_data(self, n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic data for burnout prediction"""
        logger.info(f"Generating {n_samples} burnout prediction samples...")
        
        # Features: [work_hours_weekly, personal_time_weekly, stress_indicators, recovery_time]
        X = []
        y = []  # burnout risk (0-1)
        
        for _ in range(n_samples):
            work_hours_weekly = np.random.uniform(20, 80)
            personal_time_weekly = np.random.uniform(0, 40)
            stress_indicators = np.random.uniform(0, 10)
            recovery_time = np.random.uniform(0, 20)
            
            # Calculate burnout risk
            work_stress = min(work_hours_weekly / 40, 2.0) * 0.4
            personal_deficit = max(0, 1 - personal_time_weekly / 20) * 0.3
            stress_level = stress_indicators / 10 * 0.2
            recovery_deficit = max(0, 1 - recovery_time / 10) * 0.1
            
            burnout_risk = min(1.0, work_stress + personal_deficit + stress_level + recovery_deficit)
            
            X.append([work_hours_weekly, personal_time_weekly, stress_indicators, recovery_time])
            y.append(burnout_risk)
        
        return np.array(X), np.array(y)
    
    async def train_schedule_optimizer(self):
        """Train schedule optimization model"""
        logger.info("=== Training Schedule Optimizer ===")
        
        try:
            # Generate data
            X, y = self.generate_schedule_data()
            
            # Initialize and train model
            optimizer = ScheduleOptimizer()
            optimizer.train(X, y)
            
            # Save model using traditional method
            model_path = os.path.join(self.model_path, "schedule_optimizer.pkl")
            optimizer.save_model(model_path)
            logger.info(f"Saved schedule optimizer to {model_path}")
            
            # Also save with version manager
            version_info = version_manager.save_model(
                model=optimizer,
                model_name="schedule_optimizer",
                metrics={
                    "mse": float(mse),
                    "mae": float(mae),
                    "r2": float(r2)
                },
                metadata={
                    "training_samples": len(schedules),
                    "feature_dim": features.shape[1]
                }
            )
            logger.info(f"Saved ScheduleOptimizer as version {version_info.version}")
            
            # Register with MLflow
            with mlflow.start_run(run_name="schedule_optimizer_training"):
                # Log metrics
                from sklearn.metrics import mean_squared_error, r2_score
                predictions = optimizer.predict(X[:100])
                mse = mean_squared_error(y[:100], predictions)
                r2 = r2_score(y[:100], predictions)
                
                mlflow.log_metric("mse", mse)
                mlflow.log_metric("r2_score", r2)
                
                logger.info(f"Schedule Optimizer - MSE: {mse:.4f}, R2: {r2:.4f}")
                
        except Exception as e:
            logger.error(f"Failed to train schedule optimizer: {e}")
    
    async def train_pattern_detector(self):
        """Train pattern detection model"""
        logger.info("=== Training Pattern Detector ===")
        
        try:
            # Generate data
            X, y = self.generate_pattern_data()
            
            # Initialize and train model
            detector = PatternDetector()
            detector.train(X, y)
            
            # Save model using traditional method
            model_path = os.path.join(self.model_path, "pattern_detector.pkl")
            detector.save_model(model_path)
            logger.info(f"Saved pattern detector to {model_path}")
            
            # Also save with version manager
            version_info = version_manager.save_model(
                model=detector,
                model_name="pattern_detector",
                metrics={
                    "silhouette": float(detector.silhouette_score_ if hasattr(detector, 'silhouette_score_') else 0.0),
                    "n_patterns": float(detector.n_patterns_ if hasattr(detector, 'n_patterns_') else 0)
                },
                metadata={
                    "training_samples": len(patterns),
                    "clustering_method": detector.clustering_method if hasattr(detector, 'clustering_method') else "kmeans"
                }
            )
            logger.info(f"Saved PatternDetector as version {version_info.version}")
            
            # Register with MLflow
            with mlflow.start_run(run_name="pattern_detector_training"):
                # Log metrics
                from sklearn.metrics import accuracy_score, classification_report
                predictions = detector.detect_patterns(X[:100])
                accuracy = accuracy_score(y[:100], predictions)
                
                mlflow.log_metric("accuracy", accuracy)
                
                logger.info(f"Pattern Detector - Accuracy: {accuracy:.4f}")
                
        except Exception as e:
            logger.error(f"Failed to train pattern detector: {e}")
    
    async def train_burnout_predictor(self):
        """Train burnout prediction model"""
        logger.info("=== Training Burnout Predictor ===")
        
        try:
            # Generate data
            X, y = self.generate_burnout_data()
            
            # Initialize and train model
            predictor = BurnoutPredictor()
            predictor.train(X, y)
            
            # Save model using traditional method
            model_path = os.path.join(self.model_path, "burnout_predictor.pkl")
            predictor.save_model(model_path)
            logger.info(f"Saved burnout predictor to {model_path}")
            
            # Also save with version manager
            version_info = version_manager.save_model(
                model=predictor,
                model_name="burnout_predictor",
                metrics={
                    "accuracy": float(accuracy),
                    "auc": float(auc_score)
                },
                metadata={
                    "training_samples": len(behaviors),
                    "feature_dim": features.shape[1],
                    "risk_levels": list(predictor.label_encoder.classes_) if hasattr(predictor, 'label_encoder') else []
                }
            )
            logger.info(f"Saved BurnoutPredictor as version {version_info.version}")
            
            # Register with MLflow
            with mlflow.start_run(run_name="burnout_predictor_training"):
                # Log metrics
                from sklearn.metrics import mean_squared_error, r2_score
                predictions, _ = predictor.predict_burnout(X[:100])
                mse = mean_squared_error(y[:100], predictions)
                r2 = r2_score(y[:100], predictions)
                
                mlflow.log_metric("mse", mse)
                mlflow.log_metric("r2_score", r2)
                
                logger.info(f"Burnout Predictor - MSE: {mse:.4f}, R2: {r2:.4f}")
                
        except Exception as e:
            logger.error(f"Failed to train burnout predictor: {e}")
    
    async def run_automl_experiment(self, model_type: str = "event_classifier"):
        """Run AutoML experiment to find best model"""
        logger.info(f"=== Running AutoML for {model_type} ===")
        
        # Generate data
        if model_type == "event_classifier":
            X_text, X_temporal, y = self.generate_enhanced_event_data(n_samples=2000)
            
            # Feature extraction
            classifier = EventClassifier()
            X_text_features = classifier.text_vectorizer.fit_transform(X_text)
            X_combined = classifier._combine_features(X_text_features, X_temporal)
            X = classifier.scaler.fit_transform(X_combined)
        else:
            logger.warning(f"AutoML not implemented for {model_type}")
            return
        
        # Run AutoML
        automl = AutoMLOptimizer(time_budget_minutes=5)  # Quick test
        best_model, results = automl.find_best_model(X, y)
        
        logger.info(f"\nAutoML Results:")
        logger.info(f"Best model type: {results['model_type']}")
        
        for model_type, opt_result in results['optimization_results'].items():
            logger.info(f"\n{model_type}:")
            logger.info(f"  Best score: {opt_result.best_score:.4f}")
            logger.info(f"  Model size: {opt_result.model_size_mb:.2f} MB")
            logger.info(f"  Inference time: {opt_result.inference_time_ms:.2f} ms")

async def main():
    """Main training function"""
    trainer = EnhancedModelTrainer()
    
    logger.info("=== Starting Full Model Training Suite ===")
    
    # Train all models
    await trainer.train_event_classifier_enhanced()
    await trainer.train_schedule_optimizer()
    await trainer.train_pattern_detector()
    await trainer.train_burnout_predictor()
    
    # Compare versions for event classifier
    await trainer.compare_models("event_classifier")
    
    # Run AutoML experiment (optional)
    # await trainer.run_automl_experiment()
    
    logger.info("\n=== All Models Trained Successfully ===")
    logger.info("Models saved in: models/trained/")
    logger.info("- event_classifier.pkl")
    logger.info("- schedule_optimizer.pkl")
    logger.info("- pattern_detector.pkl")
    logger.info("- burnout_predictor.pkl")

if __name__ == "__main__":
    asyncio.run(main())