# SubscriptionResolver Unit Tests

## Overview
Comprehensive unit tests for the `SubscriptionResolver` class that handles GraphQL subscription endpoints for real-time features in the Geulpi Calendar Service.

## Test Coverage
The test suite covers all 5 subscription methods with 21 comprehensive test cases:

### Core Subscription Methods Tested
1. **eventUpdated** - Real-time event update notifications
2. **newSuggestion** - AI-generated scheduling suggestions  
3. **insightGenerated** - ML-powered productivity insights
4. **dashboardUpdates** - Unified dashboard update stream
5. **balanceAlerts** - Work-life balance notifications

### Test Categories

#### Basic Functionality (8 tests)
- Successful subscription creation and data flow
- Empty stream handling
- Multiple item streaming
- Service error propagation

#### Edge Cases & Error Handling (4 tests)
- Null/empty userId handling
- Service timeout scenarios
- Error stream handling
- Publisher return type validation

#### Performance & Scalability (5 tests)
- High-frequency emissions (100 events)
- Backpressure handling
- Subscription cancellation
- User isolation between subscriptions
- Infinite stream management with take operators

#### Real-time Features (4 tests)
- Delayed emission handling
- Different alert severity levels
- Multiple dashboard update types
- Concurrent operations support

## Key Testing Technologies
- **Mockito**: Service layer mocking
- **Reactor Test**: Reactive stream testing with `StepVerifier`
- **Spring Security**: `@WithMockUser` for authenticated contexts
- **AssertJ**: Fluent assertions for readable test code

## Test Data Structure
Tests use realistic domain objects:
- `Event`, `Suggestion`, `Insight` entities
- `DashboardUpdate`, `BalanceAlert` DTOs
- Proper enum usage (`Severity`, `Priority`, `InsightType`)

## Authentication Testing
Authentication tests were excluded from unit tests as `@PreAuthorize` annotations require full Spring Security context. These should be covered in integration tests.

## Performance Characteristics
- All tests complete in ~6 seconds
- Includes timeout testing (5-second service timeout scenario)
- Validates reactive backpressure handling
- Tests high-frequency emission scenarios

## Usage
```bash
./gradlew test --tests SubscriptionResolverTest
```

This test suite ensures the GraphQL subscription resolver properly handles real-time data streams, maintains user isolation, and gracefully handles edge cases in the reactive programming model.