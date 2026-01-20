/**
 * AI Chat Routes
 * Handles real-time AI assistance during student assignments
 *
 * Features:
 * - Context-aware AI tutoring
 * - Interaction logging for skill scoring
 * - Rate limiting per submission
 * - Token usage tracking
 */

const express = require('express');
const router = express.Router();
const { Assignment, AssignmentSubmission, AI_Log } = require('../models');
const auth = require('../middleware/auth');
const { aiChatLimiter } = require('../middleware/security');
const { trackAIChatRequest, trackAIChatError, trackOpenAICall } = require('../config/appInsights');
const { scorePromptHeuristic } = require('../services/promptScoringService');

// OpenAI initialization (supports both Azure OpenAI and OpenAI)
let openai = null;
const OpenAI = require('openai');

if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
  // Azure OpenAI configuration
  openai = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
    defaultQuery: { 'api-version': '2024-12-01-preview' },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
  });
  console.log('✅ [AI Chat] Azure OpenAI initialized:', process.env.AZURE_OPENAI_DEPLOYMENT);
} else if (process.env.OPENAI_API_KEY) {
  // Standard OpenAI configuration
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ [AI Chat] OpenAI initialized');
} else {
  console.warn('⚠️ [AI Chat] No OpenAI API key configured (AI features disabled)');
}

/**
 * Rate limit configuration per submission
 * In-memory rate limiting: 20 requests per 30 minutes per submissionId
 */
const submissionRateLimits = new Map(); // submissionId -> { count, resetTime }

const RATE_LIMIT_CONFIG = {
  maxPromptsPerSubmission: parseInt(process.env.MAX_AI_PROMPTS_PER_SUBMISSION) || 20,
  windowMinutes: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MINUTES) || 30,
};

/**
 * Check rate limit for submission
 */
