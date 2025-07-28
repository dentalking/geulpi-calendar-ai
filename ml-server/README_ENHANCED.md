# Geulpi ML Server - Enhanced Features

## Overview

The enhanced ML server adds enterprise-grade features to the Geulpi calendar service:

- **Model Versioning**: Track and manage multiple versions of ML models
- **A/B Testing**: Compare model performance in production
- **Performance Optimization**: Hyperparameter tuning and model compression
- **Real-time Monitoring**: Track model performance, drift, and health
- **MLOps Integration**: Full model lifecycle management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Enhanced ML Server                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Workflows     │  │Model Registry│  │  Monitoring  │  │
│  │                 │  │              │  │              │  │
│  │ • Event Class  │  │ • Versioning │  │ • Metrics    │  │
│  │ • Schedule Opt │  │ • Staging    │  │ • Drift      │  │
│  │ • Pattern Det  │  │ • Production │  │ • Alerts     │  │
│  │ • Balance      │  │ • Archive    │  │ • Dashboard  │  │
│  │ • Burnout      │  │              │  │              │  │
│  └─────────────────┘  └──────────────┘  └──────────────┘  │
│                                                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  A/B Testing    │  │  Optimizer   │  │   Storage    │  │
│  │                 │  │              │  │              │  │
│  │ • Experiments  │  │ • Hyperparam │  │ • MLflow     │  │
│  │ • Traffic Split│  │ • Compression│  │ • Redis      │  │
│  │ • Statistics   │  │ • AutoML     │  │ • Models     │  │
│  └─────────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Additional Dependencies

```bash
pip install -r requirements.txt

# Additional setup for MLflow
export MLFLOW_TRACKING_URI=mlruns  # or your MLflow server URL
```

### Redis Setup (Required for A/B Testing and Caching)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu
```

## Running the Enhanced Server

```bash
# Run the enhanced version (port 8001)
python main_enhanced.py

# Or run with environment variables
MLFLOW_TRACKING_URI=http://mlflow-server:5000 \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
python main_enhanced.py
```

## New API Endpoints

### Model Management

#### Train New Model Version
```bash
curl -X POST http://localhost:8001/models/train \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "event_classifier",
    "optimize": true,
    "auto_promote": false,
    "n_optimization_trials": 50,
    "description": "Optimized event classifier with new features"
  }'
```

#### List Model Versions
```bash
curl http://localhost:8001/models/event_classifier/versions
```

#### Promote Model
```bash
curl -X POST "http://localhost:8001/models/event_classifier/promote?version=2&target_stage=Production"
```

### A/B Testing

#### Create Experiment
```bash
curl -X POST http://localhost:8001/experiments/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Event Classifier v1 vs v2",
    "description": "Compare baseline with optimized model",
    "model_type": "event_classifier",
    "variants": [
      {"name": "control", "version": "1", "traffic_percentage": 50},
      {"name": "treatment", "version": "2", "traffic_percentage": 50}
    ],
    "duration_hours": 24,
    "success_metrics": {
      "success_rate": {"threshold": 0.95, "weight": 1.0},
      "avg_latency_ms": {"threshold": 100, "weight": 0.5}
    }
  }'
```

#### Get Experiment Results
```bash
curl http://localhost:8001/experiments/{experiment_id}/results
```

#### Stop Experiment
```bash
curl -X POST http://localhost:8001/experiments/{experiment_id}/stop
```

### Monitoring

#### Model Dashboard
```bash
curl http://localhost:8001/monitoring/dashboard/event_classifier
```

Response:
```json
{
  "model_name": "event_classifier",
  "current_version": "2",
  "health_status": "healthy",
  "statistics": {
    "total_predictions": 10000,
    "success_rate": 0.98,
    "avg_latency_ms": 45.2,
    "recent_accuracy": 0.94
  },
  "performance_trend": {
    "trend": "stable",
    "hourly_data": [...]
  },
  "active_alerts": [],
  "drift_detected": false
}
```

#### Prometheus Metrics
```bash
# Get metrics in Prometheus format
curl http://localhost:8001/monitoring/metrics

