const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security Middleware Collection
 * Configures Helmet, Rate Limiting, and other security measures
 */

/**
 * Helmet configuration for HTTP security headers
 * https://helmetjs.github.io/
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disable để tương thích với Azure Blob Storage
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Expect-CT header (deprecated nhưng vẫn hữu ích)
  expectCt: {
    maxAge: 86400,
    enforce: true,
  },
  // Frameguard (X-Frame-Options)
  frameguard: { action: 'deny' },
  // Hide Powered-By header
  hidePoweredBy: true,
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff (X-Content-Type-Options)
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  // Referrer Policy
  referrerPolicy: { policy: 'no-referrer' },
  // XSS Filter (legacy)
  xssFilter: true,
});

/**
 * General API rate limiter
 * Giới hạn 100 requests mỗi 15 phút cho mỗi IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for successful requests in development
  skip: (req, res) => process.env.NODE_ENV === 'development' && res.statusCode < 400,
});

/**
 * Authentication rate limiter (stricter)
 * Giới hạn 5 login attempts mỗi 15 phút
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * AI Chat rate limiter per submission
 * Giới hạn 20 requests mỗi 30 phút per submissionId
 *
 * Sử dụng composite key: submissionId only (không dùng IP để tránh IPv6 issues)
 */
const aiChatLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 20, // 20 AI chat requests per submission per 30 minutes
  message: {
    success: false,
    error:
      'Too many AI chat requests for this submission. Please wait 30 minutes before continuing.',
    hint: 'Try to ask more comprehensive questions to reduce the number of interactions.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator: submissionId only (duy nhất theo submission)
  keyGenerator: req => {
    // Sử dụng submissionId làm key chính (mỗi submission có limit riêng)
    const submissionId = req.body.submissionId || req.params.submissionId || 'unknown';
    return `ai-chat-${submissionId}`;
  },
  // Skip counting for development
  skip: req => process.env.NODE_ENV === 'development',
  // Handler khi vượt limit
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      error: options.message.error,
      hint: options.message.hint,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60), // minutes
    });
  },
});

/**
 * File upload rate limiter
 * Giới hạn 10 uploads mỗi giờ
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Assignment generation rate limiter (AI-powered)
 * Giới hạn 5 generations mỗi giờ (vì tốn cost)
 */
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 AI generations per hour
  message: {
    success: false,
    error: 'Too many AI generation requests. Please try again after 1 hour.',
    note: 'AI generation is resource-intensive. Please use it wisely.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sanitize filename để tránh path traversal và injection
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  // Remove path separators (nhưng GIỮ dấu chấm cho extension)
  let sanitized = filename.replace(/[\/\\]/g, '');

  // Loại bỏ path traversal patterns (..)
  sanitized = sanitized.replace(/\.\./g, '');

  // Chỉ giữ lại: chữ cái, số, dấu gạch ngang, underscore, dấu chấm, khoảng trắng
  // Thay thế ký tự đặc biệt bằng underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-\.\s]/g, '_');

  // Thay thế khoảng trắng bằng underscore
  sanitized = sanitized.replace(/\s+/g, '_');

  // Loại bỏ nhiều dấu chấm liên tiếp (chỉ giữ 1)
  sanitized = sanitized.replace(/\.{2,}/g, '.');

  // Không cho phép filename bắt đầu bằng dấu chấm (hidden file)
  sanitized = sanitized.replace(/^\.+/, '');

  // Giới hạn độ dài filename (max 255 chars)
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 240);
    sanitized = `${name}.${ext}`;
  }

  // Nếu filename rỗng sau khi sanitize, tạo default name
  if (!sanitized || sanitized.trim() === '') {
    sanitized = `file_${Date.now()}.bin`;
  }

  return sanitized;
}

/**
 * Middleware để sanitize filename trong req.file
 */
const sanitizeUploadedFile = (req, res, next) => {
  if (req.file && req.file.originalname) {
    req.file.originalname = sanitizeFilename(req.file.originalname);
    // Tạo safe filename cho storage
    req.file.safeName = `${Date.now()}_${req.file.originalname}`;
  }
  next();
};

/**
 * Log security events (có thể gửi đến monitoring service)
 */
const logSecurityEvent = (eventType, details, req) => {
  const logData = {
    timestamp: new Date().toISOString(),
    eventType,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous',
    details,
  };

  // Log to console (trong production, gửi đến monitoring service)
  console.warn('🔐 SECURITY EVENT:', JSON.stringify(logData, null, 2));

  // TODO: Send to Azure Application Insights hoặc monitoring service
  // if (process.env.NODE_ENV === 'production') {
  //   appInsights.trackEvent({ name: 'SecurityEvent', properties: logData });
  // }
};

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  aiChatLimiter,
  uploadLimiter,
  aiGenerationLimiter,
  sanitizeFilename,
  sanitizeUploadedFile,
  logSecurityEvent,
};
