const express = require('express');
const router = express.Router();
const AI_Log = require('../models/AI_Log');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/logs/submission/{submissionId}:
 *   get:
 *     summary: Get all AI interaction logs for a submission
 *     description: Retrieve all AI_Log entries for a specific submission, sorted by timestamp. Instructor only.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: List of AI logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       submissionId:
 *                         type: string
 *                       assignmentId:
 *                         type: string
 *                       studentId:
 *                         type: string
 *                       questionId:
 *                         type: string
 *                       prompt:
 *                         type: string
 *                       response:
 *                         type: string
 *                       promptType:
 *                         type: string
 *                       contextProvided:
 *                         type: boolean
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       promptTokens:
 *                         type: number
 *                       completionTokens:
 *                         type: number
 *                       responseTime:
 *                         type: number
 *                 totalLogs:
 *                   type: number
 *       403:
 *         description: Not authorized (instructor only)
 *       404:
 *         description: Submission not found
 */
router.get('/logs/submission/:submissionId', auth.instructor, async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Validate submission exists
    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Fetch all logs for this submission, sorted by timestamp
    const logs = await AI_Log.find({ submissionId })
      .sort({ timestamp: 1 }) // Ascending order (oldest first)
      .lean();

    res.json({
      success: true,
      logs,
      totalLogs: logs.length,
      submission: {
        id: submission._id,
        studentId: submission.studentId,
        assignmentId: submission.assignmentId,
        status: submission.status,
      },
    });
  } catch (error) {
    console.error('Error fetching submission logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

/**
 * @swagger
 * /api/logs/student/{studentId}:
 *   get:
 *     summary: Get all AI interaction logs for a student
 *     description: Retrieve all AI_Log entries for a student across all assignments. Instructor only.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *       - in: query
 *         name: assignmentId
 *         schema:
 *           type: string
 *         description: Filter by specific assignment (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: List of AI logs for student
 *       403:
 *         description: Not authorized (instructor only)
 *       404:
 *         description: Student not found
 */
router.get('/logs/student/:studentId', auth.instructor, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { assignmentId, limit = 100 } = req.query;

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Build query filter
    const filter = { studentId };
    if (assignmentId) {
      filter.assignmentId = assignmentId;
    }

    // Fetch logs with optional limit
    const logs = await AI_Log.find(filter)
      .sort({ timestamp: -1 }) // Descending order (newest first)
      .limit(parseInt(limit))
      .lean();

    // Group logs by assignment for summary
    const logsByAssignment = {};
    logs.forEach(log => {
      const assignmentId = log.assignmentId.toString();
      if (!logsByAssignment[assignmentId]) {
        logsByAssignment[assignmentId] = {
          assignmentId,
          totalPrompts: 0,
          totalTokens: 0,
          promptTypes: {},
        };
      }
      logsByAssignment[assignmentId].totalPrompts++;
      logsByAssignment[assignmentId].totalTokens += log.promptTokens + log.completionTokens;

      // Count by prompt type
      const type = log.promptType;
      logsByAssignment[assignmentId].promptTypes[type] =
        (logsByAssignment[assignmentId].promptTypes[type] || 0) + 1;
    });

    res.json({
      success: true,
      logs,
      totalLogs: logs.length,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      summary: {
        byAssignment: Object.values(logsByAssignment),
        totalPrompts: logs.length,
        totalTokens: logs.reduce((sum, log) => sum + log.promptTokens + log.completionTokens, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching student logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

/**
 * @swagger
 * /api/analytics/assignment/{id}:
 *   get:
 *     summary: Get analytics for an assignment
 *     description: Calculate average score, completion rate, AI usage statistics for an assignment
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     assignmentId:
 *                       type: string
 *                     assignmentTitle:
 *                       type: string
 *                     totalStudents:
 *                       type: number
 *                     submittedCount:
 *                       type: number
 *                     completionRate:
 *                       type: string
 *                     averageScore:
 *                       type: number
 *                     averageFinalScore:
 *                       type: number
 *                     averageAISkillScore:
 *                       type: number
 *                     aiUsage:
 *                       type: object
 *                     scoreDistribution:
 *                       type: object
 *       404:
 *         description: Assignment not found
 */
router.get('/analytics/assignment/:id', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate assignment exists
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Get all submissions for this assignment
    const submissions = await AssignmentSubmission.find({ assignmentId: id });
    const submittedSubmissions = submissions.filter(s => s.status === 'submitted');

    // Calculate basic metrics
    const totalStudents = submissions.length;
    const submittedCount = submittedSubmissions.length;
    const completionRate =
      totalStudents > 0 ? ((submittedCount / totalStudents) * 100).toFixed(1) : '0.0';

    // Calculate average scores (only for submitted)
    let totalScore = 0;
    let totalFinalScore = 0;
    let totalAISkillScore = 0;
    let countWithScores = 0;

    submittedSubmissions.forEach(sub => {
      if (sub.totalScore !== undefined && sub.totalScore !== null) {
        totalScore += sub.totalScore;
        countWithScores++;
      }
      if (sub.finalScore !== undefined && sub.finalScore !== null) {
        totalFinalScore += sub.finalScore;
      }
      if (sub.aiSkillScore !== undefined && sub.aiSkillScore !== null) {
        totalAISkillScore += sub.aiSkillScore;
      }
    });

    const averageScore = countWithScores > 0 ? (totalScore / countWithScores).toFixed(2) : 0;
    const averageFinalScore =
      submittedCount > 0 ? (totalFinalScore / submittedCount).toFixed(2) : 0;
    const averageAISkillScore =
      submittedCount > 0 ? (totalAISkillScore / submittedCount).toFixed(2) : 0;

    // Get all AI logs for this assignment
    const allLogs = await AI_Log.find({ assignmentId: id });

    // Calculate AI usage statistics
    const submissionsWithAI = new Set(allLogs.map(log => log.submissionId.toString())).size;
    const totalPrompts = allLogs.length;
    const avgPromptsPerSubmission =
      submissionsWithAI > 0 ? (totalPrompts / submissionsWithAI).toFixed(1) : '0.0';
    const totalTokens = allLogs.reduce(
      (sum, log) => sum + (log.promptTokens || 0) + (log.completionTokens || 0),
      0
    );

    // Count prompt types
    const promptTypes = {};
    allLogs.forEach(log => {
      promptTypes[log.promptType] = (promptTypes[log.promptType] || 0) + 1;
    });

    // AI usage by question
    const questionAIUsage = {};
    allLogs.forEach(log => {
      if (log.questionId) {
        const qId = log.questionId.toString();
        questionAIUsage[qId] = (questionAIUsage[qId] || 0) + 1;
      }
    });

    // Convert to array and sort by usage
    const topQuestionsWithAI = Object.entries(questionAIUsage)
      .map(([questionId, count]) => ({ questionId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 questions

    // Score distribution (buckets: 0-59, 60-69, 70-79, 80-89, 90-100)
    const scoreDistribution = {
      '0-59': 0,
      '60-69': 0,
      '70-79': 0,
      '80-89': 0,
      '90-100': 0,
    };

    submittedSubmissions.forEach(sub => {
      if (sub.finalScore !== undefined && sub.finalScore !== null) {
        const score = sub.finalScore;
        if (score < 60) scoreDistribution['0-59']++;
        else if (score < 70) scoreDistribution['60-69']++;
        else if (score < 80) scoreDistribution['70-79']++;
        else if (score < 90) scoreDistribution['80-89']++;
        else scoreDistribution['90-100']++;
      }
    });

    // Time statistics
    const submissionTimes = submittedSubmissions
      .filter(s => s.submittedAt && s.startedAt)
      .map(s => (new Date(s.submittedAt) - new Date(s.startedAt)) / 1000 / 60); // minutes

    const avgTimeSpent =
      submissionTimes.length > 0
        ? (submissionTimes.reduce((sum, time) => sum + time, 0) / submissionTimes.length).toFixed(1)
        : '0.0';

    res.json({
      success: true,
      analytics: {
        assignmentId: assignment._id,
        assignmentTitle: assignment.title,
        assignmentType: assignment.questionType,
        totalQuestions: assignment.questions ? assignment.questions.length : 0,
        totalPoints: assignment.totalPoints || 0,

        // Completion metrics
        totalStudents,
        submittedCount,
        completionRate: `${completionRate}%`,

        // Score metrics
        averageScore: parseFloat(averageScore),
        averageFinalScore: parseFloat(averageFinalScore),
        averageAISkillScore: parseFloat(averageAISkillScore),
        scoreDistribution,

        // AI usage metrics
        aiUsage: {
          totalPrompts,
          submissionsWithAI,
          aiUsageRate: `${submissionsWithAI > 0 ? ((submissionsWithAI / totalStudents) * 100).toFixed(1) : '0.0'}%`,
          avgPromptsPerSubmission: parseFloat(avgPromptsPerSubmission),
          totalTokens,
          avgTokensPerPrompt: totalPrompts > 0 ? Math.round(totalTokens / totalPrompts) : 0,
          promptTypes,
          topQuestionsWithAI,
        },

        // Time metrics
        timeMetrics: {
          avgTimeSpent: `${avgTimeSpent} minutes`,
          minTime:
            submissionTimes.length > 0
              ? `${Math.min(...submissionTimes).toFixed(1)} minutes`
              : 'N/A',
          maxTime:
            submissionTimes.length > 0
              ? `${Math.max(...submissionTimes).toFixed(1)} minutes`
              : 'N/A',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching assignment analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

/**
 * @swagger
 * /api/analytics/student/{id}:
 *   get:
 *     summary: Get analytics for a student
 *     description: Calculate student progress, AI skill trend over time, total AI interactions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: Student analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     studentName:
 *                       type: string
 *                     totalAssignments:
 *                       type: number
 *                     completedAssignments:
 *                       type: number
 *                     completionRate:
 *                       type: string
 *                     averageScore:
 *                       type: number
 *                     averageAISkillScore:
 *                       type: number
 *                     aiUsage:
 *                       type: object
 *                     progressTrend:
 *                       type: array
 *                     aiSkillTrend:
 *                       type: array
 *       404:
 *         description: Student not found
 */
router.get('/analytics/student/:id', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate student exists
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Check authorization (student can only view their own, instructors can view anyone)
    if (req.user.role === 'student' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own analytics',
      });
    }

    // Get all submissions for this student
    const submissions = await AssignmentSubmission.find({ studentId: id })
      .populate('assignmentId', 'title totalPoints')
      .sort({ submittedAt: 1 }); // Chronological order

    const completedSubmissions = submissions.filter(s => s.status === 'submitted');

    // Calculate basic metrics
    const totalAssignments = submissions.length;
    const completedAssignments = completedSubmissions.length;
    const completionRate =
      totalAssignments > 0 ? ((completedAssignments / totalAssignments) * 100).toFixed(1) : '0.0';

    // Calculate average scores
    let totalScore = 0;
    let totalFinalScore = 0;
    let totalAISkillScore = 0;
    let countWithScores = 0;

    completedSubmissions.forEach(sub => {
      if (sub.totalScore !== undefined && sub.totalScore !== null) {
        totalScore += sub.totalScore;
        countWithScores++;
      }
      if (sub.finalScore !== undefined && sub.finalScore !== null) {
        totalFinalScore += sub.finalScore;
      }
      if (sub.aiSkillScore !== undefined && sub.aiSkillScore !== null) {
        totalAISkillScore += sub.aiSkillScore;
      }
    });

    const averageScore = countWithScores > 0 ? (totalScore / countWithScores).toFixed(2) : 0;
    const averageFinalScore =
      completedAssignments > 0 ? (totalFinalScore / completedAssignments).toFixed(2) : 0;
    const averageAISkillScore =
      completedAssignments > 0 ? (totalAISkillScore / completedAssignments).toFixed(2) : 0;

    // Get all AI logs for this student
    const allLogs = await AI_Log.find({ studentId: id }).sort({ timestamp: 1 });

    // Calculate AI usage statistics
    const totalPrompts = allLogs.length;
    const totalTokens = allLogs.reduce(
      (sum, log) => sum + (log.promptTokens || 0) + (log.completionTokens || 0),
      0
    );
    const avgPromptsPerAssignment =
      completedAssignments > 0 ? (totalPrompts / completedAssignments).toFixed(1) : '0.0';

    // Count prompt types
    const promptTypes = {};
    allLogs.forEach(log => {
      promptTypes[log.promptType] = (promptTypes[log.promptType] || 0) + 1;
    });

    // Calculate average prompt length
    const totalPromptLength = allLogs.reduce((sum, log) => sum + (log.prompt?.length || 0), 0);
    const avgPromptLength = totalPrompts > 0 ? Math.round(totalPromptLength / totalPrompts) : 0;

    // Context provided rate
    const promptsWithContext = allLogs.filter(log => log.contextProvided).length;
    const contextProvidedRate =
      totalPrompts > 0 ? ((promptsWithContext / totalPrompts) * 100).toFixed(1) : '0.0';

    // Progress trend (scores over time)
    const progressTrend = completedSubmissions.map(sub => ({
      assignmentId: sub.assignmentId._id,
      assignmentTitle: sub.assignmentId.title,
      submittedAt: sub.submittedAt,
      totalScore: sub.totalScore,
      finalScore: sub.finalScore,
      aiSkillScore: sub.aiSkillScore,
    }));

    // AI skill trend (calculate AI skill score for each assignment)
    const aiSkillTrend = [];
    for (const sub of completedSubmissions) {
      const submissionLogs = allLogs.filter(
        log => log.submissionId && log.submissionId.toString() === sub._id.toString()
      );

      aiSkillTrend.push({
        assignmentId: sub.assignmentId._id,
        assignmentTitle: sub.assignmentId.title,
        submittedAt: sub.submittedAt,
        aiSkillScore: sub.aiSkillScore || 0,
        promptCount: submissionLogs.length,
        avgPromptQuality:
          submissionLogs.length > 0
            ? (
                submissionLogs.reduce((sum, log) => sum + (log.prompt?.length || 0), 0) /
                submissionLogs.length
              ).toFixed(1)
            : 0,
      });
    }

    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    if (parseFloat(averageAISkillScore) >= 80) {
      strengths.push('Excellent AI utilization skills');
    } else if (parseFloat(averageAISkillScore) < 60) {
      weaknesses.push('AI skills need improvement - consider more thoughtful prompts');
    }

    if (parseFloat(contextProvidedRate) >= 70) {
      strengths.push('Good at providing context in prompts');
    } else if (parseFloat(contextProvidedRate) < 40) {
      weaknesses.push('Rarely provides context - more context leads to better AI responses');
    }

    if (avgPromptLength >= 40) {
      strengths.push('Writes detailed, specific prompts');
    } else if (avgPromptLength < 20) {
      weaknesses.push('Prompts are too short - more detail gets better guidance');
    }

    if (parseFloat(averageFinalScore) >= 80) {
      strengths.push('Strong overall performance');
    } else if (parseFloat(averageFinalScore) < 60) {
      weaknesses.push('Struggling with assignments - consider asking for more help');
    }

    res.json({
      success: true,
      analytics: {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,

        // Assignment progress
        totalAssignments,
        completedAssignments,
        completionRate: `${completionRate}%`,

        // Score metrics
        averageScore: parseFloat(averageScore),
        averageFinalScore: parseFloat(averageFinalScore),
        averageAISkillScore: parseFloat(averageAISkillScore),

        // AI usage metrics
        aiUsage: {
          totalPrompts,
          totalTokens,
          avgPromptsPerAssignment: parseFloat(avgPromptsPerAssignment),
          avgTokensPerPrompt: totalPrompts > 0 ? Math.round(totalTokens / totalPrompts) : 0,
          avgPromptLength,
          contextProvidedRate: `${contextProvidedRate}%`,
          promptTypes,
        },

        // Trends over time (ready for chart)
        progressTrend,
        aiSkillTrend,

        // Insights
        insights: {
          strengths,
          weaknesses,
          recommendation:
            weaknesses.length > strengths.length
              ? 'Focus on improving AI prompt quality and providing more context'
              : 'Keep up the good work! Continue leveraging AI effectively',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

module.exports = router;
