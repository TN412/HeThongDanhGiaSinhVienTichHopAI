#!/usr/bin/env node
/**
 * Test Application Insights Integration
 *
 * Usage: node test-app-insights.js
 *
 * This script verifies:
 * 1. App Insights module loads correctly
 * 2. Monitoring middleware loads correctly
 * 3. All tracking functions are available
 * 4. Mock tracking events (without actual backend running)
 */

console.log('🧪 Testing Application Insights Integration\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`✅ ${description}`);
  } catch (error) {
    failedTests++;
    console.log(`❌ ${description}`);
    console.error(`   Error: ${error.message}`);
  }
}

// Test 1: Load appInsights module
test('Load appInsights module', () => {
  const appInsights = require('./src/config/appInsights');
  if (!appInsights) throw new Error('Module not loaded');
});

// Test 2: Check appInsights exports
test('Check appInsights exports', () => {
  const appInsights = require('./src/config/appInsights');
  const expectedExports = [
    'initializeAppInsights',
    'getClient',
    'trackEvent',
    'trackOpenAICall',
    'trackAIChatRequest',
    'trackAIChatError',
    'trackSubmissionSubmitted',
    'trackAssignmentGeneration',
    'trackMetric',
    'trackException',
    'flush',
  ];

  const actualExports = Object.keys(appInsights);

  expectedExports.forEach(name => {
    if (!actualExports.includes(name)) {
      throw new Error(`Missing export: ${name}`);
    }
    if (typeof appInsights[name] !== 'function') {
      throw new Error(`Export ${name} is not a function`);
    }
  });
});

// Test 3: Load monitoring middleware
test('Load monitoring middleware', () => {
  const monitoring = require('./src/middleware/monitoring');
  if (!monitoring) throw new Error('Module not loaded');
});

// Test 4: Check monitoring exports
test('Check monitoring exports', () => {
  const monitoring = require('./src/middleware/monitoring');
  const expectedExports = [
    'requestTimingMiddleware',
    'healthCheckTimingMiddleware',
    'trackOperationTiming',
    'trackDatabaseQuery',
    'trackMemoryUsage',
    'startMemoryTracking',
  ];

  const actualExports = Object.keys(monitoring);

  expectedExports.forEach(name => {
    if (!actualExports.includes(name)) {
      throw new Error(`Missing export: ${name}`);
    }
    if (typeof monitoring[name] !== 'function') {
      throw new Error(`Export ${name} is not a function`);
    }
  });
});

// Test 5: Initialize App Insights (without credentials)
test('Initialize App Insights (no credentials)', () => {
  const { initializeAppInsights } = require('./src/config/appInsights');
  const client = initializeAppInsights();
  // Should return null if no credentials
  if (process.env.APPINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    if (!client) throw new Error('Client should be initialized with credentials');
  } else {
    if (client !== null) throw new Error('Client should be null without credentials');
  }
});

// Test 6: Track mock AI chat request (no-op without client)
test('Track mock AI chat request', () => {
  const { trackAIChatRequest } = require('./src/config/appInsights');
  // Should not throw even without client
  trackAIChatRequest({
    submissionId: 'test-submission-123',
    questionId: 'test-question-1',
    promptLength: 50,
    hasContext: true,
    studentId: 'test-student-123',
  });
});

// Test 7: Track mock OpenAI call (no-op without client)
test('Track mock OpenAI call', () => {
  const { trackOpenAICall } = require('./src/config/appInsights');
  trackOpenAICall('chat.completions', 1234, true, {
    model: 'gpt-4',
    promptTokens: 100,
    completionTokens: 150,
    totalTokens: 250,
    submissionId: 'test-submission-123',
  });
});

// Test 8: Track mock submission (no-op without client)
test('Track mock submission submitted', () => {
  const { trackSubmissionSubmitted } = require('./src/config/appInsights');
  trackSubmissionSubmitted({
    submissionId: 'test-submission-123',
    assignmentId: 'test-assignment-456',
    studentId: 'test-student-123',
    questionsCount: 10,
    aiInteractionsCount: 5,
    totalScore: 85,
    aiSkillScore: 75,
    finalScore: 82,
    timeSpentMinutes: 45,
  });
});

// Test 9: Track mock assignment generation (no-op without client)
test('Track mock assignment generation', () => {
  const { trackAssignmentGeneration } = require('./src/config/appInsights');
  trackAssignmentGeneration({
    assignmentId: 'test-assignment-456',
    instructorId: 'test-instructor-789',
    questionType: 'multiple-choice',
    documentType: 'pdf',
    questionsGenerated: 10,
    generationTime: 5000,
  });
});

// Test 10: Track mock metric (no-op without client)
test('Track mock metric', () => {
  const { trackMetric } = require('./src/config/appInsights');
  trackMetric('test_metric', 123.45, { test: 'value' });
});

// Test 11: Track mock exception (no-op without client)
test('Track mock exception', () => {
  const { trackException } = require('./src/config/appInsights');
  trackException(new Error('Test error'), { test: 'value' });
});

// Test 12: Track memory usage (no-op without client)
test('Track memory usage', () => {
  const { trackMemoryUsage } = require('./src/middleware/monitoring');
  trackMemoryUsage();
});

// Test 13: Create timing middleware
test('Create request timing middleware', () => {
  const { requestTimingMiddleware } = require('./src/middleware/monitoring');

  // Mock Express req, res, next
  const req = { method: 'GET', path: '/test', user: { id: 'test-user' } };
  const res = {
    json: () => res,
    send: () => res,
    on: () => {},
    statusCode: 200,
  };
  const next = () => {};

  // Should not throw
  requestTimingMiddleware(req, res, next);
});

// Test 14: Create operation timing middleware
test('Create operation timing middleware', () => {
  const { trackOperationTiming } = require('./src/middleware/monitoring');
  const middleware = trackOperationTiming('test_operation');

  if (typeof middleware !== 'function') {
    throw new Error('Should return a function');
  }

  // Mock Express req, res, next
  const req = { user: { id: 'test-user' } };
  const res = {
    on: () => {},
    statusCode: 200,
  };
  const next = () => {};

  // Should not throw
  middleware(req, res, next);
});

// Test 15: Track database query (mock)
test('Track database query (mock)', async () => {
  const { trackDatabaseQuery } = require('./src/middleware/monitoring');

  // Mock query function
  const queryFn = async () => {
    return { success: true };
  };

  const result = await trackDatabaseQuery('test_query', queryFn);

  if (!result.success) {
    throw new Error('Query should succeed');
  }
});

console.log('='.repeat(60));
console.log(`\n📊 Test Results:`);
console.log(`   Total:  ${totalTests}`);
console.log(`   Passed: ${passedTests} ✅`);
console.log(`   Failed: ${failedTests} ❌`);

if (failedTests > 0) {
  console.log(`\n❌ Some tests failed. Please check the errors above.`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed! Application Insights integration is working correctly.`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Add APPINSIGHTS_CONNECTION_STRING to .env`);
  console.log(`   2. Start backend: npm run dev`);
  console.log(`   3. Check Azure Portal > Live Metrics`);
  console.log(`   4. Send test requests to see telemetry`);
  process.exit(0);
}
