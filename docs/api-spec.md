# Geulpi Calendar Service - API Specification

## Overview

Geulpi Calendar Service provides three main APIs:
- **GraphQL API** (Frontend ↔ Backend)
- **REST API** (ML Server)
- **Kafka Messages** (Backend ↔ ML Server)

## 1. GraphQL API

### Endpoint
- **URL**: `https://api.geulpi.com/graphql`
- **WebSocket**: `wss://api.geulpi.com/graphql`

### Authentication
```http
Authorization: Bearer <JWT_TOKEN>
```

### Core Operations

#### Queries

##### Get Current User
```graphql
query GetMe {
  me {
    id
    email
    name
    lifePhilosophy {
      areas {
        id
        name
        color
        targetPercentage
      }
    }
    preferences {
      workingHours {
        start
        end
        timezone
      }
    }
  }
}
```

##### Get Events
```graphql
query GetEvents($filter: EventFilter!) {
  events(filter: $filter) {
    id
    title
    description
    startTime
    endTime
    area {
      id
      name
      color
    }
    location {
      name
      address
    }
  }
}
```

##### Get Time Balance
```graphql
query GetTimeBalance($period: AnalyticsPeriod!) {
  timeBalance(period: $period) {
    period
    actual
    ideal
    deviation
    score
  }
}
```

#### Mutations

##### Natural Language Event Creation
```graphql
mutation ProcessNaturalLanguage($input: String!) {
  processNaturalLanguage(input: $input) {
    understood
    intent
    events {
      id
      title
      startTime
      endTime
    }
    suggestions {
      id
      title
      description
    }
    message
  }
}
```

##### Create Event
```graphql
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    title
    startTime
    endTime
    area {
      id
      name
    }
  }
}
```

##### Complete Onboarding
```graphql
mutation CompleteOnboarding($input: OnboardingInput!) {
  completeOnboarding(input: $input) {
    id
    onboardingCompleted
    lifePhilosophy {
      areas {
        id
        name
        targetPercentage
      }
    }
  }
}
```

#### Subscriptions

##### Real-time Event Updates
```graphql
subscription OnEventUpdate($userId: ID!) {
  eventUpdated(userId: $userId) {
    id
    title
    startTime
    endTime
    area {
      id
      name
    }
  }
}
```

##### New Suggestions
```graphql
subscription OnNewSuggestion($userId: ID!) {
  newSuggestion(userId: $userId) {
    id
    type
    title
    description
    priority
  }
}
```

### Error Handling

GraphQL errors follow this format:
```json
{
  "errors": [
    {
      "message": "Event not found",
      "extensions": {
        "code": "NOT_FOUND",
        "timestamp": "2025-07-26T10:00:00Z"
      },
      "path": ["event"],
      "locations": [{"line": 2, "column": 3}]
    }
  ]
}
```

## 2. ML Server REST API

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://ml.geulpi.com`

### Endpoints

#### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "ml-server",
  "timestamp": "2025-07-26T10:00:00Z",
  "details": {
    "workflows": {
      "event_classifier": true,
      "schedule_optimizer": true
    }
  }
}
```

#### Event Classification
```http
POST /classify-event
Content-Type: application/json

{
  "text": "내일 오후 2시 회의",
  "context": {
    "user_id": "user123",
    "timezone": "Asia/Seoul"
  }
}
```

Response:
```json
{
  "category": "WORK",
  "confidence": 0.92,
  "priority": "HIGH",
  "suggested_duration": 60,
  "features": {
    "has_time": true,
    "has_date": true,
    "has_location": false
  }
}
```

#### Schedule Optimization
```http
POST /optimize-schedule
Content-Type: application/json

{
  "current_events": [...],
  "constraints": {
    "working_hours": {
      "start": "09:00",
      "end": "18:00"
    },
    "break_duration": 15
  },
  "optimization_goal": "BALANCE"
}
```

Response:
```json
{
  "optimized": true,
  "suggestions": [
    {
      "action": "MOVE",
      "event_id": "evt123",
      "from_time": "2025-07-26T14:00:00Z",
      "to_time": "2025-07-26T10:00:00Z",
      "reason": "Better focus time in the morning"
    }
  ],
  "balance_improvement": 0.15
}
```

#### Pattern Detection
```http
POST /detect-patterns
Content-Type: application/json

