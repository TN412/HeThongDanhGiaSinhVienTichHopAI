/**
 * AI Assessment Routes
 * Provides comprehensive AI usage assessment endpoints for instructor analytics
 *
 * Endpoints:
 * - GET /api/ai-assessment/submission/:id - Generate full 8-part assessment report
 * - GET /api/ai-assessment/submission/:id/summary - Quick metrics overview
 * - GET /api/ai-assessment/submission/:id/timeline - Timeline data with anomalies
 * - GET /api/ai-assessment/submission/:id/prompts/top - Best and worst prompts
 * - GET /api/ai-assessment/submission/:id/wisdom - WISDOM framework scores
 * - GET /api/ai-assessment/submission/:id/dependency - Dependency analysis
 */

const express = require('express');
const router = express.Router();
const AI_Log = require('../models/AI_Log');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { generateComprehensiveAssessment } = require('../utils/ai_advanced_assessment');
const auth = require('../middleware/auth');

/**
 * GET /api/ai-assessment/submission/:id
 * Generate comprehensive 8-part assessment report
 *
 * Response structure:
 * {
 *   summary: { totalPrompts, dependencyScore, riskLevel, overallQuality },
 *   dependencyAnalysis: { score, level, patterns },
 *   rubricScores: { promptEngineering, independence, creativity },
 *   wisdomScore: { inquiry, disruptiveThinking, mindfulness, overall, details, interpretation },
 *   timeline: { segments, anomalies, avgPromptsPerSegment },
 *   topPrompts: { best[5], worst[5] },
 *   warningsAndRecommendations: { warnings[], recommendations[], thinkingErrors[] },
 *   classifiedLogs: [...],
 *   basicStats: {...}
 * }
 */
