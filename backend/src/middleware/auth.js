const jwt = require('jsonwebtoken');

/**
 * Verify JWT access token from Authorization header
 * Attaches user object to req.user
 */
const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided. Authorization header required.',
          status: 401,
        },
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          status: 401,
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          status: 401,
          code: 'TOKEN_EXPIRED',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          status: 401,
          code: 'INVALID_TOKEN',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        status: 401,
      },
    });
  }
};

/**
 * Guard: Only allow authenticated users (any role)
 */
const authenticate = verifyToken;

/**
 * Guard: Only allow students
 */
const student = [
  verifyToken,
  (req, res, next) => {
    console.log('🔍 [Auth] Student guard check:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      requiredRole: 'student',
      match: req.user?.role === 'student',
    });

    if (req.user.role !== 'student') {
      console.error('❌ [Auth] Student role mismatch:', {
        expected: 'student',
        actual: req.user.role,
      });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Student role required.',
          status: 403,
          required: 'student',
          current: req.user.role,
        },
      });
    }

    next();
  },
];

/**
 * Guard: Only allow instructors
 */
const instructor = [
  verifyToken,
  (req, res, next) => {
    console.log('🔍 [Auth] Instructor guard check:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      requiredRole: 'instructor',
      match: req.user?.role === 'instructor',
    });

    if (req.user.role !== 'instructor') {
      console.error('❌ [Auth] Instructor role mismatch:', {
        expected: 'instructor',
        actual: req.user.role,
      });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Instructor role required.',
          status: 403,
          required: 'instructor',
          current: req.user.role,
        },
      });
    }

    next();
  },
];

/**
 * Sign JWT tokens for user
 * @param {Object} user - User object with id, email, role
 * @returns {Object} { accessToken, refreshToken }
 */
const signTokens = user => {
  const payload = {
    id: user.id || user._id,
    email: user.email,
    role: user.role,
  };

  // Sign access token (short-lived)
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });

  // Sign refresh token (long-lived)
  const refreshToken = jwt.sign({ id: payload.id, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = token => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Set refresh token as httpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - Refresh token
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/api/auth/refresh', // Only sent to refresh endpoint
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
};

/**
 * Clear refresh token cookie
 * @param {Object} res - Express response object
 */
const clearRefreshTokenCookie = res => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
};

module.exports = {
  authenticate,
  student,
  instructor,
  signTokens,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
