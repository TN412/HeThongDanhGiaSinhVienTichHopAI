require('dotenv').config();

// Initialize Application Insights FIRST (before other imports)
const { initializeAppInsights } = require('./config/appInsights');
initializeAppInsights();

const express = require('express');
const cookieParser = require('cookie-parser');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { helmetConfig, generalLimiter } = require('./middleware/security');
const { requestTimingMiddleware } = require('./middleware/monitoring');

// Import routes
const indexRoutes = require('./routes/index');

// Initialize Express app
const app = express();

// Trust proxy (important for production behind reverse proxy)
app.set('trust proxy', 1);

// Security: Helmet for HTTP headers
app.use(helmetConfig);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for JWT refresh tokens
app.use(cookieParser());

// CORS middleware (must be before routes)
app.use(corsMiddleware);

// Request timing middleware (Application Insights)
// Track response time for all routes
app.use(requestTimingMiddleware);

// Rate limiting (general API limiter)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', generalLimiter);
}

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`, {
      query: req.query,
      body: Object.keys(req.body).length > 0 ? '(has body)' : '(empty)',
    });
    next();
  });
}

// API Routes
app.use('/api', indexRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Integrated Student Assessment System API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: 'GET /api/health',
      // More routes will be added here
    },
  });
});

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

module.exports = app;