router.get('/submission/:id', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;
    console.log(`📊 [AI Assessment] Request for submission: ${submissionId}`);

    // Verify submission exists
    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title');

    if (!submission) {
      console.log(`❌ [AI Assessment] Submission not found: ${submissionId}`);
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    console.log(`✅ [AI Assessment] Submission found: ${submission._id}`);

    // Get all logs for this submission
    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();
    console.log(`📝 [AI Assessment] Found ${logs.length} AI logs for submission ${submissionId}`);

    if (!logs || logs.length === 0) {
      console.log(`⚠️ [AI Assessment] No AI data for submission ${submissionId}`);
      return res.json({
        success: true,
        hasData: false,
        message: 'No AI interactions found for this submission',
        submission: {
          id: submission._id,
          studentName: submission.studentId?.name,
          assignmentTitle: submission.assignmentId?.title,
        },
      });
    }

    // Generate comprehensive assessment
    const assessment = await generateComprehensiveAssessment(logs);

    // Add submission metadata
    assessment.submissionInfo = {
      id: submission._id,
      studentId: submission.studentId?._id,
      studentName: submission.studentId?.name,
      studentEmail: submission.studentId?.email,
      assignmentId: submission.assignmentId?._id,
      assignmentTitle: submission.assignmentId?.title,
      submittedAt: submission.submittedAt,
      totalScore: submission.totalScore,
      aiSkillScore: submission.aiSkillScore,
    };

    res.json({
      success: true,
      hasData: true,
      assessment,
    });
  } catch (error) {
    console.error('Error generating assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate assessment report',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/summary
 * Quick metrics overview - lightweight endpoint for dashboards
 */
router.get('/submission/:id/summary', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const assessmentData = await AI_Log.getAssessmentData(submissionId);

    if (!assessmentData) {
      return res.json({
        success: true,
        hasData: false,
        summary: {
          totalPrompts: 0,
          dependencyScore: 100, // No AI usage = fully independent
          riskLevel: 'Low',
          avgQuality: 0,
        },
      });
    }

    // Generate full assessment to get dependency score and risk level
    const assessment = await generateComprehensiveAssessment(assessmentData.logs);

    res.json({
      success: true,
      hasData: true,
      summary: {
        totalPrompts: assessmentData.totalCount,
        dependencyScore: assessment.dependencyAnalysis.score,
        riskLevel: assessment.dependencyAnalysis.level,
        avgQuality:
          assessmentData.qualityScores.reduce((a, b) => a + b, 0) /
          assessmentData.qualityScores.length,
        refinements: assessmentData.refinements,
        duplicates: assessmentData.duplicates,
        avgTokens: Math.round(assessmentData.avgTokens),
        avgResponseTime: Math.round(assessmentData.avgResponseTime),
        timeRange: assessmentData.timeRange,
      },
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/timeline
 * Timeline data with anomaly detection
 */
router.get('/submission/:id/timeline', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        timeline: { segments: [], anomalies: [] },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      timeline: assessment.timeline,
    });
  } catch (error) {
    console.error('Error generating timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate timeline',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/prompts/top
 * Best and worst prompts with detailed analysis
 */
router.get('/submission/:id/prompts/top', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        topPrompts: { best: [], worst: [] },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      topPrompts: assessment.topPrompts,
    });
  } catch (error) {
    console.error('Error getting top prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top prompts',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/wisdom
 * WISDOM framework scores (Inquiry, Disruptive Thinking, Mindfulness)
 */
router.get('/submission/:id/wisdom', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        wisdomScore: {
          inquiry: 0,
          disruptiveThinking: 0,
          mindfulness: 0,
          overall: 0,
        },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      wisdomScore: assessment.wisdomScore,
    });
  } catch (error) {
    console.error('Error calculating WISDOM scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate WISDOM scores',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/dependency
 * Dependency analysis with risk level and patterns
 */
router.get('/submission/:id/dependency', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        dependencyAnalysis: {
          score: 100,
          level: 'Low',
          description: 'No AI usage detected - fully independent work',
          patterns: {},
        },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      dependencyAnalysis: assessment.dependencyAnalysis,
    });
  } catch (error) {
    console.error('Error analyzing dependency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze dependency',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/rubric
 * Rubric scores (Prompt Engineering, Independence, Creativity)
 */
router.get('/submission/:id/rubric', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        rubricScores: {
          promptEngineering: { level: 0, description: 'No prompts' },
          independence: { level: 5, description: 'Fully independent (no AI used)' },
          creativity: { level: 0, description: 'No prompts' },
        },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      rubricScores: assessment.rubricScores,
    });
  } catch (error) {
    console.error('Error calculating rubric scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate rubric scores',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/submission/:id/warnings
 * Warnings and recommendations
 */
router.get('/submission/:id/warnings', auth.authenticate, auth.instructor, async (req, res) => {
  try {
    const { id: submissionId } = req.params;

    const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        warningsAndRecommendations: {
          warnings: [],
          recommendations: [
            'Sinh viên không sử dụng AI - khuyến khích thử nghiệm AI như một công cụ học tập',
          ],
          thinkingErrors: [],
        },
      });
    }

    const assessment = await generateComprehensiveAssessment(logs);

    res.json({
      success: true,
      hasData: true,
      warningsAndRecommendations: assessment.warningsAndRecommendations,
    });
  } catch (error) {
    console.error('Error generating warnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate warnings',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-assessment/assignment/:assignmentId/overview
 * Overview of AI usage across all submissions for an assignment
 */
router.get(
  '/assignment/:assignmentId/overview',
  auth.authenticate,
  auth.instructor,
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

      // Get all submissions for this assignment
      const submissions = await AssignmentSubmission.find({ assignmentId, status: 'submitted' })
        .select('_id studentId')
        .lean();

      if (!submissions || submissions.length === 0) {
        return res.json({
          success: true,
          hasData: false,
          overview: {
            totalSubmissions: 0,
            avgDependencyScore: 0,
            riskDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 },
          },
        });
      }

      // Get summary for each submission
      const summaries = [];
      for (const submission of submissions) {
        const assessmentData = await AI_Log.getAssessmentData(submission._id);
        if (assessmentData && assessmentData.totalCount > 0) {
          const assessment = await generateComprehensiveAssessment(assessmentData.logs);
          summaries.push({
            submissionId: submission._id,
            studentId: submission.studentId,
            dependencyScore: assessment.dependencyAnalysis.score,
            riskLevel: assessment.dependencyAnalysis.level,
            totalPrompts: assessmentData.totalCount,
            avgQuality:
              assessmentData.qualityScores.reduce((a, b) => a + b, 0) /
              assessmentData.qualityScores.length,
          });
        } else {
          // No AI usage
          summaries.push({
            submissionId: submission._id,
            studentId: submission.studentId,
            dependencyScore: 100,
            riskLevel: 'Low',
            totalPrompts: 0,
            avgQuality: 0,
          });
        }
      }

      // Calculate overview statistics
      const avgDependencyScore =
        summaries.reduce((sum, s) => sum + s.dependencyScore, 0) / summaries.length;
      const riskDistribution = summaries.reduce(
        (dist, s) => {
          dist[s.riskLevel] = (dist[s.riskLevel] || 0) + 1;
          return dist;
        },
        { Low: 0, Medium: 0, High: 0, Critical: 0 }
      );

      res.json({
        success: true,
        hasData: true,
        overview: {
          totalSubmissions: submissions.length,
          avgDependencyScore: Math.round(avgDependencyScore),
          riskDistribution,
          summaries,
        },
      });
    } catch (error) {
      console.error('Error generating assignment overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate assignment overview',
        details: error.message,
      });
    }
  }
);

module.exports = router;