function checkRateLimit(submissionId) {
  const now = Date.now();
  const limit = submissionRateLimits.get(submissionId);

  if (!limit) {
    // First request
    submissionRateLimits.set(submissionId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000,
    });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxPromptsPerSubmission - 1 };
  }

  // Check if window expired
  if (now > limit.resetTime) {
    // Reset window
    submissionRateLimits.set(submissionId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000,
    });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxPromptsPerSubmission - 1 };
  }

  // Check if limit exceeded
  if (limit.count >= RATE_LIMIT_CONFIG.maxPromptsPerSubmission) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: limit.resetTime,
    };
  }

  // Increment count
  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxPromptsPerSubmission - limit.count };
}

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Send a message to AI tutor during assignment
 *     description: |
 *       Students can ask AI for help while working on assignments.
 *       All interactions are logged for AI Skill Score calculation.
 *       Rate limits apply to prevent cost explosion.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - submissionId
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Student's question or request for help
 *                 example: "Can you explain what a closure is in simple terms?"
 *               submissionId:
 *                 type: string
 *                 description: ID of the current submission
 *                 example: "673abc123def456789012345"
 *               questionId:
 *                 type: string
 *                 description: Optional - ID of the specific question being asked about
 *                 example: "q1"
 *               context:
 *                 type: string
 *                 description: Optional - Additional context for the AI (e.g., student's current answer)
 *                 example: "I think a closure is a function that returns another function"
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "A closure is a function that has access to variables in its outer scope..."
 *                 tokensUsed:
 *                   type: integer
 *                   example: 150
 *                 suggestedActions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Try writing a simple example", "Test your understanding"]
 *       400:
 *         description: Invalid request (missing prompt, submission not found, etc.)
 *       403:
 *         description: AI not allowed for this assignment or submission already submitted
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error or OpenAI API error
 */
router.post('/chat', aiChatLimiter, auth.student, async (req, res) => {
  const startTime = Date.now();

  try {
    const { prompt, submissionId, questionId, context } = req.body;

    // Track AI chat request (non-blocking)
    try {
      trackAIChatRequest({
        submissionId,
        questionId: questionId || null,
        promptLength: prompt?.length || 0,
        hasContext: !!context,
        studentId: req.user.id,
      });
    } catch (trackError) {
      console.error('Warning: Failed to track AI chat request:', trackError.message);
    }

    // ============================================
    // 1. Input Validation
    // ============================================
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a non-empty string',
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is too long (max 2000 characters)',
      });
    }

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required',
      });
    }

    // ============================================
    // 2. Validate Submission Exists and Not Submitted
    // ============================================
    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check ownership (student can only use AI for their own submission)
    if (submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only use AI for your own submissions',
      });
    }

    // Cannot use AI after submission
    if (submission.status !== 'draft') {
      return res.status(403).json({
        success: false,
        error: 'Cannot use AI after submission. Status: ' + submission.status,
      });
    }

    // ============================================
    // 3. Check Assignment Allows AI
    // ============================================
    const assignment = await Assignment.findById(submission.assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    if (!assignment.settings?.allowAI) {
      return res.status(403).json({
        success: false,
        error: 'AI assistance is not allowed for this assignment',
      });
    }

    // ============================================
    // 4. Rate Limiting (In-Memory, Per Submission)
    // ============================================
    const rateLimitCheck = checkRateLimit(submissionId);

    if (!rateLimitCheck.allowed) {
      const minutesRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT',
        message: `Bạn đã hỏi quá nhanh. Vui lòng thử lại sau ${minutesRemaining} phút.`,
        rateLimitInfo: {
          maxPrompts: RATE_LIMIT_CONFIG.maxPromptsPerSubmission,
          windowMinutes: RATE_LIMIT_CONFIG.windowMinutes,
          resetInMinutes: minutesRemaining,
        },
      });
    }

    // ============================================
    // 5. Build Socratic System Prompt
    // ============================================
    let systemPrompt = `You are a Socratic tutor helping a student with an assignment.
Your goal is to guide the student to the answer without giving it directly.
- Ask clarifying questions to help the student articulate their confusion.
- Provide hints and analogies rather than solutions.
- Encourage critical thinking and independent problem-solving.
- If the student asks for the answer, politely refuse and offer a hint instead.`;

    // Add question context if available
    if (questionId) {
      const question = assignment.questions.id(questionId);
      if (question) {
        systemPrompt += `\n\nStudent is working on: "${question.question}"`;
        if (question.type === 'multiple-choice' && question.options) {
          // Truncate options to avoid token overflow
          const optionsStr = question.options.slice(0, 4).join(', ');
          systemPrompt += `\nOptions: ${optionsStr}`;
        }
      }
    }

    // Build user message
    let userMessage = prompt;
    if (context && context.trim().length > 0) {
      // Truncate context to max 8000 chars
      const truncatedContext = context.substring(0, 8000);
      userMessage = `[Bối cảnh: ${truncatedContext}]\n\nCâu hỏi: ${prompt}`;
    }

    // ============================================
    // 6. Check OpenAI API Key
    // ============================================
    if (!openai) {
      return res.status(500).json({
        success: false,
        error: 'AI service is not configured.',
      });
    }

    // ============================================
    // 7. Call OpenAI API
    // ============================================
    let aiResponse;
    const openaiStartTime = Date.now();

    try {
      // Azure OpenAI uses deployment name in baseURL, standard OpenAI uses model parameter
      const isAzure = process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY;
      const model = isAzure
        ? process.env.AZURE_OPENAI_DEPLOYMENT || 'o4-mini'
        : process.env.OPENAI_MODEL || 'gpt-4o-mini';

      console.log(`🔵 Calling OpenAI with model: ${model}`);
      console.log(`🔵 System prompt length: ${systemPrompt.length} chars`);
      console.log(`🔵 User message length: ${userMessage.length} chars`);

      const requestParams = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_completion_tokens: 5000, // Increased for o4-mini reasoning model
      };

      aiResponse = await openai.chat.completions.create(requestParams);

      console.log(
        `✅ OpenAI responded in ${Date.now() - openaiStartTime}ms (${aiResponse.usage?.total_tokens || 0} tokens)`
      );
      console.log(
        'OpenAI response structure:',
        JSON.stringify(aiResponse, null, 2).substring(0, 500)
      );
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);

      return res.status(500).json({
        success: false,
        error: 'Failed to get AI response. Please try again.',
        details: process.env.NODE_ENV === 'development' ? openaiError.message : undefined,
      });
    }

    const responseMessage = aiResponse.choices[0]?.message?.content || '';

    // Validate response is not empty
    if (!responseMessage || responseMessage.trim().length === 0) {
      console.error('⚠️ OpenAI returned empty response');
      return res.status(500).json({
        success: false,
        error: 'AI returned an empty response. Please try again.',
      });
    }

    const responseTime = Date.now() - startTime;

    // ============================================
    // 8. Classify Prompt Type (for analytics)
    // ============================================
    const promptType = classifyPromptType(prompt);

    // ============================================
    // 9. CRITICAL: Log Interaction BEFORE Returning
    // Now using createWithClassification for advanced assessment
    // ============================================

    // Get question text for copy-paste detection
    let questionText = null;
    if (questionId) {
      const question = assignment.questions.id(questionId);
      if (question) {
        questionText = question.question; // Original question text
      }
    }

    await AI_Log.createWithClassification({
      submissionId,
      assignmentId: assignment._id,
      studentId: req.user.id,
      questionId: questionId || null,
      questionText: questionText, // CRITICAL: Store original question for comparison
      prompt: prompt.trim(),
      response: responseMessage,
      contextProvided: !!context && context.trim().length > 0,
      timestamp: new Date(),
      promptTokens: aiResponse.usage.prompt_tokens,
      completionTokens: aiResponse.usage.completion_tokens,
      responseTime,
      model: aiResponse.model || 'gpt-4o-mini',
      temperature: 0.7,
    });

    console.log(
      `✅ AI interaction logged with advanced classification for submission ${submissionId}`
    );

    // ============================================
    // 10. Increment AI Interaction Count
    // ============================================
    if (questionId) {
      try {
        await AssignmentSubmission.updateOne(
          {
            _id: submissionId,
            'answers.questionId': questionId,
          },
          {
            $inc: { 'answers.$.aiInteractionCount': 1 },
          }
        );
      } catch (updateError) {
        console.error('Failed to increment aiInteractionCount:', updateError);
      }
    }

    // ============================================
    // 11. Return Response to Student
    // ============================================
    return res.status(200).json({
      success: true,
      message: responseMessage,
      tokensUsed: aiResponse.usage.total_tokens,
      metadata: {
        promptType,
        contextProvided: !!context,
        responseTime: `${responseTime}ms`,
      },
    });
  } catch (error) {
    console.error('❌ Error in AI chat route:', error);
    console.error('Stack trace:', error.stack);

    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Helper: Classify the type of prompt for analytics
 * @param {string} prompt - The student's prompt
 * @returns {string} - Prompt type: 'question', 'clarification', 'hint', 'confirmation'
 */
function classifyPromptType(prompt) {
  const lowerPrompt = prompt.toLowerCase().trim();

  // Check for hint requests (higher priority than generic questions)
  if (
    lowerPrompt.includes('hint') ||
    lowerPrompt.includes('clue') ||
    lowerPrompt.includes('gợi ý') ||
    lowerPrompt.includes('give me a') ||
    lowerPrompt.startsWith('help')
  ) {
    return 'hint';
  }

  // Check for confirmation requests (higher priority)
  if (
    lowerPrompt.includes('is this correct') ||
    lowerPrompt.includes('am i right') ||
    lowerPrompt.includes('đúng không') ||
    lowerPrompt.includes('correct?') ||
    lowerPrompt.includes('right?')
  ) {
    return 'confirmation';
  }

  // Check for clarification requests (higher priority)
  if (
    (lowerPrompt.includes('mean') && !lowerPrompt.startsWith('what')) ||
    lowerPrompt.includes('clarify') ||
    (lowerPrompt.includes('explain') && !lowerPrompt.startsWith('what')) ||
    lowerPrompt.includes('giải thích') ||
    lowerPrompt.includes('what do you mean')
  ) {
    return 'clarification';
  }

  // Check for question indicators (default/lower priority)
  if (
    lowerPrompt.includes('?') ||
    lowerPrompt.startsWith('what') ||
    lowerPrompt.startsWith('how') ||
    lowerPrompt.startsWith('why') ||
    lowerPrompt.startsWith('when') ||
    lowerPrompt.startsWith('where') ||
    lowerPrompt.startsWith('can you') ||
    lowerPrompt.startsWith('could you')
  ) {
    return 'question';
  }

  // Default
  return 'question';
}

/**
 * @swagger
 * /api/ai/stats:
 *   get:
 *     summary: Get AI usage statistics for a submission
 *     description: Returns aggregated statistics about AI usage for analytics
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID to get stats for
 *     responses:
 *       200:
 *         description: AI usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalPrompts:
 *                       type: integer
 *                     totalTokens:
 *                       type: integer
 *                     avgPromptLength:
 *                       type: number
 *                     promptTypes:
 *                       type: object
 *                     questionsWithAI:
 *                       type: integer
 */
router.get('/stats', auth.authenticate, async (req, res) => {
  try {
    const { submissionId } = req.query;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required',
      });
    }

    // Validate submission exists and user has access
    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    // Check access (owner or instructor)
    const isOwner = submission.studentId.toString() === req.user.id;
    const isInstructor = req.user.role === 'instructor';

    if (!isOwner && !isInstructor) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get all logs for this submission
    const logs = await AI_Log.find({ submissionId });

    // Calculate statistics
    const stats = {
      totalPrompts: logs.length,
      totalTokens: logs.reduce((sum, log) => sum + log.promptTokens + log.completionTokens, 0),
      avgPromptLength:
        logs.length > 0
          ? Math.round(logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length)
          : 0,
      avgResponseTime:
        logs.length > 0
          ? Math.round(logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length)
          : 0,
      contextProvidedRate:
        logs.length > 0
          ? ((logs.filter(log => log.contextProvided).length / logs.length) * 100).toFixed(1)
          : 0,
      promptTypes: {},
      questionsWithAI: new Set(
        logs.filter(log => log.questionId).map(log => log.questionId.toString())
      ).size,
      uniquePrompts: new Set(logs.map(log => log.prompt.toLowerCase().trim())).size,
    };

    // Count prompt types
    logs.forEach(log => {
      const type = log.promptType || 'unknown';
      stats.promptTypes[type] = (stats.promptTypes[type] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch AI statistics',
    });
  }
});

module.exports = router;
