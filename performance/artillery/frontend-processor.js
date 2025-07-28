// Frontend performance testing processor for Geulpi Calendar Service

function simulateUserInteraction(context, events, done) {
  // Simulate realistic user interaction patterns
  context.vars.sessionStart = Date.now();
  context.vars.pageViews = 0;
  context.vars.userAgent = selectRandomUserAgent();
  return done();
}

function selectRandomUserAgent() {
  const userAgents = [
    // Desktop browsers
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    
    // Mobile browsers
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Gecko/121.0 Firefox/121.0',
    'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    
    // Tablet browsers
    'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function trackPageLoad(requestParams, response, context, ee, next) {
  context.vars.pageViews = (context.vars.pageViews || 0) + 1;
  
  // Measure page load performance
  const loadTime = response.timings.response;
  
  // Emit custom metrics based on page type
  const url = requestParams.url || requestParams.uri;
  let pageType = 'unknown';
  
  if (url === '/' || url.includes('home')) {
    pageType = 'homepage';
  } else if (url.includes('login')) {
    pageType = 'login';
  } else if (url.includes('dashboard')) {
    pageType = 'dashboard';
  } else if (url.includes('calendar')) {
    pageType = 'calendar';
  } else if (url.includes('onboarding')) {
    pageType = 'onboarding';
  }
  
  ee.emit('histogram', `page_load_time_${pageType}`, loadTime);
  
  // Performance thresholds
  if (loadTime > 3000) {
    ee.emit('counter', 'slow_page_loads', 1);
    console.log(`SLOW PAGE LOAD: ${url} took ${loadTime}ms`);
  }
  
  if (loadTime < 1000) {
    ee.emit('counter', 'fast_page_loads', 1);
  }
  
  return next();
}

function trackResourceLoad(requestParams, response, context, ee, next) {
  const url = requestParams.url || requestParams.uri;
  const loadTime = response.timings.response;
  
  // Categorize resource types
  let resourceType = 'other';
  
  if (url.includes('.css')) {
    resourceType = 'css';
  } else if (url.includes('.js')) {
    resourceType = 'javascript';
  } else if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) {
    resourceType = 'image';
  } else if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) {
    resourceType = 'font';
  } else if (url.includes('manifest.json')) {
    resourceType = 'manifest';
  } else if (url.includes('sw.js')) {
    resourceType = 'serviceworker';
  }
  
  ee.emit('histogram', `resource_load_time_${resourceType}`, loadTime);
  
  // Track cache performance
  const cacheControl = response.headers['cache-control'];
  if (cacheControl) {
    if (response.statusCode === 304) {
      ee.emit('counter', 'cache_hits', 1);
    } else if (response.statusCode === 200) {
      ee.emit('counter', 'cache_misses', 1);
    }
  }
  
  return next();
}

function simulateNetworkConditions(context, events, done) {
  // Simulate different network conditions
  const networkTypes = ['fast', 'slow', 'mobile'];
  const networkType = networkTypes[Math.floor(Math.random() * networkTypes.length)];
  
  context.vars.networkType = networkType;
  
  // Adjust think time based on network speed
  switch (networkType) {
    case 'fast':
      context.vars.thinkTime = 1000; // 1 second
      break;
    case 'slow':
      context.vars.thinkTime = 3000; // 3 seconds
      break;
    case 'mobile':
      context.vars.thinkTime = 2000; // 2 seconds
      break;
  }
  
  return done();
}

function measureCoreWebVitals(requestParams, response, context, ee, next) {
  // Simulate Core Web Vitals measurements
  const url = requestParams.url || requestParams.uri;
  
  // Only measure for main pages, not assets
  if (url.includes('.css') || url.includes('.js') || url.includes('.png')) {
    return next();
  }
  
  const responseTime = response.timings.response;
  
  // Simulate LCP (Largest Contentful Paint) - should be < 2.5s
  const simulatedLCP = responseTime + Math.random() * 1000;
  ee.emit('histogram', 'lcp', simulatedLCP);
  
  if (simulatedLCP > 2500) {
    ee.emit('counter', 'poor_lcp', 1);
  } else if (simulatedLCP < 2500) {
    ee.emit('counter', 'good_lcp', 1);
  }
  
  // Simulate FID (First Input Delay) - should be < 100ms
  const simulatedFID = Math.random() * 300;
  ee.emit('histogram', 'fid', simulatedFID);
  
  if (simulatedFID > 100) {
    ee.emit('counter', 'poor_fid', 1);
  } else {
    ee.emit('counter', 'good_fid', 1);
  }
  
  // Simulate CLS (Cumulative Layout Shift) - should be < 0.1
  const simulatedCLS = Math.random() * 0.3;
  ee.emit('histogram', 'cls', simulatedCLS * 1000); // Convert to ms for histogram
  
  if (simulatedCLS > 0.1) {
    ee.emit('counter', 'poor_cls', 1);
  } else {
    ee.emit('counter', 'good_cls', 1);
  }
  
  return next();
}

