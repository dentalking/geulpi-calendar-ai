// ML Server performance testing processor for Geulpi Calendar Service

function generateOptimizationRequest(context, events, done) {
  const userId = `user_${Math.floor(Math.random() * 1000)}`;
  
  // Generate realistic event data
  const eventCount = Math.floor(Math.random() * 20) + 5; // 5-25 events
  const events = [];
  
  for (let i = 0; i < eventCount; i++) {
    const startTime = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const duration = (Math.random() * 4 + 1) * 60 * 60 * 1000; // 1-5 hours
    
    events.push({
      id: `event_${i}`,
      title: `Event ${i + 1}`,
      start_time: startTime.toISOString(),
      end_time: new Date(startTime.getTime() + duration).toISOString(),
      priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      type: ['MEETING', 'TASK', 'BREAK', 'FOCUS_TIME'][Math.floor(Math.random() * 4)],
      location: Math.random() > 0.5 ? 'Office' : 'Remote',
      attendees: Math.floor(Math.random() * 10),
      flexibility: Math.random()
    });
  }
  
  const preferences = {
    working_hours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC'
    },
    break_preferences: {
      lunch_duration: 60,
      short_break_frequency: 120,
      preferred_break_times: ['10:30', '15:00']
    },
    priority_weights: {
      HIGH: 0.8,
      MEDIUM: 0.5,
      LOW: 0.2
    },
    optimization_goals: ['minimize_conflicts', 'maximize_focus_time', 'balance_workload']
  };
  
  const constraints = {
    max_daily_hours: 8,
    min_break_duration: 15,
    max_consecutive_meetings: 3,
    travel_time_buffer: 30,
    no_meetings_before: '09:00',
    no_meetings_after: '18:00'
  };
  
  context.vars.userId = userId;
  context.vars.events = JSON.stringify(events);
  context.vars.preferences = JSON.stringify(preferences);
  context.vars.constraints = JSON.stringify(constraints);
  
  return done();
}

function generatePatternRequest(context, events, done) {
  const userId = `user_${Math.floor(Math.random() * 1000)}`;
  const timeframeDays = [7, 14, 30, 90][Math.floor(Math.random() * 4)];
  
  // Generate historical events for pattern detection
  const eventCount = Math.floor(Math.random() * 100) + 50; // 50-150 events
  const events = [];
  
  for (let i = 0; i < eventCount; i++) {
    const daysAgo = Math.floor(Math.random() * timeframeDays);
    const startTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const duration = (Math.random() * 3 + 0.5) * 60 * 60 * 1000; // 30min-3.5h
    
    events.push({
      id: `hist_event_${i}`,
      title: generateEventTitle(),
      start_time: startTime.toISOString(),
      end_time: new Date(startTime.getTime() + duration).toISOString(),
      category: ['work', 'personal', 'health', 'learning'][Math.floor(Math.random() * 4)],
      location: generateLocation(),
      attendees: Math.floor(Math.random() * 8),
      completed: Math.random() > 0.1, // 90% completion rate
      satisfaction_score: Math.random() * 10
    });
  }
  
  const patternTypes = [
    'time_patterns',
    'productivity_patterns',
    'meeting_patterns',
    'workload_patterns',
    'location_patterns'
  ];
  
  context.vars.userId = userId;
  context.vars.events = JSON.stringify(events);
  context.vars.timeframeDays = timeframeDays;
  context.vars.patternTypes = JSON.stringify(patternTypes);
  
  return done();
}

function generateClassificationRequest(context, events, done) {
  const eventTitles = [
    'Team standup meeting',
    'Code review session',
    'Client presentation',
    'Sprint planning',
    'Doctor appointment',
    'Lunch with colleagues',
    'Focus time - development',
    'Training workshop',
    'Performance review',
    'Project kickoff'
  ];
  
  const eventData = {
    title: eventTitles[Math.floor(Math.random() * eventTitles.length)],
    description: generateEventDescription(),
    duration: Math.floor(Math.random() * 240) + 15, // 15-255 minutes
    attendees: Math.floor(Math.random() * 12),
    location: generateLocation(),
    keywords: generateKeywords()
  };
  
  const context_data = {
    time_of_day: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
    day_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][Math.floor(Math.random() * 5)],
    current_workload: Math.random(),
    recent_events: generateRecentEvents(3)
  };
  
  const userHistory = {
    event_patterns: generateEventPatterns(),
    preferences: generateUserPreferences(),
    historical_classifications: generateHistoricalClassifications()
  };
  
  context.vars.eventData = JSON.stringify(eventData);
  context.vars.context = JSON.stringify(context_data);
  context.vars.userHistory = JSON.stringify(userHistory);
  
  return done();
}

