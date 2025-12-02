/**
 * Azure Application Insights Configuration
 *
 * Monitors:
 * - Request/Response timing (all routes)
 * - OpenAI API calls (timing, errors, token usage)
 * - Custom events (ai_chat_request, submission_submitted, etc.)
 * - Dependencies (MongoDB, Azure Blob, OpenAI)
 * - Exceptions and errors
 *
 * Dashboard: View metrics in Azure Portal > Application Insights
 */

const appInsights = require('applicationinsights');

let client = null;
let isInitialized = false;

/**
 * Initialize Application Insights
 * Only runs if APPINSIGHTS_CONNECTION_STRING or APPINSIGHTS_INSTRUMENTATIONKEY is set
 */
function initializeAppInsights() {
  const connectionString = process.env.APPINSIGHTS_CONNECTION_STRING;
  const instrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

  // Skip if no App Insights credentials
  if (!connectionString && !instrumentationKey) {
    console.log('📊 Application Insights: Not configured (optional in development)');
    return null;
  }

  try {
    // Setup App Insights
    if (connectionString) {
      appInsights.setup(connectionString);
    } else if (instrumentationKey) {
      appInsights.setup(instrumentationKey);
    }

    // Configuration
    appInsights
      .setAutoDependencyCorrelation(true) // Correlate HTTP requests with dependencies
      .setAutoCollectRequests(true) // Auto-collect HTTP requests
      .setAutoCollectPerformance(true, true) // CPU, memory, GC
      .setAutoCollectExceptions(true) // Unhandled exceptions
      .setAutoCollectDependencies(true) // External calls (MongoDB, HTTP, etc.)
      .setAutoCollectConsole(true, true) // Console logs (info, warn, error)
      .setUseDiskRetryCaching(true) // Retry failed telemetry
      .setSendLiveMetrics(true) // Live Metrics Stream
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C) // W3C TraceContext
      .setInternalLogging(false, false); // Disable App Insights internal logs

    // Start collecting telemetry
    appInsights.start();

    client = appInsights.defaultClient;
    isInitialized = true;

    // Add custom properties to all telemetry
    client.commonProperties = {
      environment: process.env.NODE_ENV || 'development',
      appVersion: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
    };

    console.log('✅ Application Insights initialized successfully');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Application Insights:', error.message);
    return null;
  }
}

/**
 * Get Application Insights client
 * @returns {TelemetryClient|null} App Insights client or null if not initialized
 */
function getClient() {
  if (!isInitialized) {
    return null;
  }
  return client;
}

/**
 * Track custom event
 * @param {string} eventName - Event name (e.g., 'ai_chat_request')
 * @param {Object} properties - Event properties
 * @param {Object} measurements - Event measurements (numbers)
 */
function trackEvent(eventName, properties = {}, measurements = {}) {
  if (!client) return;

  client.trackEvent({
    name: eventName,
    properties: {
      timestamp: new Date().toISOString(),
      ...properties,
    },
    measurements,
  });
}

/**
 * Track OpenAI API call
 * @param {string} endpoint - OpenAI endpoint (e.g., 'chat.completions')
 * @param {number} duration - Request duration in ms
 * @param {boolean} success - Whether request succeeded
 * @param {Object} metadata - Additional metadata (tokens, model, etc.)
 */
function trackOpenAICall(endpoint, duration, success, metadata = {}) {
  if (!client) return;

  client.trackDependency({
    dependencyTypeName: 'OpenAI',
    name: endpoint,
    data: JSON.stringify(metadata),
    duration,
    success,
    resultCode: success ? 200 : 500,
    properties: {
      model: metadata.model || 'unknown',
      promptTokens: metadata.promptTokens,
      completionTokens: metadata.completionTokens,
      totalTokens: metadata.totalTokens,
      submissionId: metadata.submissionId,
      questionId: metadata.questionId,
    },
  });

  // Also track as custom event for easier querying
  trackEvent(
    'openai_api_call',
    {
      endpoint,
      success: success.toString(),
      model: metadata.model || 'unknown',
      submissionId: metadata.submissionId,
      questionId: metadata.questionId,
    },
    {
      duration,
      promptTokens: metadata.promptTokens || 0,
      completionTokens: metadata.completionTokens || 0,
      totalTokens: metadata.totalTokens || 0,
    }
  );
}

/**
 * Track AI chat request (custom event)
 * @param {Object} data - Chat request data
 */
function trackAIChatRequest(data) {
  trackEvent(
    'ai_chat_request',
    {
      submissionId: data.submissionId,
      questionId: data.questionId || 'none',
      promptLength: data.promptLength,
      hasContext: data.hasContext ? 'true' : 'false',
      studentId: data.studentId,
    },
    {
      promptLength: data.promptLength,
    }
  );
}

/**
 * Track AI chat error (custom event)
 * @param {Object} data - Error data
 */
function trackAIChatError(data) {
  trackEvent('ai_chat_error', {
    submissionId: data.submissionId,
    errorType: data.errorType,
    errorMessage: data.errorMessage,
    studentId: data.studentId,
  });

  // Also track as exception
  if (client && data.error) {
    client.trackException({
      exception: data.error,
      properties: {
        submissionId: data.submissionId,
        errorType: data.errorType,
      },
    });
  }
}

/**
 * Track submission submitted (custom event)
 * @param {Object} data - Submission data
 */
function trackSubmissionSubmitted(data) {
  trackEvent(
    'submission_submitted',
    {
      submissionId: data.submissionId,
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      questionsCount: data.questionsCount,
      aiInteractionsCount: data.aiInteractionsCount,
    },
    {
      totalScore: data.totalScore || 0,
      aiSkillScore: data.aiSkillScore || 0,
      finalScore: data.finalScore || 0,
      timeSpentMinutes: data.timeSpentMinutes || 0,
    }
  );
}

/**
 * Track assignment generation (custom event)
 * @param {Object} data - Assignment generation data
 */
function trackAssignmentGeneration(data) {
  trackEvent(
    'assignment_generated',
    {
      assignmentId: data.assignmentId,
      instructorId: data.instructorId,
      questionType: data.questionType,
      documentType: data.documentType,
    },
    {
      questionsGenerated: data.questionsGenerated || 0,
      generationTime: data.generationTime || 0,
    }
  );
}

/**
 * Track metric (gauge value)
 * @param {string} name - Metric name
 * @param {number} value - Metric value
 * @param {Object} properties - Additional properties
 */
function trackMetric(name, value, properties = {}) {
  if (!client) return;

  client.trackMetric({
    name,
    value,
    properties: {
      timestamp: new Date().toISOString(),
      ...properties,
    },
  });
}

/**
 * Track exception
 * @param {Error} error - Error object
 * @param {Object} properties - Additional properties
 */
function trackException(error, properties = {}) {
  if (!client) return;

  client.trackException({
    exception: error,
    properties: {
      timestamp: new Date().toISOString(),
      ...properties,
    },
  });
}

/**
 * Flush all pending telemetry
 * Call before process exit
 */
function flush() {
  if (!client) return Promise.resolve();

  return new Promise(resolve => {
    client.flush({
      callback: () => {
        console.log('📊 Application Insights telemetry flushed');
        resolve();
      },
    });
  });
}

module.exports = {
  initializeAppInsights,
  getClient,
  trackEvent,
  trackOpenAICall,
  trackAIChatRequest,
  trackAIChatError,
  trackSubmissionSubmitted,
  trackAssignmentGeneration,
  trackMetric,
  trackException,
  flush,
};
