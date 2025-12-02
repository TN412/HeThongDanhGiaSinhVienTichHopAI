const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Assignment, AssignmentSubmission, AI_Log } = require('../models');
const { trackSubmissionSubmitted } = require('../config/appInsights');
const { calculateInteractionSummary, generateAutoFeedback } = require('../utils/grading');
const { summarizeGrade } = require('../utils/ai_autograder');

/**
 * POST /api/submission/start
 * Bắt đầu làm bài - tạo submission mới với status='draft'
 * Student only
 */
router.post('/start', auth.student, async (req, res) => {
  try {
    const { assignmentId } = req.body;

    console.log('🎯 [Submission/Start] Request from user:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      assignmentId,
    });

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'assignmentId is required',
      });
    }

    // Validate assignment exists và đã published
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    if (assignment.status !== 'published') {
      return res.status(403).json({
        success: false,
        error: 'Assignment is not published yet',
      });
    }

    // Check deadline
    if (assignment.deadline && new Date() > assignment.deadline) {
      return res.status(403).json({
        success: false,
        error: 'Assignment deadline has passed',
      });
    }

    // Check nếu student đã có submission cho assignment này
    const existingSubmissions = await AssignmentSubmission.find({
      studentId: req.user.id,
      assignmentId: assignmentId,
    });

    // Check maxAttempts
    const maxAttempts = assignment.settings.maxAttempts || 1;
    if (existingSubmissions.length >= maxAttempts) {
      return res.status(403).json({
        success: false,
        error: `Maximum attempts (${maxAttempts}) reached for this assignment`,
        existingSubmissions: existingSubmissions.length,
      });
    }

    // Tính attemptNumber
    const attemptNumber = existingSubmissions.length + 1;

    // Khởi tạo answers từ questions
    const answers = assignment.questions.map(question => ({
      questionId: question._id,
      answer: null,
      isCorrect: null,
      pointsEarned: 0,
      aiInteractionCount: 0,
    }));

    // Tạo submission mới
    const submission = await AssignmentSubmission.create({
      studentId: req.user.id,
      assignmentId: assignmentId,
      attemptNumber: attemptNumber,
      answers: answers,
      status: 'draft',
      startedAt: new Date(),
      totalScore: 0,
      aiSkillScore: 0,
      finalScore: 0,
    });

    console.log(
      `[Submission] Student ${req.user.id} started assignment ${assignmentId} (attempt ${attemptNumber})`
    );

    res.status(201).json({
      success: true,
      submissionId: submission._id,
      attemptNumber: attemptNumber,
      status: submission.status,
      startedAt: submission.startedAt,
      questionCount: answers.length,
    });
  } catch (error) {
    console.error('[Submission Start] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start submission',
    });
  }
});

/**
 * GET /api/submission/:id
 * Lấy chi tiết submission
 * Student (owner) or Instructor
 */
router.get('/:id', auth.authenticate, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignmentId', 'title description questions settings deadline')
      .populate('studentId', 'name email studentId');

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check quyền truy cập
    const isOwner = submission.studentId._id.toString() === req.user.id;
    const isInstructor = req.user.role === 'instructor';

    if (!isOwner && !isInstructor) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own submissions.',
      });
    }

    // Nếu là student và bài đã submit, ẩn correctAnswer
    const responseData = submission.toJSON();

    // Flatten populated data for frontend compatibility
    if (responseData.studentId && typeof responseData.studentId === 'object') {
      responseData.studentName = responseData.studentId.name;
      responseData.studentEmail = responseData.studentId.email;
      responseData.studentIdNumber = responseData.studentId.studentId;
    }

    if (req.user.role === 'student' && submission.status === 'draft') {
      // Student đang làm bài - không hiện correctAnswer
      if (responseData.assignmentId && responseData.assignmentId.questions) {
        responseData.assignmentId.questions = responseData.assignmentId.questions.map(q => {
          const { correctAnswer, ...questionWithoutAnswer } = q;
          return questionWithoutAnswer;
        });
      }
    }

    res.json({
      success: true,
      submission: responseData,
      meta: {
        isOwner: isOwner,
        canEdit: isOwner && submission.status === 'draft',
        canSubmit: isOwner && submission.status === 'draft',
        timeTaken: submission.timeTaken,
        completionPercentage: submission.completionPercentage,
      },
    });
  } catch (error) {
    console.error('[Submission Get] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve submission',
    });
  }
});

