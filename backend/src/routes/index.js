const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import route modules
const authRoutes = require('./auth');
const assignmentRoutes = require('./assignment');
const submissionRoutes = require('./submission');
const aiRoutes = require('./ai');
const aiAssessmentRoutes = require('./ai_assessment');
const analyticsRoutes = require('./analytics');
const logsRoutes = require('./logs');
const healthRoutes = require('./health');

/**
 * @route   GET /api/me
 * @desc    Get current user info from token (convenience endpoint)
 * @access  Private
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

// Mount health routes FIRST (no rate limiting for health checks)
router.use('/health', healthRoutes);

// Mount auth routes
// Note: authLimiter is applied in auth.js for login/register only, not refresh
router.use('/auth', authRoutes);

// Mount assignment routes
router.use('/assignment', assignmentRoutes);

// Mount submission routes
router.use('/submission', submissionRoutes);

// Mount AI routes
router.use('/ai', aiRoutes);

// Mount AI assessment routes (comprehensive AI usage analysis)
router.use('/ai-assessment', aiAssessmentRoutes);

// Mount logs routes (for prompt labeling and ML training data export)
router.use('/logs', logsRoutes);

// Mount analytics routes
router.use('/analytics', analyticsRoutes);

module.exports = router;
