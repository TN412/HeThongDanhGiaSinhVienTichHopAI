const cors = require('cors');

/**
 * CORS Configuration
 * Chỉ cho phép requests từ FRONTEND_URL đã configured
 * Hỗ trợ credentials (cookies) cho JWT refresh tokens
 */

// Lấy FRONTEND_URL từ environment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Allowed origins
const allowedOrigins = [FRONTEND_URL];

// Trong development, cho phép thêm localhost ports
if (NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000'
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    // ONLY in development mode
    if (!origin && NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from: ${origin || 'NO ORIGIN'}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin || 'undefined'}`));
    }
  },
  credentials: true, // Allow cookies to be sent (for JWT refresh tokens)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 600, // Cache preflight request for 10 minutes
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

module.exports = cors(corsOptions);
