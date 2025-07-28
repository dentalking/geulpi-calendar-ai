const http = require('http');

// Test configuration
const config = {
  backend: 'http://localhost:8080',
  mlServer: 'http://localhost:8000',
  frontend: 'http://localhost:3000',
  TARGET_TIME_MINUTES: 5
};

// Mock onboarding data
const mockOnboardingData = {
  googleTokens: {
    accessToken: 'mock-google-access-token-123',
    refreshToken: 'mock-google-refresh-token-456',
    idToken: 'mock-google-id-token-789'
  },
  lifePhilosophy: {
    areas: [
      {
        name: 'Work',
        color: '#3B82F6',
        icon: '💼',
        targetPercentage: 40.0
      },
      {
        name: 'Health & Fitness',
        color: '#10B981',
        icon: '💪',
        targetPercentage: 20.0
      },
      {
        name: 'Family & Relationships',
        color: '#F59E0B',
        icon: '👨‍👩‍👧‍👦',
        targetPercentage: 25.0
      },
      {
        name: 'Personal Growth',
        color: '#8B5CF6',
        icon: '📚',
        targetPercentage: 10.0
      },
      {
        name: 'Recreation',
        color: '#EF4444',
        icon: '🎮',
        targetPercentage: 5.0
      }
    ],
    idealBalance: {
      work: 40,
      health: 20,
      family: 25,
      growth: 10,
      recreation: 5
    },
    rules: [
      {
        name: 'Morning Workout',
        schedule: '0 6 * * 1,2,3,4,5', // Weekdays at 6 AM
        areaId: 'health',
        duration: 60,
        priority: 'HIGH'
      },
      {
        name: 'Family Dinner',
        schedule: '0 18 * * *', // Daily at 6 PM
        areaId: 'family',
        duration: 90,
        priority: 'MEDIUM'
      }
    ]
  },
  preferences: {
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Asia/Seoul',
      workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    },
    notifications: {
      suggestions: true,
      insights: true,
      reminders: true,
      reminderMinutesBefore: 15
    },
    aiAssistance: {
      proactivityLevel: 'BALANCED',
      autoScheduling: true,
      autoClassification: true
    },
    defaultEventDuration: 60,
    bufferTime: 15
  }
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
const onboardingSteps = [];
let onboardingStartTime;

function logStep(name, success, duration, details = '') {
  const step = { 
    name, 
    success, 
    duration: duration || 0,
    details, 
    timestamp: new Date().toISOString() 
  };
  onboardingSteps.push(step);
  const status = success ? '✅' : '❌';
  const timeStr = duration ? ` (${duration}ms)` : '';
  console.log(`${status} ${name}${timeStr}${details ? ` - ${details}` : ''}`);
}

// Test preparation
async function resetUserForTest() {
  console.log('\n🔄 Preparing Test Environment');
  const stepStart = Date.now();
  
  try {
    const resetResponse = await makeRequest(`${config.backend}/test/reset-onboarding`, {
      method: 'POST'
    });
    
    const success = resetResponse.statusCode === 200;
    const duration = Date.now() - stepStart;
    
    logStep('Test Environment Reset', success, duration, 
      success ? 'User reset for onboarding' : `Failed: ${resetResponse.statusCode}`);
    
    return success;
  } catch (error) {
    logStep('Test Environment Reset', false, Date.now() - stepStart, error.message);
    return false;
  }
}

// Onboarding flow simulation
async function simulateUserSignup() {
  console.log('\n👤 Step 1: User Signup & Authentication');
  const stepStart = Date.now();
  
  try {
    // Simulate user registration/login
    const loginResponse = await makeRequest(`${config.backend}/auth/login`, {
      method: 'POST',
      body: {
        email: 'user@example.com',
        password: 'password'
      }
    });

    const success = loginResponse.statusCode === 200 && loginResponse.data?.success;
    const duration = Date.now() - stepStart;
    
    logStep('User Authentication', success, duration, 
      success ? `Token received` : `Failed: ${loginResponse.statusCode}`);
    
    return success ? loginResponse.data.token : null;
  } catch (error) {
    logStep('User Authentication', false, Date.now() - stepStart, error.message);
    return null;
  }
}