/**
 * PUT /api/submission/:id
 * Lưu nháp - update answers
 * Student (owner) only, status must be 'draft'
 * Optimistic concurrency với __v (versionKey)
 */
router.put('/:id', auth.student, async (req, res) => {
  try {
    const { answers, version } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'answers array is required',
      });
    }

    // Lấy submission hiện tại
    const submission = await AssignmentSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check ownership
    if (submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only edit your own submissions.',
      });
    }

    // Check status - không cho sửa sau khi submit
    if (submission.status !== 'draft') {
      return res.status(403).json({
        success: false,
        error: 'Cannot edit submission after it has been submitted',
      });
    }

    // Optimistic concurrency check
    if (version !== undefined && submission.__v !== version) {
      return res.status(409).json({
        success: false,
        error: 'Submission was modified by another request. Please reload and try again.',
        currentVersion: submission.__v,
        providedVersion: version,
      });
    }

    // Update answers
    answers.forEach(updatedAnswer => {
      const existingAnswer = submission.answers.find(
        a => a.questionId.toString() === updatedAnswer.questionId
      );

      if (existingAnswer) {
        existingAnswer.answer = updatedAnswer.answer;
        // aiInteractionCount will be updated by AI chat endpoint
        if (updatedAnswer.aiInteractionCount !== undefined) {
          existingAnswer.aiInteractionCount = updatedAnswer.aiInteractionCount;
        }
      }
    });

    // Update lastActivityAt
    submission.behaviorMetrics = submission.behaviorMetrics || {};
    submission.behaviorMetrics.lastActivityAt = new Date();

    // Save với version increment
    await submission.save();

    console.log(`[Submission] Draft saved for ${req.params.id} (v${submission.__v})`);

    res.json({
      success: true,
      message: 'Draft saved successfully',
      version: submission.__v,
      lastSaved: new Date(),
    });
  } catch (error) {
    console.error('[Submission Save] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save draft',
    });
  }
});

/**
 * POST /api/submission/:id/submit
 * Submit bài làm - auto-grading + AI skill scoring
 * Student (owner) only, status must be 'draft'
 */
