const http = require('http');

// Test configuration
const config = {
  backend: 'http://localhost:8080',
  mlServer: 'http://localhost:8000',
  frontend: 'http://localhost:3000'
};

// Test credentials
const testCredentials = {
  email: 'user@example.com',
  password: 'password'
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

function logTest(name, success, details = '') {
  const result = { name, success, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  const status = success ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ` - ${details}` : ''}`);
}

// Test functions
async function testHealthChecks() {
  console.log('\n🔍 Testing Service Health Checks...');
  
  try {
    // Test backend health
    const backendHealth = await makeRequest(`${config.backend}/health`);
    logTest('Backend Health Check', 
      backendHealth.statusCode === 200 && backendHealth.data?.status === 'healthy',
      `Status: ${backendHealth.statusCode}`);

    // Test ML server health
    const mlHealth = await makeRequest(`${config.mlServer}/health`);
    logTest('ML Server Health Check', 
      mlHealth.statusCode === 200 && mlHealth.data?.status,
      `Status: ${mlHealth.statusCode}`);

    // Test frontend health (if it has one)
    try {
      const frontendHealth = await makeRequest(`${config.frontend}/health`);
      logTest('Frontend Health Check', 
        frontendHealth.statusCode === 200,
        `Status: ${frontendHealth.statusCode}`);
    } catch (error) {
      logTest('Frontend Health Check', false, 'Service not responding');
    }

  } catch (error) {
    logTest('Health Checks', false, error.message);
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Flow...');
  
  try {
    // Test successful login
    const loginResponse = await makeRequest(`${config.backend}/auth/login`, {
      method: 'POST',
      body: testCredentials
    });

    const loginSuccess = loginResponse.statusCode === 200 && 
                        loginResponse.data?.success === true &&
                        loginResponse.data?.token;

    logTest('User Login', loginSuccess, 
      loginSuccess ? `Token: ${loginResponse.data.token.substring(0, 20)}...` : 
                    `Status: ${loginResponse.statusCode}`);

    // Test invalid credentials
    const invalidLogin = await makeRequest(`${config.backend}/auth/login`, {
      method: 'POST',
      body: { email: 'invalid@test.com', password: 'wrong' }
    });

    logTest('Invalid Credentials Rejection', 
      invalidLogin.statusCode === 401 && invalidLogin.data?.success === false,
      `Status: ${invalidLogin.statusCode}`);

    return loginSuccess ? loginResponse.data.token : null;

  } catch (error) {
    logTest('Authentication Flow', false, error.message);
    return null;
  }
}

async function testEventOperations(token) {
  console.log('\n📅 Testing Event Operations...');
  
  try {
    // Test get events
    const eventsResponse = await makeRequest(`${config.backend}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    logTest('Get Events', 
      eventsResponse.statusCode === 200 && Array.isArray(eventsResponse.data?.events),
      `Found ${eventsResponse.data?.events?.length || 0} events`);

    // Test create new event
    const newEvent = {
      title: 'Integration Test Event',
      description: 'Test event for integration testing',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      area: 'WORK'
    };

    const createResponse = await makeRequest(`${config.backend}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: newEvent
    });

    const createSuccess = createResponse.statusCode === 201 && 
                         createResponse.data?.success === true &&
                         createResponse.data?.event?.id;

    logTest('Create Event', createSuccess,
      createSuccess ? `Event ID: ${createResponse.data.event.id}` : 
                     `Status: ${createResponse.statusCode}`);

    return createSuccess ? createResponse.data.event : null;

  } catch (error) {
    logTest('Event Operations', false, error.message);
    return null;
  }
}

async function testMLClassification(token) {
  console.log('\n🤖 Testing ML Classification Flow...');
  
  try {
    // Test event classification
    const classificationRequest = {
      title: 'Important Business Meeting',
      description: 'Quarterly review with the executive team',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      location: 'Conference Room A'
    };

    const classifyResponse = await makeRequest(`${config.backend}/events/classify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: classificationRequest
    });

    const classifySuccess = classifyResponse.statusCode === 200 && 
                           classifyResponse.data?.success === true &&
                           classifyResponse.data?.classification;

    logTest('Event Classification', classifySuccess,
      classifySuccess ? 
        `Type: ${classifyResponse.data.classification.eventType}, Confidence: ${classifyResponse.data.classification.confidence}` :
        `Status: ${classifyResponse.statusCode}`);

    // Test direct ML server endpoint
    try {
      const directMLResponse = await makeRequest(`${config.mlServer}/classify-event`, {
        method: 'POST',
        body: classificationRequest
      });

      logTest('Direct ML Server Call', 
        directMLResponse.statusCode === 200 || directMLResponse.statusCode === 503,
        `Status: ${directMLResponse.statusCode} (503 expected if models not trained)`);

    } catch (error) {
      logTest('Direct ML Server Call', false, 'ML server not accessible');
    }

    return classifySuccess;

  } catch (error) {
    logTest('ML Classification Flow', false, error.message);
    return false;
  }
}

async function testCompleteWorkflow() {
  console.log('\n🔄 Testing Complete Integration Workflow...');
  
  try {
    // Step 1: Login
    const token = await testAuthentication();
    if (!token) {
      logTest('Complete Workflow', false, 'Authentication failed');
      return;
    }

    // Step 2: Get existing events
    const eventsResponse = await makeRequest(`${config.backend}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Step 3: Create a new event
    const newEvent = await testEventOperations(token);
    if (!newEvent) {
      logTest('Complete Workflow', false, 'Event creation failed');
      return;
    }

    // Step 4: Classify the event
    const classificationSuccess = await testMLClassification(token);

    // Step 5: Verify end-to-end flow
    logTest('Complete Integration Workflow', 
      token && newEvent && classificationSuccess,
      'Login → Events → Classification flow completed');

  } catch (error) {
    logTest('Complete Integration Workflow', false, error.message);
  }
}

async function testServiceCommunication() {
  console.log('\n🌐 Testing Inter-Service Communication...');
  
  try {
    // Test backend → ML server communication
    const testEvent = {
      title: 'Service Communication Test',
      description: 'Testing backend to ML server communication',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString()
    };

    const commResponse = await makeRequest(`${config.backend}/events/classify`, {
      method: 'POST',
      body: testEvent
    });

    const communicationSuccess = commResponse.statusCode === 200 && 
                                commResponse.data?.success === true;

    logTest('Backend → ML Server Communication', communicationSuccess,
      communicationSuccess ? 'Services communicating properly' : 
                           `Communication failed: ${commResponse.statusCode}`);

  } catch (error) {
    logTest('Service Communication', false, error.message);
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Geulpi Integration Tests');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();

  // Run all test suites
  await testHealthChecks();
  await testAuthentication();
  await testServiceCommunication();
  await testCompleteWorkflow();

  // Generate test summary
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Integration Test Summary');
  console.log('=' .repeat(50));
  
  const passed = testResults.filter(t => t.success).length;
  const failed = testResults.filter(t => !t.success).length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(t => !t.success)
      .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
  }

  console.log('\n🔗 Service Endpoints:');
  console.log(`  Frontend: ${config.frontend}`);
  console.log(`  Backend:  ${config.backend}`);
  console.log(`  ML Server: ${config.mlServer}`);
  
  // Exit with proper code
  process.exit(failed > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests, makeRequest, testResults };