# Example metrics:
# ml_predictions_total{model_name="event_classifier",model_version="2",status="success"} 9800.0
# ml_prediction_duration_seconds_bucket{le="0.05",model_name="event_classifier"} 8500.0
# ml_model_accuracy{model_name="event_classifier",model_version="2"} 0.94
# ml_drift_score{model_name="event_classifier",drift_type="feature"} 0.08
```

#### Active Alerts
```bash
curl http://localhost:8001/monitoring/alerts
```

### Enhanced Classification (v2)

```bash
curl -X POST http://localhost:8001/v2/classify-event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team standup meeting",
    "description": "Daily sync",
    "startTime": "2024-01-20T09:00:00",
    "endTime": "2024-01-20T09:30:00"
  }'
```

## Model Optimization Features

### Hyperparameter Optimization

The system uses Optuna for automated hyperparameter tuning:

- **Random Forest**: Optimizes n_estimators, max_depth, min_samples_split, etc.
- **XGBoost**: Optimizes learning_rate, max_depth, subsample, etc.
- **Multi-objective**: Can optimize for accuracy, latency, and model size

### Model Compression

- **Tree Pruning**: Remove less important trees from ensemble models
- **Quantization**: Reduce model precision (future feature)
- **Knowledge Distillation**: Train smaller models from larger ones (future feature)

### AutoML

Automatically finds the best model type and hyperparameters:

```python
automl = AutoMLOptimizer(time_budget_minutes=30)
best_model, results = automl.find_best_model(X_train, y_train)
```

## Monitoring and Alerts

### Default Alerts

- **Low Success Rate**: Triggers when success rate < 95%
- **High Latency**: Triggers when average latency > 100ms
- **Model Drift**: Triggers when drift score > 0.15

### Custom Alerts

```python
monitor.add_alert(Alert(
    name="custom_accuracy_alert",
    metric_name="accuracy",
    condition="<",
    threshold=0.90,
    window_seconds=300,
    severity="critical",
    message_template="Model accuracy dropped to {value:.2%}"
))
```

## Best Practices

### Model Versioning

1. **Semantic Versioning**: Use major.minor.patch for model versions
2. **Stage Progression**: None → Staging → Production → Archived
3. **Validation**: Always validate in staging before production

### A/B Testing

1. **Sample Size**: Ensure minimum 1000 requests per variant
2. **Duration**: Run for at least 24 hours to capture patterns
3. **Metrics**: Define clear success criteria before starting

### Performance Optimization

1. **Baseline First**: Always establish baseline performance
2. **Incremental**: Optimize one aspect at a time
3. **Trade-offs**: Balance accuracy vs latency vs model size

### Monitoring

1. **Real-time Alerts**: Set up critical alerts for production
2. **Drift Detection**: Monitor feature distributions
3. **Performance Tracking**: Track accuracy over time

## Testing

### Run Test Suite

```bash
# Run all tests
python test_enhanced_features.py

# Simulate production traffic
python test_enhanced_features.py --simulate-traffic
```

### Integration Tests

```bash
# Test with MLflow server
MLFLOW_TRACKING_URI=http://localhost:5000 pytest tests/test_model_registry.py

# Test with Redis
REDIS_HOST=localhost pytest tests/test_ab_testing.py
```

## Troubleshooting

### Common Issues

1. **MLflow Connection Error**
   ```bash
   # Check MLflow server
   curl http://localhost:5000/health
   
   # Use file-based tracking
   export MLFLOW_TRACKING_URI=file:///path/to/mlruns
   ```

2. **Redis Connection Error**
   ```bash
   # Check Redis
   redis-cli ping
   
   # Run without Redis (limited functionality)
   DISABLE_REDIS=true python main_enhanced.py
   ```

3. **Model Not Found**
   ```bash
   # List all models
   mlflow models list
   
   # Register model manually
   mlflow models create event_classifier
   ```

## Future Enhancements

1. **Model Explainability**: SHAP/LIME integration
2. **Federated Learning**: Train on distributed data
3. **Online Learning**: Continuous model updates
4. **Model Governance**: Approval workflows
5. **Cost Optimization**: Track and optimize inference costs

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Run linting and tests before submitting

## License

Same as the main Geulpi project.