router.post('/:id/submit', auth.student, async (req, res) => {
  try {
    // Lấy submission với assignment data
    const submission = await AssignmentSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check ownership
    if (submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only submit your own work.',
      });
    }

    // Check status
    if (submission.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Submission has already been submitted',
      });
    }

    // Lấy assignment để có questions
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    console.log(`[Submission] Auto-grading submission ${req.params.id} with AI_AutoGrader...`);

    // ===== PREPARE DATA FOR AI_AUTOGRADER =====

    // Step 1: Prepare MCQ data
    const studentMCQ = submission.answers
      .filter(a => {
        const q = assignment.questions.id(a.questionId);
        return q && q.type === 'multiple-choice';
      })
      .map(a => ({
        questionId: a.questionId.toString(),
        answer: a.answer || '',
      }));

    const correctMCQ = assignment.questions
      .filter(q => q.type === 'multiple-choice')
      .map(q => ({
        questionId: q._id.toString(),
        correctAnswer: q.correctAnswer,
        topic: q.topic || 'General',
        points: q.points,
      }));

    // Step 2: Prepare Essay data
    const essayAnswers = submission.answers.filter(a => {
      const q = assignment.questions.id(a.questionId);
      return q && q.type === 'essay';
    });

    const studentEssay = essayAnswers.map(a => a.answer || '').join('\n\n');

    const essayQuestion = assignment.questions.find(q => q.type === 'essay');
    const keyPoints = essayQuestion?.rubric
      ? essayQuestion.rubric
          .split(/[.,;]/)
          .map(s => s.trim())
          .filter(s => s.length > 5)
      : [];

    // Step 3: Prepare AI Chat Log
    const logs = await AI_Log.find({ submissionId: submission._id })
      .select('prompt response -_id')
      .lean();

    const aiChatLog = logs.map(log => ({
      prompt: log.prompt || '',
      response: log.response || '',
    }));

    const aiGeneratedAnswers = logs.map(log => log.response || '');

    // Step 4: Calculate weights based on assignment composition
    const hasEssayQuestions = assignment.questions.some(q => q.type === 'essay');
    const mcqCount = assignment.questions.filter(q => q.type === 'multiple-choice').length;
    const essayCount = assignment.questions.filter(q => q.type === 'essay').length;

    let weights;
    if (!hasEssayQuestions) {
      // Only MCQ
      weights = { mcq: 0.7, essay: 0, aiUsage: 0.3 };
    } else if (mcqCount === 0) {
      // Only Essay
      weights = { mcq: 0, essay: 0.7, aiUsage: 0.3 };
    } else {
      // Mixed
      weights = { mcq: 0.4, essay: 0.4, aiUsage: 0.2 };
    }

    console.log(
      `[Submission] Grading with weights: MCQ=${weights.mcq}, Essay=${weights.essay}, AI=${weights.aiUsage}`
    );

    // ===== CALL AI_AUTOGRADER =====
    const gradingResult = summarizeGrade({
      studentMCQ,
      correctMCQ,
      studentEssay,
      keyPoints,
      aiChatLog,
      aiGeneratedAnswers,
      weights,
    });

    console.log('[Submission] AI_AutoGrader Results:');
    console.log(`  MCQ Score: ${gradingResult.mcqScore.toFixed(2)}/10`);
    console.log(`  Essay Score: ${gradingResult.essayScore.toFixed(2)}/10`);
    console.log(`  AI Usage Score: ${gradingResult.aiUsageScore.toFixed(2)}/10`);
    console.log(`  Final Score: ${gradingResult.finalScore.toFixed(2)}/10`);
    console.log(`  Similarity to AI: ${gradingResult.similarityToAI.toFixed(1)}%`);

    // ===== UPDATE SUBMISSION WITH RESULTS =====

    // Update individual answer results (MCQ)
    submission.answers.forEach(answer => {
      const question = assignment.questions.id(answer.questionId);
      if (!question) return;

      if (question.type === 'multiple-choice') {
        const studentAnswer = (answer.answer || '').trim().toUpperCase();
        const correctAnswer = question.correctAnswer.trim().toUpperCase();
        answer.isCorrect = studentAnswer === correctAnswer;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
      } else if (question.type === 'essay') {
        // Essay scored by AI_AutoGrader (already 0-10 scale)
        answer.isCorrect = null;
        answer.pointsEarned = (gradingResult.essayScore / 10) * question.points;
      }
    });

    // No scaling needed - AI_AutoGrader already returns 0-10 scale
    submission.totalScore = gradingResult.mcqScore;
    submission.contentScore = (gradingResult.mcqScore + gradingResult.essayScore) / 2;
    submission.aiSkillScore = gradingResult.aiUsageScore;
    submission.finalScore = gradingResult.finalScore;

    // Store detailed feedback
    submission.feedback = gradingResult.feedback.overall;

    // Calculate correct aiInteractionSummary format for AISkillBadges component
    submission.aiInteractionSummary = calculateInteractionSummary(logs, submission);

    // Store full grading details for review
    submission.gradingDetails = gradingResult.details;

    // Check if needs manual grading
    const needsManualGrading = hasEssayQuestions && essayCount > 0;

    if (!needsManualGrading) {
      submission.status = 'submitted';
      console.log(`  ✅ Auto-graded successfully`);
    } else {
      submission.status = 'pending_grading';
      console.log(`  ⏳ Has essay questions - may need instructor review`);
    }

    // Step 4: Set submission timestamp
    submission.submittedAt = new Date();

    await submission.save();

    console.log(`[Submission] Submitted successfully`);
    console.log(`  Final Score: ${submission.finalScore.toFixed(2)}/10`);

    // Calculate total possible points
    const totalPossiblePoints = assignment.questions.reduce((sum, q) => sum + (q.points || 0), 0);

    // Track submission submitted event
    trackSubmissionSubmitted({
      submissionId: submission._id.toString(),
      assignmentId: submission.assignmentId.toString(),
      studentId: req.user.id,
      questionsCount: submission.answers.length,
      aiInteractionsCount: logs.length,
      totalScore: submission.totalScore,
      aiSkillScore: submission.aiSkillScore,
      finalScore: submission.finalScore,
      timeSpentMinutes: Math.round(submission.timeTaken / 60),
    });

    res.json({
      success: true,
      message: 'Submission graded successfully with AI_AutoGrader',
      results: {
        totalScore: submission.totalScore,
        totalPossiblePoints: totalPossiblePoints,
        contentScore: submission.contentScore,
        aiSkillScore: submission.aiSkillScore,
        finalScore: submission.finalScore,
        submittedAt: submission.submittedAt,
        timeTaken: submission.timeTaken,
        aiInteractionSummary: submission.aiInteractionSummary,
        gradingDetails: submission.gradingDetails,
      },
      breakdown: {
        mcqWeight: weights.mcq,
        essayWeight: weights.essay,
        aiUsageWeight: weights.aiUsage,
        aiInteractions: logs.length,
        similarityToAI: gradingResult.similarityToAI,
      },
      needsManualGrading: needsManualGrading,
      feedback: submission.feedback,
    });
  } catch (error) {
    console.error('[Submission Submit] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit assignment',
    });
  }
});