function generateBurnoutRequest(context, events, done) {
  const userId = `user_${Math.floor(Math.random() * 1000)}`;
  
  const scheduleData = {
    weekly_hours: Math.random() * 30 + 30, // 30-60 hours
    meeting_density: Math.random(),
    overtime_frequency: Math.random(),
    break_frequency: Math.random(),
    weekend_work: Math.random() > 0.7,
    vacation_days_taken: Math.floor(Math.random() * 25),
    consecutive_work_days: Math.floor(Math.random() * 14) + 1
  };
  
  const healthMetrics = {
    sleep_hours: Math.random() * 4 + 5, // 5-9 hours
    stress_level: Math.random() * 10,
    energy_level: Math.random() * 10,
    satisfaction_score: Math.random() * 10,
    work_life_balance: Math.random() * 10
  };
  
  const workPatterns = {
    start_time_consistency: Math.random(),
    end_time_consistency: Math.random(),
    break_adherence: Math.random(),
    meeting_load_trend: Math.random() * 2 - 1, // -1 to 1
    productivity_trend: Math.random() * 2 - 1
  };
  
  context.vars.userId = userId;
  context.vars.scheduleData = JSON.stringify(scheduleData);
  context.vars.healthMetrics = JSON.stringify(healthMetrics);
  context.vars.workPatterns = JSON.stringify(workPatterns);
  
  return done();
}

function generateBatchRequest(context, events, done) {
  const batchSize = Math.floor(Math.random() * 8) + 2; // 2-10 requests
  const requests = [];
  
  for (let i = 0; i < batchSize; i++) {
    requests.push({
      type: ['optimize', 'classify', 'predict'][Math.floor(Math.random() * 3)],
      user_id: `batch_user_${i}`,
      data: generateRandomRequestData(),
      priority: Math.random() > 0.8 ? 'high' : 'normal'
    });
  }
  
  context.vars.batchRequests = JSON.stringify(requests);
  context.vars.batchSize = batchSize;
  
  return done();
}

function generateCacheTestRequest(context, events, done) {
  // Generate consistent data for cache testing
  const cacheUserId = 'cache_test_user_1';
  const cacheEvents = JSON.stringify([
    {
      id: 'cache_event_1',
      title: 'Cache Test Meeting',
      start_time: '2024-02-01T10:00:00Z',
      end_time: '2024-02-01T11:00:00Z',
      priority: 'MEDIUM'
    }
  ]);
  
  const cachePreferences = JSON.stringify({
    working_hours: { start: '09:00', end: '17:00' }
  });
  
  const cacheConstraints = JSON.stringify({
    max_daily_hours: 8
  });
  
  context.vars.cacheUserId = cacheUserId;
  context.vars.cacheEvents = cacheEvents;
  context.vars.cachePreferences = cachePreferences;
  context.vars.cacheConstraints = cacheConstraints;
  
  return done();
}

function generateConcurrentRequests(context, events, done) {
  // Generate data for concurrent processing test
  context.vars.eventData1 = JSON.stringify({
    title: 'Concurrent Test Event 1',
    description: 'Testing concurrent processing',
    duration: 60
  });
  
  context.vars.context1 = JSON.stringify({
    time_of_day: 'morning',
    day_of_week: 'tuesday'
  });
  
  context.vars.userId1 = 'concurrent_user_1';
  context.vars.events1 = JSON.stringify(generateRecentEvents(5));
  
  context.vars.userId2 = 'concurrent_user_2';
  context.vars.scheduleData2 = JSON.stringify({
    weekly_hours: 45,
    meeting_density: 0.7
  });
  
  return done();
}

