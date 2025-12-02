/**
 * Global error handler middleware
 * Catches all errors and returns consistent JSON response
 * Hides stack traces in production for security
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details (với stack trace nếu có)
  if (isProduction) {
    // Production: Log minimal info
    console.error('🔥 Error:', {
      message: err.message,
      statusCode: err.status || err.statusCode || 500,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      userId: req.user?.id || 'anonymous',
    });
    // TODO: Send to Azure Application Insights
    // appInsights.trackException({ exception: err });
  } else {
    // Development: Log full details
    console.error('🔥 Error occurred:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        details: errors,
        status: 400,
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        message: `Duplicate value for field: ${field}`,
        status: 409,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        status: 401,
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        status: 401,
      },
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        status: 400,
      },
    });
  }

  // CORS error
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      error: {
        message: isProduction ? 'Access denied' : 'CORS policy violation',
        status: 403,
      },
    });
  }

  // Rate limit error (từ express-rate-limit)
  if (err.status === 429 || err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        status: 429,
        retryAfter: err.retryAfter || 60,
      },
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Ẩn thông tin nhạy cảm trong production
  const errorResponse = {
    success: false,
    error: {
      message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
      status: statusCode,
    },
  };

  // Chỉ include stack trace trong development
  if (!isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || undefined;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
