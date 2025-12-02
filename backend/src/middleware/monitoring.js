/**
 * Monitoring Middleware
 *
 * Tracks:
 * - Request/Response timing for all routes
 * - HTTP status codes
 * - Request size
 * - User authentication status
 * - Route performance metrics
 *
 * Integrates with Application Insights for centralized monitoring
 */

const { getClient, trackMetric, trackEvent } = require('../config/appInsights');

/**
 * Request timing middleware
 * Logs response time for all routes and sends to Application Insights
 */
function requestTimingMiddleware(req, res, next) {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Track response
  const trackResponse = () => {
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

    // Route info
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const routeKey = `${method} ${route}`;

    // User info
    const userId = req.user?.id || 'anonymous';
    const userRole = req.user?.role || 'guest';

    // Request size
    const requestSize = req.headers['content-length'] || 0;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌';
      console.log(
        `${emoji} ${method} ${route} - ${statusCode} - ${durationMs.toFixed(2)}ms - ${userId}`
      );
    }

    // Track in Application Insights
    const client = getClient();
    if (client) {
      // Track as custom metric for aggregation
      trackMetric('http_response_time', durationMs, {
        route: routeKey,
        method,
        statusCode: statusCode.toString(),
        userRole,
      });

      // Track request event
      trackEvent(
        'http_request',
        {
          route: routeKey,
          method,
          statusCode: statusCode.toString(),
          userId,
          userRole,
          path: req.path,
          query: JSON.stringify(req.query),
        },
        {
          duration: durationMs,
          requestSize: parseInt(requestSize),
        }
      );

      // Track slow requests (> 5 seconds)
      if (durationMs > 5000) {
        trackEvent(
          'slow_request',
          {
            route: routeKey,
            method,
            statusCode: statusCode.toString(),
            userId,
            path: req.path,
          },
          {
            duration: durationMs,
          }
        );
      }

      // Track errors
      if (statusCode >= 400) {
        trackEvent(
          'http_error',
          {
            route: routeKey,
            method,
            statusCode: statusCode.toString(),
            userId,
            errorType: statusCode >= 500 ? 'server_error' : 'client_error',
          },
          {
            duration: durationMs,
          }
        );
      }
    }
  };

  // Override res.json
  res.json = function (data) {
    trackResponse();
    return originalJson(data);
  };

  // Override res.send
  res.send = function (data) {
    trackResponse();
    return originalSend(data);
  };

  // Handle response finish (for cases where json/send not called)
  res.on('finish', () => {
    // Only track if not already tracked by json/send
    if (!res.headersSent) {
      trackResponse();
    }
  });

  next();
}

/**
 * Health check route timing (lighter version)
 * Skips detailed logging for health checks to reduce noise
 */
function healthCheckTimingMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Only log if slow or error
    if (duration > 1000 || res.statusCode >= 400) {
      console.log(`⚕️  Health check - ${res.statusCode} - ${duration}ms`);

      const client = getClient();
      if (client) {
        trackMetric('health_check_response_time', duration, {
          statusCode: res.statusCode.toString(),
        });
      }
    }
  });

  next();
}

/**
 * Route-specific performance tracking
 * Use for critical routes that need detailed monitoring
 *
 * @param {string} operationName - Name of the operation (e.g., 'generate_assignment')
 * @returns {Function} Express middleware
 */
function trackOperationTiming(operationName) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Store in request for access in route handler
    req.operationStartTime = startTime;
    req.operationName = operationName;

    // Track when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      const client = getClient();
      if (client) {
        trackEvent(
          `operation_${operationName}`,
          {
            success: (statusCode < 400).toString(),
            statusCode: statusCode.toString(),
            userId: req.user?.id || 'anonymous',
          },
          {
            duration,
          }
        );

        // Track as metric for aggregation
        trackMetric(`operation_duration_${operationName}`, duration, {
          success: (statusCode < 400).toString(),
        });
      }

      // Log slow operations
      if (duration > 3000) {
        console.warn(`⏱️  Slow operation: ${operationName} took ${duration}ms`);
      }
    });

    next();
  };
}

/**
 * Database query timing helper
 * Use in routes to track MongoDB query performance
 *
 * @param {string} queryName - Name of the query
 * @param {Function} queryFn - Async function that executes the query
 * @returns {Promise} Query result
 */
async function trackDatabaseQuery(queryName, queryFn) {
  const startTime = Date.now();
  let success = true;
  let error = null;

  try {
    const result = await queryFn();
    return result;
  } catch (err) {
    success = false;
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - startTime;

    const client = getClient();
    if (client) {
      client.trackDependency({
        dependencyTypeName: 'MongoDB',
        name: queryName,
        data: queryName,
        duration,
        success,
        resultCode: success ? 200 : 500,
      });

      // Track as metric
      trackMetric('database_query_duration', duration, {
        query: queryName,
        success: success.toString(),
      });

      // Warn on slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow database query: ${queryName} took ${duration}ms`);
        trackEvent(
          'slow_database_query',
          {
            query: queryName,
          },
          {
            duration,
          }
        );
      }
    }
  }
}

/**
 * Memory usage tracking
 * Call periodically to track memory consumption
 */
function trackMemoryUsage() {
  const usage = process.memoryUsage();
  const client = getClient();

  if (client) {
    trackMetric('memory_heap_used_mb', usage.heapUsed / 1024 / 1024);
    trackMetric('memory_heap_total_mb', usage.heapTotal / 1024 / 1024);
    trackMetric('memory_rss_mb', usage.rss / 1024 / 1024);
    trackMetric('memory_external_mb', usage.external / 1024 / 1024);
  }
}

/**
 * Start periodic memory tracking
 * Tracks memory usage every 5 minutes
 */
function startMemoryTracking() {
  // Track immediately
  trackMemoryUsage();

  // Track every 5 minutes
  setInterval(
    () => {
      trackMemoryUsage();
    },
    5 * 60 * 1000
  );

  console.log('📊 Memory tracking started (every 5 minutes)');
}

module.exports = {
  requestTimingMiddleware,
  healthCheckTimingMiddleware,
  trackOperationTiming,
  trackDatabaseQuery,
  trackMemoryUsage,
  startMemoryTracking,
};