function trackErrorRates(requestParams, response, context, ee, next) {
  const statusCode = response.statusCode;
  
  // Track different types of errors
  if (statusCode >= 500) {
    ee.emit('counter', 'server_errors', 1);
  } else if (statusCode >= 400) {
    ee.emit('counter', 'client_errors', 1);
  } else if (statusCode >= 300) {
    ee.emit('counter', 'redirects', 1);
  } else if (statusCode >= 200) {
    ee.emit('counter', 'success_responses', 1);
  }
  
  // Track specific error patterns
  const url = requestParams.url || requestParams.uri;
  if (statusCode === 404) {
    console.log(`404 Not Found: ${url}`);
    ee.emit('counter', 'not_found_errors', 1);
  }
  
  if (statusCode === 401 || statusCode === 403) {
    ee.emit('counter', 'auth_errors', 1);
  }
  
  return next();
}

function simulateUserJourney(context, events, done) {
  // Define common user journeys
  const journeys = [
    'new_user',     // Landing -> Login -> Onboarding -> Dashboard
    'returning_user', // Landing -> Login -> Dashboard -> Calendar
    'guest_user',   // Landing -> Browse -> Login
    'mobile_user'   // Optimized for mobile experience
  ];
  
  context.vars.userJourney = journeys[Math.floor(Math.random() * journeys.length)];
  context.vars.journeyStep = 0;
  
  return done();
}

function validateAccessibility(requestParams, response, context, ee, next) {
  // Simulate accessibility checks
  const responseBody = response.body;
  
  if (typeof responseBody === 'string') {
    // Check for basic accessibility features
    let accessibilityScore = 0;
    
    if (responseBody.includes('alt=')) accessibilityScore += 1;
    if (responseBody.includes('role=')) accessibilityScore += 1;
    if (responseBody.includes('aria-')) accessibilityScore += 1;
    if (responseBody.includes('<title>')) accessibilityScore += 1;
    if (responseBody.includes('lang=')) accessibilityScore += 1;
    
    ee.emit('histogram', 'accessibility_score', accessibilityScore);
  }
  
  return next();
}

function trackBundleSize(requestParams, response, context, ee, next) {
  const url = requestParams.url || requestParams.uri;
  const contentLength = response.headers['content-length'];
  
  if (contentLength && url.includes('.js')) {
    const size = parseInt(contentLength);
    ee.emit('histogram', 'javascript_bundle_size', size);
    
    // Flag large bundles
    if (size > 500 * 1024) { // 500KB
      ee.emit('counter', 'large_bundles', 1);
      console.log(`LARGE BUNDLE: ${url} is ${Math.round(size / 1024)}KB`);
    }
  }
  
  if (contentLength && url.includes('.css')) {
    const size = parseInt(contentLength);
    ee.emit('histogram', 'css_bundle_size', size);
  }
  
  return next();
}

function simulateSlowConnection(context, events, done) {
  // Simulate slow network conditions for some users
  if (Math.random() < 0.2) { // 20% of users on slow connections
    context.vars.slowConnection = true;
    context.vars.additionalDelay = Math.random() * 2000; // Up to 2s additional delay
  }
  
  return done();
}

module.exports = {
  simulateUserInteraction,
  trackPageLoad,
  trackResourceLoad,
  simulateNetworkConditions,
  measureCoreWebVitals,
  trackErrorRates,
  simulateUserJourney,
  validateAccessibility,
  trackBundleSize,
  simulateSlowConnection
};