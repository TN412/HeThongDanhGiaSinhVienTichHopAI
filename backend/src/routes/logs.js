const express = require('express');
const router = express.Router();
const AI_Log = require('../models/AI_Log');
const { AssignmentSubmission } = require('../models');
const auth = require('../middleware/auth');
const {
  analyzeBatchForTraining,
  generateTrainingCSV,
} = require('../services/promptScoringService');
const { calculateInteractionSummary } = require('../utils/grading');

/**
 * POST /api/logs/:logId/label
 * Instructor labels a prompt as 'good' or 'bad' for ML training
 *
 * Body: { quality: 'good' | 'bad', note?: string }
 * Auth: Instructor only
 */
router.post('/:logId/label', auth.instructor, async (req, res) => {
  try {
    const { logId } = req.params;
    const { quality, note } = req.body;

    // Validate input
    if (!quality || !['good', 'bad'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Quality must be either "good" or "bad"',
      });
    }

    // Find the log
    const log = await AI_Log.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'AI log not found',
      });
    }

    // Check if already labeled
    const previousLabel = log.instructorLabel?.quality;

    // Update label
    log.instructorLabel = {
      quality,
      labeledBy: req.user.id,
      labeledAt: new Date(),
      note: note || null,
    };

    await log.save();

    // Track the labeling event
    const { trackEvent } = require('../config/appInsights');
    trackEvent('prompt_labeled', {
      logId: log._id.toString(),
      quality,
      previousLabel: previousLabel || 'none',
      instructorId: req.user.id,
      assignmentId: log.assignmentId.toString(),
      hasNote: !!note,
    });

    res.json({
      success: true,
      message: 'Prompt labeled successfully',
      label: {
        quality,
        labeledBy: req.user.id,
        labeledAt: log.instructorLabel.labeledAt,
        previousLabel,
      },
    });
  } catch (error) {
    console.error('Error labeling prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to label prompt',
    });
  }
});

/**
 * GET /api/logs/submission/:submissionId
 * Get all AI logs for a specific submission (existing endpoint - for reference)
 * Auth: Instructor or student (own submission)
 */