/**
 * GET /api/submission/instructor/all
 * Get all submissions for instructor (across all their assignments)
 * Instructor only
 */
router.get('/instructor/all', auth.instructor, async (req, res) => {
  try {
    const { status, assignmentId, sortBy = 'submittedAt', order = 'desc' } = req.query;

    // Get all assignments by this instructor
    const instructorAssignments = await Assignment.find({
      instructorId: req.user.id,
    }).select('_id');

    const assignmentIds = instructorAssignments.map(a => a._id);

    // Build query for submissions
    const query = { assignmentId: { $in: assignmentIds } };

    if (status && ['draft', 'submitted', 'graded'].includes(status)) {
      query.status = status;
    }

    if (assignmentId) {
      query.assignmentId = assignmentId;
    }

    // Get submissions with populated data
    const submissions = await AssignmentSubmission.find(query)
      .populate('studentId', 'name email studentId department')
      .populate('assignmentId', 'title questionType totalPoints deadline')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .lean();

    // Calculate AI interaction summary for each and flatten populated data
    const enrichedSubmissions = await Promise.all(
      submissions.map(async submission => {
        const logs = await AI_Log.find({ submissionId: submission._id });

        return {
          ...submission,
          // Flatten populated student data for frontend compatibility
          studentName: submission.studentId?.name || 'Unknown',
          studentEmail: submission.studentId?.email || '',
          studentDepartment: submission.studentId?.department || '',
          // Keep the original populated object too in case needed
          aiInteractionSummary: {
            totalPrompts: logs.length,
            avgPromptLength:
              logs.length > 0
                ? logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length
                : 0,
            independenceLevel:
              logs.length > 0 ? Math.max(0, 1 - logs.length / submission.answers.length) : 1,
          },
        };
      })
    );

    res.json({
      success: true,
      submissions: enrichedSubmissions,
      count: enrichedSubmissions.length,
    });
  } catch (error) {
    console.error('[Submission List] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load submissions',
    });
  }
});

/**
 * POST /api/submission/:id/grade
 * Grade essay questions manually (instructor only)
 * Body: { questionId, points, feedback }
 */
