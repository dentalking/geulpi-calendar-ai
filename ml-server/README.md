# Geulpi ML Server

Machine Learning service for Geulpi Calendar application with LangGraph workflows and Kafka integration.

## Features

- **Event Classification**: Random Forest model with TF-IDF text features and temporal features
  - Predicts event categories: WORK, PERSONAL, HEALTH, SOCIAL, LEARNING, OTHER
  - Uses title, time of day, duration, and day of week features
  - Includes confidence scores and probability distributions
- **Schedule Optimization**: XGBoost-based optimization suggestions
- **Advanced Pattern Detection**: Multi-algorithm clustering for comprehensive behavioral analysis
  - K-Means, DBSCAN, and Hierarchical clustering algorithms
  - 26 comprehensive features including temporal, categorical, and content analysis
  - Anomaly detection using Isolation Forest
  - Automatic pattern interpretation and insights generation
- **Burnout Risk Prediction**: XGBoost-based burnout risk assessment
  - 37 comprehensive features analyzing schedule density, rest time, and overtime
  - Real-time risk scoring with 4 severity levels (low, medium, high, critical)
  - Personalized warnings and actionable recommendations
  - Preventive action plans with priorities and timelines
  - Automated monitoring plans based on risk level
- **Work-Life Balance Analysis**: Category distribution and recommendations
- **Kafka Integration**: Async message processing
- **LangGraph Workflows**: Complex ML pipelines with human-in-the-loop

## Setup

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ml-server
```

## Run

### Standalone

```bash
uvicorn main:app --reload --port 8000
```

### With Docker

```bash
docker-compose up ml-server
```

## Model Training

### Train Event Classifier

```bash
# Option 1: Run training script directly
python train_models.py

# Option 2: Use API endpoint
curl -X POST http://localhost:8000/train/event-classifier

# Train Schedule Optimizer
curl -X POST http://localhost:8000/train/schedule-optimizer

# Train Pattern Detector  
curl -X POST http://localhost:8000/train/pattern-detector

# Train All Models
curl -X POST http://localhost:8000/train/all

# Check model status
curl http://localhost:8000/models/status
```

The training script generates 5000 synthetic samples based on realistic event patterns and trains a Random Forest classifier.

## API Endpoints

### REST Endpoints

- `POST /classify-event` - Classify event type and priority
- `POST /optimize-schedule` - Get schedule optimization suggestions
- `POST /analyze-balance` - Analyze work-life balance
- `POST /detect-patterns` - Detect scheduling patterns
- `POST /analyze-burnout` - Analyze burnout risk with warnings and recommendations
- `GET /health` - Health check with detailed status
- `GET /kafka/test` - Test Kafka connectivity
- `POST /train/event-classifier` - Trigger event classifier training
- `POST /train/schedule-optimizer` - Trigger schedule optimizer training
- `POST /train/pattern-detector` - Trigger pattern detector training
- `POST /train/burnout-predictor` - Trigger burnout predictor training
- `POST /train/all` - Train all ML models
- `GET /models/status` - Check ML models status

### Kafka Topics

- `ml-requests` - Incoming ML processing requests
- `ml-responses` - ML processing responses
- `ml-events` - System events and notifications

## Kafka Message Format

### Request
```json
{
  "type": "classify_event",
  "requestId": "unique-request-id",
  "data": {
    "title": "Team Meeting",
    "description": "Weekly sync",
    "startTime": "2024-01-01T10:00:00",
    "endTime": "2024-01-01T11:00:00"
  }
}
```

### Response
```json
{
  "requestId": "unique-request-id",
  "type": "classify_event_response",
  "success": true,
  "timestamp": "2024-01-01T10:00:30",
  "data": {
    "eventType": "WORK",
    "priority": "HIGH",
    "confidence": 0.92,
    "suggestedTags": ["meeting", "professional"]
  }
}
```

## Architecture

- **LangGraph Workflows**: Each ML task is implemented as a graph-based workflow
- **Kafka Integration**: Async message processing with consumer/producer pattern
- **Model Management**: Dummy models with real ML algorithm structure
- **Health Monitoring**: Comprehensive health checks for all components

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation.

## Example Usage

### Event Classification

```bash
# Classify a work meeting
curl -X POST http://localhost:8000/classify-event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team standup meeting",
    "description": "Daily sync with the engineering team",
    "startTime": "2024-01-15T09:00:00",
    "endTime": "2024-01-15T09:30:00",
    "location": "Conference Room A"
  }'

# Response:
{
  "eventType": "WORK",
  "priority": "HIGH",
  "confidence": 0.92,
  "suggestedTags": ["work", "meeting", "important"]
}
```

### Pattern Detection

```bash
# Detect behavioral patterns for a user
curl -X POST http://localhost:8000/detect-patterns \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "lookbackDays": 30
  }'

