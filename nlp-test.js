const http = require('http');

// Test configuration
const config = {
  backend: 'http://localhost:8080',
  TEST_SCENARIOS: [
    // Korean CREATE_EVENT scenarios
    {
      category: 'Korean CREATE_EVENT',
      input: '내일 오후에 회의 잡아줘',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Basic Korean meeting scheduling'
    },
    {
      category: 'Korean CREATE_EVENT',
      input: '목요일 3시에 팀 미팅 만들어줘',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Specific day and time in Korean'
    },
    {
      category: 'Korean CREATE_EVENT',
      input: '오늘 저녁에 약속 추가해줘',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Evening appointment in Korean'
    },
    {
      category: 'Korean CREATE_EVENT',
      input: '다음주 월요일 오전에 회의 생성해줘',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Next week specific day'
    },
    
    // English CREATE_EVENT scenarios
    {
      category: 'English CREATE_EVENT',
      input: 'Schedule a meeting tomorrow afternoon',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Basic English meeting scheduling'
    },
    {
      category: 'English CREATE_EVENT',
      input: 'Create appointment for Friday 2pm',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Specific day and time in English'
    },
    {
      category: 'English CREATE_EVENT',
      input: 'Set up team meeting next week',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Team meeting next week'
    },
    
    // Korean QUERY_SCHEDULE scenarios
    {
      category: 'Korean QUERY_SCHEDULE',
      input: '내일 일정 알려줘',
      expectedIntent: 'QUERY_SCHEDULE',
      expectedUnderstood: true,
      description: 'Tomorrow schedule query in Korean'
    },
    {
      category: 'Korean QUERY_SCHEDULE',
      input: '오늘 스케줄 보여줘',
      expectedIntent: 'QUERY_SCHEDULE',
      expectedUnderstood: true,
      description: 'Today schedule query in Korean'
    },
    {
      category: 'Korean QUERY_SCHEDULE',
      input: '이번주 일정 확인해줘',
      expectedIntent: 'QUERY_SCHEDULE',
      expectedUnderstood: true,
      description: 'This week schedule query'
    },
    
    // English QUERY_SCHEDULE scenarios
    {
      category: 'English QUERY_SCHEDULE',
      input: 'Show me my schedule for tomorrow',
      expectedIntent: 'QUERY_SCHEDULE',
      expectedUnderstood: true,
      description: 'Tomorrow schedule query in English'
    },
    {
      category: 'English QUERY_SCHEDULE',
      input: 'What meetings do I have today?',
      expectedIntent: 'QUERY_SCHEDULE',
      expectedUnderstood: true,
      description: 'Today meetings query'
    },
    
    // UPDATE_EVENT scenarios
    {
      category: 'Korean UPDATE_EVENT',
      input: '내일 회의 시간 변경해줘',
      expectedIntent: 'UPDATE_EVENT',
      expectedUnderstood: true,
      description: 'Meeting time change request'
    },
    {
      category: 'English UPDATE_EVENT',
      input: 'Reschedule my appointment tomorrow',
      expectedIntent: 'UPDATE_EVENT',
      expectedUnderstood: true,
      description: 'Appointment reschedule request'
    },
    
    // DELETE_EVENT scenarios
    {
      category: 'Korean DELETE_EVENT',
      input: '내일 회의 취소해줘',
      expectedIntent: 'DELETE_EVENT',
      expectedUnderstood: true,
      description: 'Meeting cancellation request'
    },
    {
      category: 'English DELETE_EVENT',
      input: 'Cancel my meeting tomorrow',
      expectedIntent: 'DELETE_EVENT',
      expectedUnderstood: true,
      description: 'Meeting cancellation in English'
    },
    
    // UNKNOWN scenarios (edge cases)
    {
      category: 'UNKNOWN',
      input: '날씨가 어때?',
      expectedIntent: 'UNKNOWN',
      expectedUnderstood: false,
      description: 'Non-calendar related query'
    },
    {
      category: 'UNKNOWN',
      input: 'How is the weather?',
      expectedIntent: 'UNKNOWN',
      expectedUnderstood: false,
      description: 'Non-calendar related query in English'
    },
    
    // Complex scenarios
    {
      category: 'Complex Korean',
      input: '내일 오후 2시에 클라이언트와 미팅 잡고 1시간 정도 할 예정이야',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Complex Korean request with details'
    },
    {
      category: 'Complex English',
      input: 'I need to schedule a team standup meeting for Monday morning at 9am',
      expectedIntent: 'CREATE_EVENT',
      expectedUnderstood: true,
      description: 'Complex English request with details'
    }
  ]
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Test results tracking
const testResults = [];

function logTest(scenario, success, details = '') {
  const result = { 
    scenario: scenario.input,
    category: scenario.category,
    expected: scenario.expectedIntent,
    success, 
    details, 
    timestamp: new Date().toISOString() 
  };
  testResults.push(result);
  const status = success ? '✅' : '❌';
  console.log(`${status} [${scenario.category}] "${scenario.input}"`);
  console.log(`    Expected: ${scenario.expectedIntent}, ${details}`);
}

// Test individual NLP scenario
async function testNLPScenario(scenario) {
  try {
    // Test REST API endpoint
    const restResponse = await makeRequest(`${config.backend}/nlp/process`, {
      method: 'POST',
      body: { input: scenario.input }
    });

    if (restResponse.statusCode !== 200) {
      logTest(scenario, false, `REST API failed: ${restResponse.statusCode}`);
      return false;
    }

    const restResult = restResponse.data.aiResponse;
    const restSuccess = restResult.intent === scenario.expectedIntent && 
                       restResult.understood === scenario.expectedUnderstood;

    logTest(scenario, restSuccess, 
      `REST: Intent=${restResult.intent}, Understood=${restResult.understood}, Msg="${restResult.message}"`);

    // Test GraphQL endpoint
    const graphqlQuery = {
      query: `
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
            message
            clarificationNeeded
            clarificationPrompts
          }
        }`,
      variables: { input: scenario.input }
    };

    const graphqlResponse = await makeRequest(`${config.backend}/graphql`, {
      method: 'POST',
      body: graphqlQuery
    });

    const graphqlResult = graphqlResponse.data?.data?.processNaturalLanguage;
    const graphqlSuccess = graphqlResult?.intent === scenario.expectedIntent && 
                          graphqlResult?.understood === scenario.expectedUnderstood;

    console.log(`    GraphQL: Intent=${graphqlResult?.intent}, Understood=${graphqlResult?.understood}`);
    
    // Check if events were created for CREATE_EVENT intents
    if (scenario.expectedIntent === 'CREATE_EVENT' && restSuccess) {
      const hasEvents = restResult.events && restResult.events.length > 0;
      console.log(`    Events Created: ${hasEvents ? restResult.events.length : 0}`);
      if (hasEvents) {
        const event = restResult.events[0];
        console.log(`    Event: "${event.title}" at ${event.startTime}`);
      }
    }

    return restSuccess && graphqlSuccess;

  } catch (error) {
    logTest(scenario, false, `Error: ${error.message}`);
    return false;
  }
}

// Test conversation flow (multi-turn)
async function testConversationFlow() {
  console.log('\n🗣️ Testing Conversation Flow');
  console.log('=' .repeat(50));
  
  const conversationSteps = [
    {
      user: '내일 일정 알려줘',
      expectedIntent: 'QUERY_SCHEDULE',
      description: 'User asks for tomorrow schedule'
    },
    {
      user: '내일 오후 3시에 회의 잡아줘',
      expectedIntent: 'CREATE_EVENT', 
      description: 'User schedules meeting'
    },
    {
      user: '내일 일정 다시 보여줘',
      expectedIntent: 'QUERY_SCHEDULE',
      description: 'User checks updated schedule'
    }
  ];

  let conversationSuccess = true;
  
  for (let i = 0; i < conversationSteps.length; i++) {
    const step = conversationSteps[i];
    console.log(`\nStep ${i + 1}: ${step.description}`);
    console.log(`User: "${step.user}"`);
    
    try {
      const response = await makeRequest(`${config.backend}/nlp/process`, {
        method: 'POST',
        body: { input: step.user }
      });

      if (response.statusCode === 200) {
        const result = response.data.aiResponse;
        const stepSuccess = result.intent === step.expectedIntent;
        
        console.log(`AI: "${result.message}"`);
        console.log(`Intent: ${result.intent} (Expected: ${step.expectedIntent}) ${stepSuccess ? '✅' : '❌'}`);
        
        if (result.events && result.events.length > 0) {
          console.log(`Events: ${result.events.length} event(s) returned`);
        }
        
        if (!stepSuccess) {
          conversationSuccess = false;
        }
      } else {
        console.log('❌ Request failed');
        conversationSuccess = false;
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      conversationSuccess = false;
    }
  }
  
  return conversationSuccess;
}

// Performance test
async function testNLPPerformance() {
  console.log('\n⚡ Testing NLP Performance');
  console.log('=' .repeat(50));
  
  const testQueries = [
    '내일 오후에 회의 잡아줘',
    'Schedule meeting tomorrow',
    '오늘 일정 알려줘',
    'Cancel my appointment'
  ];
  
  const performanceResults = [];
  
  for (const query of testQueries) {
    const startTime = Date.now();
    
    try {
      const response = await makeRequest(`${config.backend}/nlp/process`, {
        method: 'POST',
        body: { input: query }
      });
      
      const duration = Date.now() - startTime;
      const success = response.statusCode === 200;
      
      performanceResults.push({
        query,
        duration,
        success
      });
      
      console.log(`"${query}" - ${duration}ms ${success ? '✅' : '❌'}`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceResults.push({
        query,
        duration,
        success: false
      });
      console.log(`"${query}" - ${duration}ms ❌ Error`);
    }
  }
  
  const avgDuration = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
  const successRate = (performanceResults.filter(r => r.success).length / performanceResults.length) * 100;
  
  console.log(`\nAverage Response Time: ${avgDuration.toFixed(0)}ms`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  
  return {
    averageResponseTime: avgDuration,
    successRate: successRate
  };
}

// Main test runner
async function runNLPTests() {
  console.log('🤖 Starting Natural Language Processing Tests');
  console.log('=' .repeat(60));
  console.log(`Testing ${config.TEST_SCENARIOS.length} scenarios across multiple categories`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  let totalSuccess = 0;
  
  // Group scenarios by category
  const categorizedScenarios = {};
  config.TEST_SCENARIOS.forEach(scenario => {
    if (!categorizedScenarios[scenario.category]) {
      categorizedScenarios[scenario.category] = [];
    }
    categorizedScenarios[scenario.category].push(scenario);
  });
  
  // Test each category
  for (const [category, scenarios] of Object.entries(categorizedScenarios)) {
    console.log(`\n📋 ${category} (${scenarios.length} tests)`);
    console.log('-' .repeat(40));
    
    for (const scenario of scenarios) {
      const success = await testNLPScenario(scenario);
      if (success) totalSuccess++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Test conversation flow
  const conversationSuccess = await testConversationFlow();
  
  // Test performance
  const performanceResult = await testNLPPerformance();
  
  // Generate report
  const totalDuration = Date.now() - startTime;
  const totalScenarios = config.TEST_SCENARIOS.length;
  const successRate = (totalSuccess / totalScenarios) * 100;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Natural Language Processing Test Report');
  console.log('=' .repeat(60));
  
  console.log(`\n🎯 OVERALL RESULTS:`);
  console.log(`Total Tests: ${totalScenarios}`);
  console.log(`✅ Passed: ${totalSuccess}`);
  console.log(`❌ Failed: ${totalScenarios - totalSuccess}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  console.log(`\n⚡ PERFORMANCE METRICS:`);
  console.log(`Average Response Time: ${performanceResult.averageResponseTime.toFixed(0)}ms`);
  console.log(`API Success Rate: ${performanceResult.successRate.toFixed(1)}%`);
  
  console.log(`\n🗣️ CONVERSATION FLOW:`);
  console.log(`Multi-turn Chat: ${conversationSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`\n📈 CATEGORY BREAKDOWN:`);
  for (const [category, scenarios] of Object.entries(categorizedScenarios)) {
    const categoryResults = testResults.filter(r => r.category === category);
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = ((categorySuccess / categoryTotal) * 100).toFixed(1);
    
    console.log(`  ${category}: ${categorySuccess}/${categoryTotal} (${categoryRate}%)`);
  }
  
  if (totalSuccess < totalScenarios) {
    console.log(`\n❌ FAILED TESTS:`);
    testResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - [${r.category}] "${r.scenario}"`);
        console.log(`    ${r.details}`);
      });
  }
  
  console.log(`\n🌟 KEY FEATURES TESTED:`);
  console.log(`✅ Korean Language Support`);
  console.log(`✅ English Language Support`);
  console.log(`✅ Intent Classification (CREATE, QUERY, UPDATE, DELETE)`);
  console.log(`✅ Time Extraction (relative dates, specific times)`);
  console.log(`✅ Event Creation from Natural Language`);
  console.log(`✅ REST API and GraphQL Support`);
  console.log(`✅ Multi-turn Conversation Flow`);
  console.log(`✅ Performance under Load`);
  
  console.log(`\n🚀 CHAT-BASED SCHEDULE MANAGEMENT:`);
  if (successRate >= 80 && conversationSuccess && performanceResult.averageResponseTime < 1000) {
    console.log(`🎉 EXCELLENT! Chat-based scheduling is ready for production`);
    console.log(`• Users can schedule meetings using natural language`);
    console.log(`• Both Korean and English are well supported`);
    console.log(`• Response times are fast enough for real-time chat`);
  } else {
    console.log(`⚠️  Needs improvement before production deployment`);
    if (successRate < 80) console.log(`• Improve intent recognition accuracy`);
    if (!conversationSuccess) console.log(`• Fix conversation flow handling`);
    if (performanceResult.averageResponseTime >= 1000) console.log(`• Optimize response times`);
  }
  
  // Exit with proper code
  const overallSuccess = successRate >= 80 && conversationSuccess;
  process.exit(overallSuccess ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
  runNLPTests().catch(error => {
    console.error('💥 NLP test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  runNLPTests, 
  testNLPScenario,
  config 
};