router.post('/:id/grade', auth.instructor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { questionId, points, feedback } = req.body;

    // Validate input
    if (!questionId) {
      return res.status(400).json({
        success: false,
        error: 'questionId is required',
      });
    }

    if (points === undefined || points === null) {
      return res.status(400).json({
        success: false,
        error: 'points is required',
      });
    }

    // Find submission
    const submission = await AssignmentSubmission.findById(submissionId).populate('assignmentId');
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Verify instructor owns the assignment
    if (submission.assignmentId.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to grade this submission',
      });
    }

    // Find the answer to grade
    const answerIndex = submission.answers.findIndex(a => a.questionId.toString() === questionId);

    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Answer not found for this question',
      });
    }

    // Find the question to get max points
    const question = submission.assignmentId.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found',
      });
    }

    // Validate points doesn't exceed max
    if (points > question.points) {
      return res.status(400).json({
        success: false,
        error: `Points cannot exceed maximum (${question.points})`,
      });
    }

    // Update the answer
    submission.answers[answerIndex].pointsEarned = points;
    submission.answers[answerIndex].feedback = feedback || '';
    submission.answers[answerIndex].gradedAt = new Date();
    submission.answers[answerIndex].gradedBy = req.user.id;

    // Recalculate total score
    submission.totalScore = submission.answers.reduce(
      (sum, answer) => sum + (answer.pointsEarned || 0),
      0
    );

    // Check if all essay questions are graded
    const assignment = submission.assignmentId;
    const allEssayGraded = submission.answers.every(answer => {
      const q = assignment.questions.id(answer.questionId);
      return q?.type !== 'essay' || answer.pointsEarned !== undefined;
    });

    // Recalculate final score only if all essay questions are graded
    if (allEssayGraded) {
      const AI_SKILL_SCORE_WEIGHT = parseFloat(process.env.AI_SKILL_SCORE_WEIGHT) || 0.3;
      const contentPercentage = (submission.totalScore / assignment.totalPoints) * 100;
      const contentScoreScale10 = (contentPercentage / 100) * 10;
      const aiSkillScoreScale10 = submission.aiSkillScore || 0; // Already in 0-10 scale

      // Calculate final score
      let finalScorePercentage;
      if (AI_SKILL_SCORE_WEIGHT === 0) {
        finalScorePercentage = contentPercentage;
      } else {
        const aiSkillPercentage = (aiSkillScoreScale10 / 10) * 100;
        finalScorePercentage =
          contentPercentage * (1 - AI_SKILL_SCORE_WEIGHT) +
          aiSkillPercentage * AI_SKILL_SCORE_WEIGHT;
      }

      submission.finalScore = (finalScorePercentage / 100) * 10;
      submission.contentScore = contentScoreScale10;
      submission.status = 'graded';

      console.log(
        `✅ All essay questions graded - Final Score: ${submission.finalScore.toFixed(2)}/10`
      );
    } else if (submission.status === 'pending_grading') {
      // Still waiting for more essay questions to be graded
      console.log(`⏳ Waiting for more essay questions to be graded`);
    }

    await submission.save();

    console.log(`✅ Question graded: ${questionId} in submission ${submissionId}`);

    res.json({
      success: true,
      message: 'Question graded successfully',
      submission: {
        _id: submission._id,
        totalScore: submission.totalScore,
        finalScore: submission.finalScore,
        status: submission.status,
      },
    });
  } catch (error) {
    console.error('[Grade Submission] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to grade submission',
    });
  }
});

/**
 * POST /api/submission/:id/feedback
 * Giảng viên gửi nhận xét chung cho bài làm
 * Instructor only
 */
router.post('/:id/feedback', auth.instructor, async (req, res) => {
  try {
    const { feedback } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Feedback is required',
      });
    }

    const submission = await AssignmentSubmission.findById(req.params.id).populate(
      'assignmentId',
      'instructorId'
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check if instructor owns this assignment
    if (submission.assignmentId.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only provide feedback for your own assignments',
      });
    }

    // Update feedback
    submission.feedback = feedback.trim();
    submission.feedbackAt = new Date();
    submission.feedbackBy = req.user.id;

    await submission.save();

    console.log(`✅ Feedback added to submission ${submission._id}`);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: submission.feedback,
    });
  } catch (error) {
    console.error('[Submit Feedback] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback',
    });
  }
});

/**
 * GET /api/submission/student/my-submissions
 * Lấy danh sách tất cả bài làm của sinh viên
 * Student only
 */
router.get('/student/my-submissions', auth.student, async (req, res) => {
  try {
    const { status, sortBy = 'submittedAt', order = 'desc' } = req.query;

    // Build query
    const query = { studentId: req.user.id };

    if (status && ['draft', 'submitted', 'graded'].includes(status)) {
      query.status = status;
    }

    // Get submissions
    const submissions = await AssignmentSubmission.find(query)
      .populate('assignmentId', 'title description deadline questionType')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .lean();

    // Format response
    const formattedSubmissions = submissions.map(sub => ({
      _id: sub._id,
      assignmentTitle: sub.assignmentId?.title || 'N/A',
      assignmentDescription: sub.assignmentId?.description || '',
      deadline: sub.assignmentId?.deadline,
      status: sub.status,
      totalScore: sub.totalScore,
      contentScore: sub.contentScore,
      aiSkillScore: sub.aiSkillScore,
      finalScore: sub.finalScore,
      submittedAt: sub.submittedAt,
      feedback: sub.feedback || null,
      feedbackAt: sub.feedbackAt || null,
      hasEssayQuestions:
        sub.assignmentId?.questionType === 'essay' || sub.assignmentId?.questionType === 'mixed',
    }));

    res.json({
      success: true,
      submissions: formattedSubmissions,
      count: formattedSubmissions.length,
    });
  } catch (error) {
    console.error('[Get My Submissions] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get submissions',
    });
  }
});

module.exports = router;
// Export for testing - AI_AutoGrader functions available directly from module
