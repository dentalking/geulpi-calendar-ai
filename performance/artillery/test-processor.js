// Artillery test processor for Geulpi Calendar Service performance testing

function generateRandomUser(context, events, done) {
  context.vars.randomUserId = Math.floor(Math.random() * 1000) + 1;
  context.vars.randomEmail = `user${context.vars.randomUserId}@example.com`;
  context.vars.randomName = `Test User ${context.vars.randomUserId}`;
  return done();
}

function generateRandomEvent(context, events, done) {
  const eventTypes = [
    'Meeting', 'Conference Call', 'Training Session', 'Review', 'Planning',
    'Standup', 'Retrospective', 'Demo', 'Workshop', 'Consultation'
  ];
  
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const locations = [
    'Conference Room A', 'Conference Room B', 'Online', 'Office', 'Client Site'
  ];
  
  context.vars.randomEventTitle = eventTypes[Math.floor(Math.random() * eventTypes.length)] + 
    ` ${Math.floor(Math.random() * 1000)}`;
  context.vars.randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
  context.vars.randomLocation = locations[Math.floor(Math.random() * locations.length)];
  
  // Generate random future date within next 30 days
  const now = new Date();
  const futureDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date(futureDate.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000); // 1-5 hours duration
  
  context.vars.randomStartTime = futureDate.toISOString();
  context.vars.randomEndTime = endDate.toISOString();
  
  return done();
}

function generateDateRange(context, events, done) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  
  context.vars.startDate = startDate.toISOString();
  context.vars.endDate = endDate.toISOString();
  
  return done();
}

function generateSearchQuery(context, events, done) {
  const searchTerms = [
    'meeting', 'call', 'review', 'standup', 'demo', 'training',
    'planning', 'workshop', 'conference', 'presentation', 'sync'
  ];
  
  context.vars.searchQuery = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  return done();
}

function validateResponse(requestParams, response, context, ee, next) {
  // Log performance metrics
  const responseTime = response.timings.response;
  
  if (responseTime > 1000) {
    console.log(`WARNING: Slow response detected: ${responseTime}ms for ${requestParams.url}`);
  }
  
  // Check for GraphQL errors
  if (response.body && typeof response.body === 'string') {
    try {
      const parsed = JSON.parse(response.body);
      if (parsed.errors) {
        console.log(`GraphQL errors detected:`, parsed.errors);
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }
  
  return next();
}

function logMetrics(requestParams, response, context, ee, next) {
  // Emit custom metrics
  ee.emit('histogram', 'response_time', response.timings.response);
  ee.emit('counter', 'total_requests', 1);
  
  if (response.statusCode >= 400) {
    ee.emit('counter', 'error_responses', 1);
  } else {
    ee.emit('counter', 'success_responses', 1);
  }
  
  // Memory usage tracking
  if (global.gc) {
    global.gc();
  }
  
  const memUsage = process.memoryUsage();
  ee.emit('gauge', 'memory_usage_mb', memUsage.heapUsed / 1024 / 1024);
  
  return next();
}

function checkDatabaseConnection(context, events, done) {
  // This would be called before tests to ensure DB is ready
  context.vars.dbReady = true;
  return done();
}

function setupTestData(context, events, done) {
  // Generate test data that persists across requests
  context.vars.testUserId = Math.floor(Math.random() * 100) + 1;
  context.vars.sessionId = `session_${Date.now()}_${Math.random()}`;
  
  return done();
}

// JWT token generator for testing (mock implementation)
function generateTestJWT(context, events, done) {
  // In a real scenario, you'd get this from an auth service
  const mockPayload = {
    userId: context.vars.testUserId || 1,
    email: context.vars.randomEmail || 'test@example.com',
    role: 'USER',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
  };
  
  // Mock JWT token - in production this would be properly signed
  const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.mock_signature`;
  context.vars.authToken = mockToken;
  
  return done();
}

function measureDatabaseQueryTime(requestParams, response, context, ee, next) {
  // Extract database query time from response headers if available
  const dbQueryTime = response.headers['x-db-query-time'];
  if (dbQueryTime) {
    ee.emit('histogram', 'db_query_time', parseInt(dbQueryTime));
  }
  
  return next();
}

function measureCacheHitRate(requestParams, response, context, ee, next) {
  // Track cache hits/misses from response headers
  const cacheStatus = response.headers['x-cache-status'];
  if (cacheStatus) {
    ee.emit('counter', `cache_${cacheStatus.toLowerCase()}`, 1);
  }
  
  return next();
}

// Export all functions for Artillery to use
module.exports = {
  generateRandomUser,
  generateRandomEvent,
  generateDateRange,
  generateSearchQuery,
  validateResponse,
  logMetrics,
  checkDatabaseConnection,
  setupTestData,
  generateTestJWT,
  measureDatabaseQueryTime,
  measureCacheHitRate
};