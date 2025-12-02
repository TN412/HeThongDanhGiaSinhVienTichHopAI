const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { authLimiter } = require('../middleware/security');

// =============================================
// STUDENT ROUTES
// =============================================

/**
 * @route   POST /api/student/register
 * @desc    Register a new student account
 * @access  Public
 */
router.post('/student/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, studentId, department } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name, email, and password are required',
          status: 400,
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters',
          status: 400,
        },
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email already registered',
          status: 400,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    // Create new student user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: 'student',
      studentId: studentId?.trim(),
      department: department?.trim(),
      isActive: true,
    });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = auth.signTokens(newUser);

    // Set refresh token as httpOnly cookie
    auth.setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentId: newUser.studentId,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error('Student registration error:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: messages.join(', '),
          status: 400,
        },
      });
    }

    // Handle duplicate key error (email unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email already registered',
          status: 400,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed. Please try again.',
        status: 500,
      },
    });
  }
});

/**
 * @route   POST /api/student/login
 * @desc    Login student account
 * @access  Public
 */
router.post('/student/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          status: 400,
        },
      });
    }

    // Find user by email (include passwordHash for comparison)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    // Check if user is a student
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Use instructor login endpoint.',
          status: 403,
        },
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is deactivated. Please contact administrator.',
          status: 403,
        },
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = auth.signTokens(user);

    // Set refresh token as httpOnly cookie
    auth.setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed. Please try again.',
        status: 500,
      },
    });
  }
});

/**
 * @route   GET /api/student/profile
 * @desc    Get student profile
 * @access  Private (student only)
 */
router.get('/student/profile', auth.student, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          status: 404,
        },
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve profile',
        status: 500,
      },
    });
  }
});

// =============================================
// INSTRUCTOR ROUTES
// =============================================

/**
 * @route   POST /api/instructor/register
 * @desc    Register a new instructor account
 * @access  Public
 */
router.post('/instructor/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name, email, and password are required',
          status: 400,
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters',
          status: 400,
        },
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email already registered',
          status: 400,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    // Create new instructor user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: 'instructor',
      department: department?.trim(),
      isActive: true,
    });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = auth.signTokens(newUser);

    // Set refresh token as httpOnly cookie
    auth.setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Instructor account created successfully',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error('Instructor registration error:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: messages.join(', '),
          status: 400,
        },
      });
    }

    // Handle duplicate key error (email unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email already registered',
          status: 400,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed. Please try again.',
        status: 500,
      },
    });
  }
});

/**
 * @route   POST /api/instructor/login
 * @desc    Login instructor account
 * @access  Public
 */
router.post('/instructor/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          status: 400,
        },
      });
    }

    // Find user by email (include passwordHash for comparison)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    // Check if user is an instructor
    if (user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Use student login endpoint.',
          status: 403,
        },
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is deactivated. Please contact administrator.',
          status: 403,
        },
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = auth.signTokens(user);

    // Set refresh token as httpOnly cookie
    auth.setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Instructor login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed. Please try again.',
        status: 500,
      },
    });
  }
});

/**
 * @route   GET /api/instructor/dashboard
 * @desc    Get instructor dashboard data (mock)
 * @access  Private (instructor only)
 */
router.get('/instructor/dashboard', auth.instructor, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          status: 404,
        },
      });
    }

    // Mock dashboard data
    const dashboardData = {
      instructor: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
      },
      stats: {
        totalAssignments: 0,
        totalSubmissions: 0,
        pendingGrading: 0,
        avgAISkillScore: 0,
      },
      recentActivity: [],
      message: 'Dashboard data will be populated from actual assignments and submissions',
    };

    res.json({
      success: true,
      dashboard: dashboardData,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve dashboard data',
        status: 500,
      },
    });
  }
});

// =============================================
// COMMON AUTH ROUTES
// =============================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info from token
 * @access  Private (any authenticated user)
 */
router.get('/me', auth.authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
    message: 'User authenticated successfully',
  });
});

/**
 * @route   GET /api/auth/student-only
 * @desc    Test route - only students can access
 * @access  Private (student only)
 */
router.get('/student-only', auth.student, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome, student!',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/**
 * @route   GET /api/auth/instructor-only
 * @desc    Test route - only instructors can access
 * @access  Private (instructor only)
 */
router.get('/instructor-only', auth.instructor, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome, instructor!',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/**
 * @route   POST /api/auth/test-login
 * @desc    Test endpoint to generate token (for testing only)
 * @access  Public
 */
router.post('/test-login', (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Email and role are required',
        status: 400,
      },
    });
  }

  if (!['student', 'instructor'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Role must be either "student" or "instructor"',
        status: 400,
      },
    });
  }

  // Generate test user
  const testUser = {
    id: `test-${Date.now()}`,
    email,
    role,
  };

  // Sign tokens
  const { accessToken, refreshToken } = auth.signTokens(testUser);

  // Set refresh token as httpOnly cookie
  auth.setRefreshTokenCookie(res, refreshToken);

  res.json({
    success: true,
    message: 'Test login successful',
    accessToken,
    user: testUser,
    note: 'This is a test endpoint. In production, use proper login with password verification.',
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token from cookie
 * @access  Public (requires valid refresh token in cookie)
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token not found',
          status: 401,
        },
      });
    }

    // Verify refresh token
    const decoded = auth.verifyRefreshToken(refreshToken);

    // Fetch user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      // Clear invalid refresh token
      auth.clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          status: 401,
        },
      });
    }

    if (!user.isActive) {
      // Clear refresh token for deactivated account
      auth.clearRefreshTokenCookie(res);
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          status: 403,
        },
      });
    }

    // Generate new access token
    const { accessToken } = auth.signTokens(user);

    res.json({
      success: true,
      accessToken,
      message: 'Access token refreshed successfully',
    });
  } catch (error) {
    // Clear invalid refresh token
    auth.clearRefreshTokenCookie(res);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token expired. Please login again.',
          status: 401,
          code: 'REFRESH_TOKEN_EXPIRED',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid refresh token',
        status: 401,
      },
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user by clearing refresh token cookie
 * @access  Public
 */
router.post('/logout', (req, res) => {
  auth.clearRefreshTokenCookie(res);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