router.get('/submission/:submissionId', auth.authenticate, async (req, res) => {
  try {
    const { submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).select('-__v');

    // If student, verify they own this submission
    if (req.user.role === 'student') {
      if (logs.length > 0 && logs[0].studentId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    // Calculate interaction summary
    const submission = await AssignmentSubmission.findById(submissionId);
    const aiInteractionSummary = submission ? calculateInteractionSummary(logs, submission) : null;

    res.json({
      success: true,
      count: logs.length,
      logs,
      aiInteractionSummary,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

/**
 * GET /api/logs/assignment/:assignmentId
 * Get all AI logs for an assignment (instructor only)
 * Query params: labeled=true|false (filter by label status)
 * Auth: Instructor only
 */
router.get('/assignment/:assignmentId', auth.instructor, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { labeled } = req.query;

    let query = { assignmentId };

    // Filter by label status if specified
    if (labeled === 'true') {
      query['instructorLabel.quality'] = { $ne: null };
    } else if (labeled === 'false') {
      query['instructorLabel.quality'] = null;
    }

    const logs = await AI_Log.find(query)
      .sort({ timestamp: -1 })
      .populate('studentId', 'name email')
      .select('-__v');

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching assignment logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment logs',
    });
  }
});

/**
 * GET /api/logs/export-training-data
 * Export labeled prompts as CSV for ML training
 * Query params:
 *   - assignmentId (optional): Filter by assignment
 *   - labeled=true: Only export labeled data
 *   - format=csv|json (default: csv)
 * Auth: Instructor only
 */
router.get('/export-training-data', auth.instructor, async (req, res) => {
  try {
    const { assignmentId, labeled, format = 'csv' } = req.query;

    // Build query
    let query = {};
    if (assignmentId) {
      query.assignmentId = assignmentId;
    }
    if (labeled === 'true') {
      query['instructorLabel.quality'] = { $ne: null };
    }

    // Fetch logs
    const logs = await AI_Log.find(query).sort({ timestamp: -1 }).select('-__v');

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No logs found matching criteria',
      });
    }

    // Analyze logs with heuristic scoring + extract features
    const analyzedLogs = analyzeBatchForTraining(logs);

    if (format === 'json') {
      // JSON format
      res.json({
        success: true,
        count: analyzedLogs.length,
        labeledCount: analyzedLogs.filter(l => l.instructorLabel).length,
        exportedAt: new Date().toISOString(),
        data: analyzedLogs,
      });
    } else {
      // CSV format (default)
      const csv = generateTrainingCSV(analyzedLogs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="prompt_training_data_${Date.now()}.csv"`
      );
      res.send(csv);
    }

    // Track export event
    const { trackEvent } = require('../config/appInsights');
    trackEvent('training_data_exported', {
      instructorId: req.user.id,
      format,
      totalLogs: logs.length,
      labeledLogs: analyzedLogs.filter(l => l.instructorLabel).length,
      assignmentId: assignmentId || 'all',
    });
  } catch (error) {
    console.error('Error exporting training data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export training data',
    });
  }
});

/**
 * GET /api/logs/label-stats
 * Get statistics about labeled prompts
 * Auth: Instructor only
 */
router.get('/label-stats', auth.instructor, async (req, res) => {
  try {
    const { assignmentId } = req.query;

    let matchQuery = {};
    if (assignmentId) {
      matchQuery.assignmentId = require('mongoose').Types.ObjectId(assignmentId);
    }

    const stats = await AI_Log.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          labeledLogs: {
            $sum: {
              $cond: [{ $ne: ['$instructorLabel.quality', null] }, 1, 0],
            },
          },
          goodLabels: {
            $sum: {
              $cond: [{ $eq: ['$instructorLabel.quality', 'good'] }, 1, 0],
            },
          },
          badLabels: {
            $sum: {
              $cond: [{ $eq: ['$instructorLabel.quality', 'bad'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const result =
      stats.length > 0
        ? stats[0]
        : {
            totalLogs: 0,
            labeledLogs: 0,
            goodLabels: 0,
            badLabels: 0,
          };

    result.unlabeledLogs = result.totalLogs - result.labeledLogs;
    result.labeledPercentage =
      result.totalLogs > 0 ? Math.round((result.labeledLogs / result.totalLogs) * 100) : 0;

    res.json({
      success: true,
      stats: result,
      readyForTraining: result.labeledLogs >= 100, // Need at least 100 labeled samples
      recommendation:
        result.labeledLogs < 100
          ? `Label ${100 - result.labeledLogs} more prompts to start ML training`
          : 'Dataset ready for ML training! Export and train your model.',
    });
  } catch (error) {
    console.error('Error fetching label stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch label statistics',
    });
  }
});

/**
 * PUT /api/logs/:logId/label
 * Update an existing label (in case instructor changes mind)
 * Auth: Instructor only
 */
router.put('/:logId/label', auth.instructor, async (req, res) => {
  try {
    const { logId } = req.params;
    const { quality, note } = req.body;

    if (!quality || !['good', 'bad'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Quality must be either "good" or "bad"',
      });
    }

    const log = await AI_Log.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'AI log not found',
      });
    }

    const previousLabel = log.instructorLabel?.quality;

    log.instructorLabel = {
      quality,
      labeledBy: req.user.id,
      labeledAt: new Date(),
      note: note || log.instructorLabel?.note || null,
    };

    await log.save();

    res.json({
      success: true,
      message: 'Label updated successfully',
      previousLabel,
      newLabel: quality,
    });
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update label',
    });
  }
});

/**
 * DELETE /api/logs/:logId/label
 * Remove label from a prompt
 * Auth: Instructor only
 */
router.delete('/:logId/label', auth.instructor, async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await AI_Log.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'AI log not found',
      });
    }

    const previousLabel = log.instructorLabel?.quality;

    log.instructorLabel = {
      quality: null,
      labeledBy: null,
      labeledAt: null,
      note: null,
    };

    await log.save();

    res.json({
      success: true,
      message: 'Label removed successfully',
      previousLabel,
    });
  } catch (error) {
    console.error('Error removing label:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove label',
    });
  }
});

module.exports = router;