async function simulateGoogleOAuthSetup() {
  console.log('\n🔐 Step 2: Google OAuth Integration');
  const stepStart = Date.now();
  
  // Simulate OAuth flow delay (realistic user interaction time)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // In real implementation, this would redirect to Google OAuth
    // For testing, we simulate successful OAuth completion
    const duration = Date.now() - stepStart;
    logStep('Google OAuth Setup', true, duration, 'OAuth tokens obtained');
    return mockOnboardingData.googleTokens;
  } catch (error) {
    logStep('Google OAuth Setup', false, Date.now() - stepStart, error.message);
    return null;
  }
}

async function simulateLifePhilosophySetup() {
  console.log('\n🎯 Step 3: Life Philosophy Configuration');
  const stepStart = Date.now();
  
  try {
    // Simulate user selecting life areas and percentages
    // In a real UI, this would take some time for user input
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const duration = Date.now() - stepStart;
    logStep('Life Areas Selection', true, duration, 
      `${mockOnboardingData.lifePhilosophy.areas.length} areas configured`);
    
    // Simulate setting ideal balance
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const balanceDuration = Date.now() - stepStart - duration;
    logStep('Ideal Balance Setup', true, balanceDuration, 'Balance percentages set');
    
    return mockOnboardingData.lifePhilosophy;
  } catch (error) {
    logStep('Life Philosophy Setup', false, Date.now() - stepStart, error.message);
    return null;
  }
}

async function simulatePreferencesSetup() {
  console.log('\n⚙️ Step 4: Preferences Configuration');
  const stepStart = Date.now();
  
  try {
    // Working hours setup
    await new Promise(resolve => setTimeout(resolve, 300));
    const workingHoursTime = Date.now() - stepStart;
    logStep('Working Hours Setup', true, workingHoursTime, 
      `${mockOnboardingData.preferences.workingHours.start}-${mockOnboardingData.preferences.workingHours.end}`);
    
    // Notification preferences
    await new Promise(resolve => setTimeout(resolve, 200));
    const notificationTime = Date.now() - stepStart - workingHoursTime;
    logStep('Notification Preferences', true, notificationTime, 'All notifications enabled');
    
    // AI assistance settings
    await new Promise(resolve => setTimeout(resolve, 250));
    const aiTime = Date.now() - stepStart - workingHoursTime - notificationTime;
    logStep('AI Assistance Settings', true, aiTime, 
      `Level: ${mockOnboardingData.preferences.aiAssistance.proactivityLevel}`);
    
    return mockOnboardingData.preferences;
  } catch (error) {
    logStep('Preferences Setup', false, Date.now() - stepStart, error.message);
    return null;
  }
}