// Helper functions
function generateEventTitle() {
  const prefixes = ['Team', 'Client', 'Project', 'Sprint', 'Weekly', 'Daily'];
  const types = ['Meeting', 'Review', 'Planning', 'Standup', 'Sync', 'Call'];
  const suffixes = ['Session', 'Discussion', 'Workshop', 'Presentation'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const suffix = Math.random() > 0.5 ? ' ' + suffixes[Math.floor(Math.random() * suffixes.length)] : '';
  
  return `${prefix} ${type}${suffix}`;
}

function generateEventDescription() {
  const descriptions = [
    'Discussing project milestones and deliverables',
    'Code review and technical discussion',
    'Client presentation and feedback session',
    'Sprint planning and task allocation',
    'Weekly team sync and updates',
    'Focus time for development work',
    'Training and knowledge sharing session'
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function generateLocation() {
  const locations = [
    'Conference Room A',
    'Conference Room B',
    'Online/Remote',
    'Office Desk',
    'Client Site',
    'Home Office',
    'Coffee Shop',
    'Co-working Space'
  ];
  
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateKeywords() {
  const keywords = [
    ['meeting', 'discussion', 'planning'],
    ['development', 'coding', 'technical'],
    ['client', 'presentation', 'demo'],
    ['review', 'feedback', 'evaluation'],
    ['training', 'learning', 'workshop'],
    ['sync', 'update', 'status'],
    ['focus', 'deep work', 'concentration']
  ];
  
  return keywords[Math.floor(Math.random() * keywords.length)];
}

function generateRecentEvents(count) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: `recent_${i}`,
      title: generateEventTitle(),
      start_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: ['work', 'personal', 'health'][Math.floor(Math.random() * 3)]
    });
  }
  return events;
}

function generateEventPatterns() {
  return {
    common_meeting_times: ['09:00', '10:00', '14:00', '15:00'],
    average_meeting_duration: 60,
    preferred_days: ['tuesday', 'wednesday', 'thursday'],
    productivity_peaks: ['10:00-12:00', '14:00-16:00']
  };
}

function generateUserPreferences() {
  return {
    prefers_morning_meetings: Math.random() > 0.5,
    max_daily_meetings: Math.floor(Math.random() * 6) + 2,
    break_preferences: {
      frequency: Math.floor(Math.random() * 60) + 60,
      duration: Math.floor(Math.random() * 30) + 15
    }
  };
}

function generateHistoricalClassifications() {
  const classifications = [];
  for (let i = 0; i < 10; i++) {
    classifications.push({
      event_type: ['meeting', 'focus_time', 'break', 'training'][Math.floor(Math.random() * 4)],
      confidence: Math.random(),
      accuracy: Math.random()
    });
  }
  return classifications;
}

function generateRandomRequestData() {
  return {
    timestamp: new Date().toISOString(),
    complexity: Math.random(),
    data_size: Math.floor(Math.random() * 1000) + 100
  };
}

function trackMLPerformance(requestParams, response, context, ee, next) {
  const processingTime = response.timings.response;
  const url = requestParams.url || requestParams.uri;
  
  // Track processing time by endpoint
  let endpointType = 'unknown';
  if (url.includes('optimize-schedule')) {
    endpointType = 'optimization';
  } else if (url.includes('detect-patterns')) {
    endpointType = 'pattern_detection';
  } else if (url.includes('classify-event')) {
    endpointType = 'classification';
  } else if (url.includes('predict-burnout')) {
    endpointType = 'burnout_prediction';
  } else if (url.includes('batch-optimize')) {
    endpointType = 'batch_processing';
  }
  
  ee.emit('histogram', `ml_processing_time_${endpointType}`, processingTime);
  
  // Track ML-specific performance thresholds
  if (processingTime > 10000) { // 10 seconds
    ee.emit('counter', 'slow_ml_requests', 1);
    console.log(`SLOW ML REQUEST: ${url} took ${processingTime}ms`);
  }
  
  if (processingTime < 1000) { // Under 1 second
    ee.emit('counter', 'fast_ml_requests', 1);
  }
  
  // Extract custom metrics from response
  if (response.body) {
    try {
      const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
      
      if (body.processing_time_ms) {
        ee.emit('histogram', 'server_reported_processing_time', body.processing_time_ms);
      }
      
      if (body.confidence) {
        ee.emit('histogram', 'model_confidence', body.confidence * 100);
      }
      
      if (body.optimization_score) {
        ee.emit('histogram', 'optimization_score', body.optimization_score * 100);
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
  }
  
  return next();
}

function trackMemoryUsage(requestParams, response, context, ee, next) {
  // Track memory usage from response headers if available
  const memoryUsage = response.headers['x-memory-usage'];
  if (memoryUsage) {
    ee.emit('gauge', 'ml_server_memory_mb', parseInt(memoryUsage));
  }
  
  const cpuUsage = response.headers['x-cpu-usage'];
  if (cpuUsage) {
    ee.emit('gauge', 'ml_server_cpu_percent', parseFloat(cpuUsage));
  }
  
  return next();
}

module.exports = {
  generateOptimizationRequest,
  generatePatternRequest,
  generateClassificationRequest,
  generateBurnoutRequest,
  generateBatchRequest,
  generateCacheTestRequest,
  generateConcurrentRequests,
  trackMLPerformance,
  trackMemoryUsage
};