# Response:
{
  "patterns": [
    {
      "patternId": "behavioral_cluster_0",
      "patternType": "morning_routine",
      "description": "Regular WORK activities in the morning around 09:00",
      "frequency": 15,
      "confidence": 0.92,
      "characteristics": {
        "average_hour": 9.2,
        "most_common_weekday": "Monday",
        "dominant_category": "WORK",
        "average_duration_hours": 1.5
      }
    },
    {
      "patternId": "weekly_cycle", 
      "patternType": "weekly_pattern",
      "description": "Busiest day is Friday with 12 events",
      "frequency": 12,
      "confidence": 0.75
    }
  ],
  "anomalies": [
    {
      "eventId": "event_456",
      "title": "Late night meeting",
      "anomaly_type": "behavioral_outlier",
      "reasons": ["Unusually late timing", "Work activity very late at night"],
      "severity": "high"
    }
  ],
  "insights": [
    "You're a morning person! Most activities are scheduled before noon.",
    "Strong work schedule patterns detected - you maintain consistent professional routines",
    "High pattern diversity indicates a well-balanced and varied lifestyle"
  ],
  "statistics": {
    "total_events": 85,
    "category_distribution": {
      "WORK": 35,
      "PERSONAL": 20,
      "HEALTH": 15,
      "SOCIAL": 10,
      "LEARNING": 5
    }
  }
}
```

### Burnout Risk Analysis

```bash
# Analyze burnout risk for a user
curl -X POST http://localhost:8000/analyze-burnout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "lookbackDays": 30,
    "includeRecommendations": true
  }'

# Response:
{
  "riskScore": 0.78,
  "riskLevel": "high",
  "severity": {
    "level": "high",
    "urgency": "urgent",
    "description": "Urgent attention needed - approaching burnout",
    "color": "orange"
  },
  "warnings": [
    "⚠️ HIGH BURNOUT RISK: Immediate action recommended",
    "⚠️ Working 8.5 consecutive hours - take breaks!",
    "⚠️ Regular weekend work - recovery time insufficient",
    "⚠️ Work dominates schedule - life balance at risk"
  ],
  "riskFactors": {
    "consecutive_hours": {
      "value": 8.5,
      "status": "critical"
    },
    "overtime": {
      "evening_work": 12,
      "late_night_work": 5,
      "weekend_work": 4,
      "status": "excessive"
    },
    "work_life_balance": {
      "work_ratio": 0.72,
      "status": "poor"
    }
  },
  "trend": {
    "direction": "increasing",
    "change": 0.15,
    "description": "Burnout risk is increasing - take preventive action"
  },
  "recommendations": [
    "🚨 URGENT: Schedule immediate time off or reduce workload significantly",
    "🌙 Set a hard stop time for work (e.g., 6 PM) and stick to it",
    "📅 Break long work sessions into smaller chunks with 15-30 min breaks",
    "💪 Schedule regular exercise sessions (3x per week)",
    "🎯 Aim for 40% work, 60% personal/health/social activities"
  ],
  "preventiveActions": [
    {
      "action": "immediate_rest",
      "title": "Take immediate time off",
      "description": "Schedule at least 2 days off within the next week",
      "priority": "critical",
      "timeline": "within 48 hours"
    },
    {
      "action": "evening_boundary",
      "title": "Set hard stop time for work",
      "description": "No work activities after 6 PM - set calendar blocker",
      "priority": "high",
      "timeline": "starting today"
    }
  ],
  "monitoringPlan": {
    "check_frequency": "every 3 days",
    "review_period_days": 14,
    "next_check": "2024-01-18",
    "metrics_to_track": [
      {
        "metric": "daily_work_hours",
        "target": "less than 8 hours",
        "current": 8.5
      }
    ]
  }
}
```

### Model Features

#### Event Classifier
- **Text Features**: TF-IDF vectorization of title, description, and location
- **Temporal Features**: 
  - Hour of day, day of week
  - Event duration
  - Time of day categories (morning, afternoon, evening, night)
  - Weekend indicator
  - Duration categories (short, medium, long)

#### Advanced Pattern Detector
- **Comprehensive Features** (26 dimensions):
  - **Temporal**: hour, minute, weekday, month, day of month, season
  - **Time Categories**: morning, afternoon, evening, night periods
  - **Day Categories**: weekend, Monday, Friday indicators  
  - **Duration**: short/medium/long classification
  - **Content Analysis**: meeting, personal, work, health, social keywords
  - **Location**: remote vs office indicators

- **Clustering Algorithms**:
  - **K-Means**: Behavioral cluster identification
  - **DBSCAN**: Density-based pattern discovery
  - **Hierarchical**: Nested pattern relationships

- **Anomaly Detection**: Isolation Forest for outlier identification

- **Pattern Types Detected**:
  - Morning/Evening routines
  - Work schedule patterns
  - Social activity patterns  
  - Weekend behaviors
  - Category preferences
  - Weekly cycles
  - Extended activities

#### Burnout Risk Predictor
- **Comprehensive Features** (37 dimensions):
  - **Schedule Density** (7): daily/weekly event counts, consecutive hours, back-to-back meetings
  - **Rest Time** (7): break gaps, weekend ratio, free hours, lunch break analysis
  - **Overtime** (7): evening/late-night work, weekend work, work hours per day
  - **Workload Trend** (5): workload changes, meeting density, project diversity
  - **Work-Life Balance** (7): category ratios, balance entropy, work dominance
  - **Behavioral Patterns** (4): schedule consistency, irregular hours, recovery time

- **Risk Analysis Components**:
  - **Real-time Risk Scoring**: 0-1 scale with 4 severity levels
  - **Multi-factor Analysis**: Evaluates 6 key risk dimensions
  - **Trend Detection**: Analyzes risk trajectory over time
  - **Warning System**: Context-specific alerts based on risk factors

- **Recommendation Engine**:
  - **Immediate Actions**: Critical interventions for high risk
  - **Preventive Measures**: Proactive steps to reduce risk
  - **Lifestyle Adjustments**: Long-term balance improvements
  - **Monitoring Plans**: Customized follow-up schedules

## Monitoring

- Kafka UI: http://localhost:8080 (when using docker-compose)
- Health endpoint: http://localhost:8000/health
- Model status: http://localhost:8000/models/status