{
  "user_id": "user123",
  "time_range": {
    "start": "2025-06-01",
    "end": "2025-06-30"
  }
}
```

Response:
```json
{
  "patterns": [
    {
      "type": "RECURRING_MEETING",
      "confidence": 0.85,
      "description": "Weekly team meeting every Monday at 10 AM",
      "frequency": "WEEKLY",
      "occurrences": 4
    }
  ]
}
```

### ML Server Error Responses

```json
{
  "detail": "Model not initialized",
  "status_code": 503,
  "type": "service_unavailable"
}
```

## 3. Kafka Message Format

### Topics
- `ml-requests`: Backend → ML Server
- `ml-responses`: ML Server → Backend
- `ml-events`: Event streaming

### Request Message
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "CLASSIFY_EVENT",
  "timestamp": "2025-07-26T10:00:00Z",
  "data": {
    "text": "내일 오후 2시 회의",
    "userId": "user123",
    "context": {
      "timezone": "Asia/Seoul",
      "locale": "ko-KR"
    }
  }
}
```

### Response Message
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUCCESS",
  "timestamp": "2025-07-26T10:00:01Z",
  "result": {
    "category": "WORK",
    "confidence": 0.92,
    "metadata": {
      "processing_time_ms": 87
    }
  }
}
```

### Error Message
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ERROR",
  "timestamp": "2025-07-26T10:00:01Z",
  "error": {
    "code": "MODEL_ERROR",
    "message": "Failed to classify event",
    "details": "Model timeout after 30s"
  }
}
```

## 4. External API Integrations

### Google Calendar API
- **Scopes**: `calendar.readonly`, `calendar.events`
- **Rate Limit**: 1,000,000 queries/day

### OpenAI API
- **Model**: GPT-4
- **Rate Limit**: 10,000 tokens/min
- **Usage**: Natural language processing, intent recognition

### Google Cloud Vision API
- **Features**: `TEXT_DETECTION`, `DOCUMENT_TEXT_DETECTION`
- **Rate Limit**: 1,800 requests/min

## 5. Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| GraphQL | 100 req/min | Per IP |
| ML API | 60 req/min | Per User |
| Webhooks | 10 req/sec | Per Token |

## 6. Response Codes

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily down

### GraphQL Error Codes
- `UNAUTHENTICATED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Server error
- `RATE_LIMITED`: Too many requests

## 7. Webhooks

### Event Created Webhook
```json
POST https://your-webhook-url.com/events
Content-Type: application/json
X-Geulpi-Signature: sha256=<signature>

{
  "event": "event.created",
  "data": {
    "id": "evt_123",
    "title": "Team Meeting",
    "startTime": "2025-07-26T14:00:00Z",
    "userId": "user_123"
  },
  "timestamp": "2025-07-26T10:00:00Z"
}
```

## 8. SDK Examples

### JavaScript/TypeScript
```typescript
import { GeulpiClient } from '@geulpi/sdk';

const client = new GeulpiClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create event from natural language
const response = await client.events.createFromText(
  "내일 오후 2시 회의"
);

// Subscribe to real-time updates
client.subscriptions.onEventUpdate((event) => {
  console.log('Event updated:', event);
});
```

### Python
```python
from geulpi import GeulpiClient

client = GeulpiClient(
    api_key='your-api-key',
    environment='production'
)

# Get time balance
balance = client.analytics.get_time_balance(
    period='WEEK'
)

# Optimize schedule
suggestions = client.ml.optimize_schedule(
    date='2025-07-26'
)
```

## 9. Testing

### GraphQL Playground
Available at `https://api.geulpi.com/graphql` in development mode.

### Postman Collection
Download from: `https://docs.geulpi.com/postman/geulpi-api.json`

### Test Credentials
```
Email: test@geulpi.com
Password: test123!
API Key: test_k3y_d3v3l0pm3nt_0nly
```