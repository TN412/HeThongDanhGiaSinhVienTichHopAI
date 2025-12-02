/**
 * Health Check Routes
 * Simple endpoint to verify API is running
 * Used by CI/CD pipeline and monitoring tools
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * GET /api/health (base route)
 * Basic health check - returns 200 if server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with database connection status
 */
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      storage: 'unknown',
      ai: 'unknown',
    },
    version: {
      node: process.version,
      app: require('../../package.json').version,
    },
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      unit: 'MB',
    },
  };

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'connected';
      await mongoose.connection.db.admin().ping();
    } else {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }
  } catch (err) {
    health.services.database = 'error';
    health.status = 'degraded';
    console.error('Database health check failed:', err);
  }

  // Check Azure Storage (optional)
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    health.services.storage = 'configured';
  } else {
    health.services.storage = 'not-configured';
  }

  // Check OpenAI API (Azure or Standard)
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    health.services.ai = 'configured (Azure OpenAI)';
  } else if (process.env.OPENAI_API_KEY) {
    health.services.ai = 'configured (OpenAI)';
  } else {
    health.services.ai = 'not-configured';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/health/ready
 * Readiness probe - checks if app is ready to serve traffic
 * Returns 200 only if all critical services are available
 */
router.get('/ready', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not-ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString(),
      });
    }

    // Ping database
    await mongoose.connection.db.admin().ping();

    // Check required environment variables
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

    // OpenAI is optional but at least one should be configured
    const hasAI = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!hasAI) {
      console.warn('⚠️ No OpenAI configuration found (AI features will be disabled)');
    }

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return res.status(503).json({
        status: 'not-ready',
        reason: 'Missing required environment variables',
        missing: missingVars,
        timestamp: new Date().toISOString(),
      });
    }

    // All checks passed
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Readiness check failed:', err);
    res.status(503).json({
      status: 'not-ready',
      reason: 'Health check failed',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe - checks if app is alive (but not necessarily ready)
 * Returns 200 if process is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

module.exports = router;