async function submitOnboarding(token, googleTokens, lifePhilosophy, preferences) {
  console.log('\n📝 Step 5: Complete Onboarding');
  const stepStart = Date.now();
  
  try {
    const onboardingData = {
      googleTokens,
      lifePhilosophy,
      preferences
    };

    // Test REST API endpoint
    const restResponse = await makeRequest(`${config.backend}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: onboardingData
    });

    const restSuccess = restResponse.statusCode === 200 && restResponse.data?.success;
    const restDuration = Date.now() - stepStart;
    
    logStep('REST API Onboarding', restSuccess, restDuration,
      restSuccess ? 'Onboarding completed' : `Failed: ${restResponse.statusCode}`);

    // Test GraphQL mutation
    const graphqlQuery = {
      query: `
        mutation CompleteOnboarding($input: OnboardingInput!) {
          completeOnboarding(input: $input) {
            id
            onboardingCompleted
            lifePhilosophy {
              idealBalance
              areas {
                name
                targetPercentage
              }
            }
          }
        }`,
      variables: {
        input: onboardingData
      }
    };

    const graphqlResponse = await makeRequest(`${config.backend}/graphql`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: graphqlQuery
    });

    const graphqlSuccess = graphqlResponse.statusCode === 200 && 
                          graphqlResponse.data?.data?.completeOnboarding;
    const graphqlDuration = Date.now() - stepStart - restDuration;
    
    logStep('GraphQL Onboarding', graphqlSuccess, graphqlDuration,
      graphqlSuccess ? 'Mutation successful' : `Failed: ${graphqlResponse.statusCode}`);

    return restSuccess && graphqlSuccess;
  } catch (error) {
    logStep('Complete Onboarding', false, Date.now() - stepStart, error.message);
    return false;
  }
}

async function simulateInitialCalendarSync(googleTokens) {
  console.log('\n📅 Step 6: Initial Calendar Sync');
  const stepStart = Date.now();
  
  try {
    const syncResponse = await makeRequest(`${config.backend}/sync/google-calendar`, {
      method: 'POST',
      body: {
        accessToken: googleTokens.accessToken
      }
    });

    const success = syncResponse.statusCode === 200 && syncResponse.data?.success;
    const duration = Date.now() - stepStart;
    
    logStep('Calendar Sync', success, duration,
      success ? `${syncResponse.data.eventsImported} events imported` : 
               `Failed: ${syncResponse.statusCode}`);
    
    return success;
  } catch (error) {
    logStep('Calendar Sync', false, Date.now() - stepStart, error.message);
    return false;
  }
}

async function testInitialMLClassification(token) {
  console.log('\n🤖 Step 7: Initial ML Model Test');
  const stepStart = Date.now();
  
  try {
    // Test event classification with user's first event
    const testEvent = {
      title: 'Team Planning Meeting',
      description: 'Quarterly planning session with the development team',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      location: 'Conference Room A'
    };

    const classifyResponse = await makeRequest(`${config.backend}/events/classify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: testEvent
    });

    const success = classifyResponse.statusCode === 200 && 
                   classifyResponse.data?.success;
    const duration = Date.now() - stepStart;
    
    logStep('ML Classification Test', success, duration,
      success ? `Event classified as ${classifyResponse.data.classification?.eventType}` :
               `Failed: ${classifyResponse.statusCode}`);
    
    return success;
  } catch (error) {
    logStep('ML Classification Test', false, Date.now() - stepStart, error.message);
    return false;
  }
}

async function verifyOnboardingCompletion(token) {
  console.log('\n✅ Step 8: Verify Onboarding Status');
  const stepStart = Date.now();
  
  try {
    // Check user profile
    const userQuery = {
      query: `
        query {
          me {
            id
            onboardingCompleted
            lifePhilosophy {
              areas {
                name
                targetPercentage
              }
              idealBalance
            }
            preferences {
              workingHours {
                start
                end
              }
              aiAssistance {
                proactivityLevel
              }
            }
          }
        }`
    };

    const userResponse = await makeRequest(`${config.backend}/graphql`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: userQuery
    });

    const user = userResponse.data?.data?.me;
    const success = user?.onboardingCompleted === true &&
                   user?.lifePhilosophy?.areas?.length > 0;
    const duration = Date.now() - stepStart;
    
    logStep('Onboarding Verification', success, duration,
      success ? 'User profile fully configured' : 'Incomplete profile');
    
    return success;
  } catch (error) {
    logStep('Onboarding Verification', false, Date.now() - stepStart, error.message);
    return false;
  }
}

// Main onboarding test
async function runOnboardingTest() {
  console.log('🚀 Starting Geulpi Onboarding Flow Test');
  console.log('=' .repeat(60));
  console.log(`Target completion time: ${config.TARGET_TIME_MINUTES} minutes`);
  console.log('=' .repeat(60));
  
  onboardingStartTime = Date.now();
  
  try {
    // Step 0: Reset test environment
    const resetSuccess = await resetUserForTest();
    if (!resetSuccess) {
      throw new Error('Test environment reset failed');
    }
    
    // Step 1: User signup/authentication
    const token = await simulateUserSignup();
    if (!token) {
      throw new Error('Authentication failed');
    }
    
    // Step 2: Google OAuth setup
    const googleTokens = await simulateGoogleOAuthSetup();
    if (!googleTokens) {
      throw new Error('Google OAuth setup failed');
    }
    
    // Step 3: Life philosophy configuration
    const lifePhilosophy = await simulateLifePhilosophySetup();
    if (!lifePhilosophy) {
      throw new Error('Life philosophy setup failed');
    }
    
    // Step 4: Preferences setup
    const preferences = await simulatePreferencesSetup();
    if (!preferences) {
      throw new Error('Preferences setup failed');
    }
    
    // Step 5: Submit onboarding
    const onboardingSuccess = await submitOnboarding(token, googleTokens, lifePhilosophy, preferences);
    if (!onboardingSuccess) {
      throw new Error('Onboarding submission failed');
    }
    
    // Step 6: Initial calendar sync
    await simulateInitialCalendarSync(googleTokens);
    
    // Step 7: Test ML classification
    await testInitialMLClassification(token);
    
    // Step 8: Verify completion
    await verifyOnboardingCompletion(token);
    
  } catch (error) {
    console.error(`\n💥 Onboarding test failed: ${error.message}`);
  }
  
  // Generate comprehensive report
  generateOnboardingReport();
}

function generateOnboardingReport() {
  const totalDuration = Date.now() - onboardingStartTime;
  const totalMinutes = totalDuration / 1000 / 60;
  const passed = onboardingSteps.filter(s => s.success).length;
  const failed = onboardingSteps.filter(s => !s.success).length;
  const total = onboardingSteps.length;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Onboarding Flow Test Report');
  console.log('=' .repeat(60));
  
  console.log(`\n⏱️  TIMING ANALYSIS:`);
  console.log(`Total Duration: ${totalMinutes.toFixed(2)} minutes`);
  console.log(`Target Time: ${config.TARGET_TIME_MINUTES} minutes`);
  const timeStatus = totalMinutes <= config.TARGET_TIME_MINUTES ? '✅ PASS' : '❌ FAIL';
  console.log(`Time Goal: ${timeStatus}`);
  
  if (totalMinutes > config.TARGET_TIME_MINUTES) {
    const excess = totalMinutes - config.TARGET_TIME_MINUTES;
    console.log(`⚠️  Exceeded by: ${excess.toFixed(2)} minutes`);
  }
  
  console.log(`\n📈 STEP ANALYSIS:`);
  console.log(`Total Steps: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  console.log(`\n🔍 DETAILED BREAKDOWN:`);
  onboardingSteps.forEach((step, index) => {
    const status = step.success ? '✅' : '❌';
    const duration = `${step.duration}ms`;
    console.log(`  ${index + 1}. ${status} ${step.name} (${duration})`);
    if (step.details) {
      console.log(`     ${step.details}`);
    }
  });
  
  console.log(`\n🎯 PERFORMANCE METRICS:`);
  const avgStepTime = onboardingSteps.reduce((sum, s) => sum + s.duration, 0) / total;
  console.log(`Average Step Time: ${avgStepTime.toFixed(0)}ms`);
  
  const longestStep = onboardingSteps.reduce((max, s) => s.duration > max.duration ? s : max);
  console.log(`Longest Step: ${longestStep.name} (${longestStep.duration}ms)`);
  
  const shortestStep = onboardingSteps.reduce((min, s) => s.duration < min.duration ? s : min);
  console.log(`Shortest Step: ${shortestStep.name} (${shortestStep.duration}ms)`);
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  if (totalMinutes > config.TARGET_TIME_MINUTES) {
    console.log('• Consider simplifying the onboarding flow');
    console.log('• Implement progressive disclosure for advanced settings');
    console.log('• Add skip options for non-essential steps');
  }
  
  if (failed > 0) {
    console.log('• Fix failing onboarding steps to improve user experience');
    onboardingSteps
      .filter(s => !s.success)
      .forEach(s => console.log(`  - Fix: ${s.name}`));
  }
  
  if (totalMinutes <= config.TARGET_TIME_MINUTES && failed === 0) {
    console.log('✨ Excellent! Onboarding meets all requirements');
    console.log('• Users can complete setup within target time');
    console.log('• All critical features are working properly');
  }
  
  console.log(`\n🔗 Service Endpoints Tested:`);
  console.log(`  Authentication: ${config.backend}/auth/login`);
  console.log(`  Onboarding: ${config.backend}/onboarding/complete`);
  console.log(`  GraphQL: ${config.backend}/graphql`);
  console.log(`  Calendar Sync: ${config.backend}/sync/google-calendar`);
  console.log(`  ML Service: ${config.backend}/events/classify`);
  
  // Exit with proper code
  const overallSuccess = totalMinutes <= config.TARGET_TIME_MINUTES && failed === 0;
  process.exit(overallSuccess ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
  runOnboardingTest().catch(error => {
    console.error('💥 Onboarding test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  runOnboardingTest, 
  mockOnboardingData,
  makeRequest 
};