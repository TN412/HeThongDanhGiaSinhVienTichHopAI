const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { upload, validateFileContent, handleUploadError } = require('../middleware/upload');
const auth = require('../middleware/auth');
const { extractText, validateExtractedText, truncateForAI } = require('../utils/documentParser');
const { uploadToBlob, isBlobStorageConfigured } = require('../utils/blob');
const { Assignment } = require('../models');
const {
  uploadLimiter,
  aiGenerationLimiter,
  sanitizeUploadedFile,
} = require('../middleware/security');
const { trackAssignmentGeneration, trackOpenAICall } = require('../config/appInsights');

// Initialize OpenAI (supports both Azure OpenAI and OpenAI)
let openai = null;
if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
  // Azure OpenAI configuration
  openai = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
    defaultQuery: { 'api-version': '2024-12-01-preview' },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
  });
  console.log('✅ Azure OpenAI initialized:', process.env.AZURE_OPENAI_DEPLOYMENT);
} else if (process.env.OPENAI_API_KEY) {
  // Standard OpenAI configuration
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI initialized');
} else {
  console.warn('⚠️ No OpenAI API key configured (AI features disabled)');
}

/**
 * Build prompt cho OpenAI để generate câu hỏi
 * @param {string} text - Extracted text từ document
 * @param {string} type - 'multiple-choice' | 'essay' | 'mixed'
 * @param {number} count - Số lượng câu hỏi cần tạo
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {string} - Prompt cho OpenAI
 */
function buildQuestionGenerationPrompt(text, type, count, difficulty) {
  if (type === 'multiple-choice') {
    return `Dựa trên tài liệu sau, hãy tạo ${count} câu hỏi trắc nghiệm cấp độ ${difficulty === 'easy' ? 'dễ' : difficulty === 'medium' ? 'trung bình' : 'khó'}.

Yêu cầu cho mỗi câu hỏi:
- Câu hỏi phải bằng TIẾNG VIỆT
- 4 lựa chọn (gán nhãn A, B, C, D)
- Đáp án đúng (phải là một trong A, B, C, D)
- Giải thích ngắn gọn tại sao đáp án đúng
- Điểm số (phù hợp với độ khó: dễ=5, trung bình=10, khó=15)

Định dạng JSON chính xác như sau:
{
  "type": "multiple-choice",
  "question": "Câu hỏi bằng tiếng Việt",
  "options": ["A. Lựa chọn thứ nhất", "B. Lựa chọn thứ hai", "C. Lựa chọn thứ ba", "D. Lựa chọn thứ tư"],
  "correctAnswer": "A",
  "explanation": "Giải thích tại sao A đúng",
  "points": 10,
  "difficulty": "${difficulty}"
}

QUAN TRỌNG:
- Chỉ trả về JSON hợp lệ, KHÔNG có text khác
- correctAnswer phải là chính xác một chữ cái: A, B, C, hoặc D
- Tất cả câu hỏi phải dựa trên nội dung tài liệu
- Câu hỏi phải rõ ràng và không mơ hồ
- SỬ DỤNG TIẾNG VIỆT cho câu hỏi, lựa chọn, và giải thích

Tài liệu:
${text.substring(0, 8000)}

Trả về response dưới dạng mảng JSON các đối tượng câu hỏi.`;
  } else if (type === 'essay') {
    return `Dựa trên tài liệu sau, hãy tạo ${count} câu hỏi tự luận cấp độ ${difficulty === 'easy' ? 'dễ' : difficulty === 'medium' ? 'trung bình' : 'khó'}.

Yêu cầu cho mỗi câu hỏi:
- Câu hỏi phải bằng TIẾNG VIỆT
- Câu hỏi mở, yêu cầu giải thích chi tiết (không phải câu trả lời ngắn)
- Tiêu chí chấm điểm (rubric) - các ý chính cần có trong câu trả lời
- Thời gian ước tính để hoàn thành (phút)
- Điểm số (phù hợp với độ khó: dễ=10, trung bình=20, khó=30)

Định dạng JSON chính xác như sau:
{
  "type": "essay",
  "question": "Câu hỏi tự luận bằng tiếng Việt",
  "rubric": "Tiêu chí chấm điểm: 1) Ý chính thứ nhất, 2) Ý chính thứ hai, 3) Ý chính thứ ba",
  "estimatedTime": 15,
  "points": 20,
  "difficulty": "${difficulty}"
}

QUAN TRỌNG:
- Chỉ trả về JSON hợp lệ, KHÔNG có text khác
- Câu hỏi tự luận phải yêu cầu phân tích, đánh giá, không chỉ nhớ lại
- Rubric phải liệt kê 3-5 ý cụ thể cần tìm trong câu trả lời
- Tất cả câu hỏi phải dựa trên nội dung tài liệu
- SỬ DỤNG TIẾNG VIỆT cho câu hỏi và rubric

Ví dụ câu hỏi tốt:
- "Phân tích vai trò của... trong việc..."
- "So sánh và đối chiếu giữa... và..."
- "Đánh giá tác động của... đối với..."
- "Giải thích tại sao... lại quan trọng trong..."

Tài liệu:
${text.substring(0, 8000)}

Trả về response dưới dạng mảng JSON các đối tượng câu hỏi.`;
  } else if (type === 'mixed') {
    return `Dựa trên tài liệu sau, hãy tạo ${count} câu hỏi kết hợp giữa trắc nghiệm và tự luận (độ khó ${difficulty === 'easy' ? 'dễ' : difficulty === 'medium' ? 'trung bình' : 'khó'}).

Định dạng cho câu hỏi trắc nghiệm:
{
  "type": "multiple-choice",
  "question": "Câu hỏi trắc nghiệm bằng tiếng Việt",
  "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
  "correctAnswer": "A",
  "explanation": "Giải thích",
  "points": 10,
  "difficulty": "${difficulty}"
}

Định dạng cho câu hỏi tự luận:
{
  "type": "essay",
  "question": "Câu hỏi tự luận bằng tiếng Việt",
  "rubric": "Tiêu chí chấm điểm...",
  "estimatedTime": 15,
  "points": 20,
  "difficulty": "${difficulty}"
}

QUAN TRỌNG:
- Chỉ trả về mảng JSON hợp lệ
- Kết hợp cả hai loại câu hỏi (khoảng 60% trắc nghiệm, 40% tự luận)
- Tất cả câu hỏi dựa trên nội dung tài liệu
- SỬ DỤNG TIẾNG VIỆT cho tất cả câu hỏi

Tài liệu:
${text.substring(0, 8000)}

Trả về response dưới dạng mảng JSON các đối tượng câu hỏi.`;
  }

  throw new Error(`Invalid question type: ${type}`);
}

/**
 * Parse AI response thành array of questions
 * Robust error handling cho invalid JSON
 * @param {string} aiResponse - Response từ OpenAI
 * @param {string} questionType - Expected question type
 * @returns {Array} - Array of parsed questions
 */
function parseAIQuestions(aiResponse, questionType) {
  try {
    // Remove markdown code blocks nếu có
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON
    const questions = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array');
    }

    if (questions.length === 0) {
      throw new Error('AI returned empty questions array');
    }

    // Validate each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.type || !q.question) {
        throw new Error(`Question ${index + 1} missing required fields (type, question)`);
      }

      if (q.type === 'multiple-choice') {
        // Validate multiple-choice structure
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question ${index + 1}: multiple-choice must have at least 2 options`);
        }
        if (!q.correctAnswer) {
          throw new Error(`Question ${index + 1}: multiple-choice must have correctAnswer`);
        }

        // Normalize correctAnswer to single letter
        const answer = q.correctAnswer.trim().toUpperCase();
        if (!/^[A-Z]$/.test(answer)) {
          throw new Error(`Question ${index + 1}: correctAnswer must be a single letter (A-D)`);
        }

        return {
          type: 'multiple-choice',
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: answer,
          explanation: q.explanation ? q.explanation.trim() : '',
          points: q.points || 10,
          difficulty: q.difficulty || 'medium',
        };
      } else if (q.type === 'essay') {
        // Validate essay structure
        if (!q.rubric) {
          throw new Error(`Question ${index + 1}: essay must have rubric`);
        }

        return {
          type: 'essay',
          question: q.question.trim(),
          rubric: q.rubric.trim(),
          estimatedTime: q.estimatedTime || 15,
          points: q.points || 20,
          difficulty: q.difficulty || 'medium',
        };
      } else {
        throw new Error(
          `Question ${index + 1}: invalid type '${q.type}' (must be 'multiple-choice' or 'essay')`
        );
      }
    });

    return validatedQuestions;
  } catch (error) {
    // Re-throw với context
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse AI response as JSON: ${error.message}. Response: ${aiResponse.substring(0, 200)}...`
      );
    }
    throw error;
  }
}

/**
 * POST /api/assignment/generate
 * Generate assignment from uploaded document using AI
 * Instructor only
 */
router.post(
  '/generate',
  uploadLimiter,
  aiGenerationLimiter,
  auth.instructor,
  upload.single('document'),
  sanitizeUploadedFile,
  validateFileContent,
  async (req, res) => {
    try {
      // Debug logging
      console.log('[Assignment Gen] Request received');
      console.log('[Assignment Gen] Body:', req.body);
      console.log(
        '[Assignment Gen] File:',
        req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE'
      );

      const { title, description, questionType, questionCount, difficulty } = req.body;
      const file = req.file;

      // Validate input
      if (!questionType || !['multiple-choice', 'essay', 'mixed'].includes(questionType)) {
        console.error('[Assignment Gen] Invalid questionType:', questionType);
        return res.status(400).json({
          success: false,
          error: "questionType must be 'multiple-choice', 'essay', or 'mixed'",
        });
      }

      const count = parseInt(questionCount) || 5;
      if (count < 1 || count > 20) {
        return res.status(400).json({
          success: false,
          error: 'questionCount must be between 1 and 20',
        });
      }

      const diff = difficulty || 'medium';
      if (!['easy', 'medium', 'hard'].includes(diff)) {
        return res.status(400).json({
          success: false,
          error: "difficulty must be 'easy', 'medium', or 'hard'",
        });
      }

      // Step 1: Extract text from document
      console.log(`[Assignment Gen] Extracting text from ${file.originalname}...`);
      const { text, meta } = await extractText(file);

      // Validate extracted text
      const validation = validateExtractedText(text, 100);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
          wordCount: validation.wordCount,
        });
      }

      console.log(`[Assignment Gen] Extracted ${meta.wordCount} words from ${meta.type} file`);

      // Step 2: Upload file to blob storage
      let blobUrl = null;
      if (isBlobStorageConfigured()) {
        try {
          console.log('[Assignment Gen] Uploading to Azure Blob Storage...');
          blobUrl = await uploadToBlob(file.buffer, file.originalname, file.mimetype, req.user.id);
          console.log('[Assignment Gen] File uploaded:', blobUrl);
        } catch (blobError) {
          console.warn(
            '[Assignment Gen] Blob upload failed, continuing without:',
            blobError.message
          );
          // Continue without blob URL (not critical)
        }
      } else {
        console.warn('[Assignment Gen] Azure Blob Storage not configured, skipping upload');
      }

      // Step 3: Truncate text for AI processing
      const truncatedText = truncateForAI(text, 6000);

      // Step 4: Build prompt for OpenAI
      console.log(
        `[Assignment Gen] Building prompt for ${count} ${diff} ${questionType} questions...`
      );
      const prompt = buildQuestionGenerationPrompt(truncatedText, questionType, count, diff);

      // Step 5: Call OpenAI API
      console.log('[Assignment Gen] Calling OpenAI API...');

      if (!openai) {
        return res.status(500).json({
          success: false,
          error: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.',
        });
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4';
      const openaiStartTime = Date.now();

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert educator who creates high-quality assessment questions. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 8000,
        // Only include temperature for models that support it (o1, o4, 4o series don't support custom temperature)
        ...(model.startsWith('o1') || model.startsWith('o4') || model.includes('4o')
          ? {}
          : { temperature: 0.7 }),
      });

      const aiResponse = completion.choices[0]?.message?.content;
      const openaiDuration = Date.now() - openaiStartTime;

      // Validate AI response
      if (!aiResponse || aiResponse.trim() === '') {
        console.error('[Assignment Gen] Empty AI response received');
        return res.status(500).json({
          success: false,
          error: 'AI returned empty response. Please try again.',
          details:
            'OpenAI API returned no content. This may be due to content filtering or API issues.',
          finishReason: completion.choices[0]?.finish_reason,
        });
      }

      // Track OpenAI call
      trackOpenAICall('chat.completions.generate_assignment', openaiDuration, true, {
        model,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        questionType,
        questionCount: count,
        difficulty: diff,
      });

      console.log('[Assignment Gen] Received AI response, parsing...');
      console.log('[Assignment Gen] Response length:', aiResponse.length, 'characters');
      console.log('[Assignment Gen] Finish reason:', completion.choices[0]?.finish_reason);

      // Step 6: Parse AI response
      let questions;
      try {
        questions = parseAIQuestions(aiResponse, questionType);
        console.log(`[Assignment Gen] Successfully parsed ${questions.length} questions`);
      } catch (parseError) {
        console.error('[Assignment Gen] Failed to parse AI response:', parseError.message);
        return res.status(422).json({
          success: false,
          error: 'Failed to parse AI-generated questions',
          details: parseError.message,
          aiResponse: aiResponse.substring(0, 500), // Return partial response for debugging
        });
      }

      // Step 7: Create Assignment (draft)
      console.log('[Assignment Gen] Creating assignment...');
      const generationStartTime = Date.now();

      const assignment = await Assignment.create({
        instructorId: req.user.id,
        title: title || `Assignment from ${file.originalname}`,
        description: description || `Auto-generated from document with ${meta.wordCount} words`,
        sourceDocument: {
          filename: file.originalname,
          blobUrl: blobUrl,
          extractedText: text,
        },
        questionType: questionType,
        questions: questions,
        status: 'draft',
        settings: {
          allowAI: true,
          allowMultipleDrafts: true,
          timeLimit: null, // No time limit by default
          maxAttempts: 1,
        },
        generatedAt: new Date(),
      });

      console.log(`[Assignment Gen] Assignment created: ${assignment._id}`);

      // Track assignment generation
      const totalGenerationTime = Date.now() - generationStartTime;
      trackAssignmentGeneration({
        assignmentId: assignment._id.toString(),
        instructorId: req.user.id,
        questionType,
        documentType: meta.type,
        questionsGenerated: questions.length,
        generationTime: totalGenerationTime,
      });

      // Step 8: Return response
      res.status(201).json({
        success: true,
        assignmentId: assignment._id,
        questions: questions,
        meta: {
          sourceFile: file.originalname,
          wordCount: meta.wordCount,
          questionCount: questions.length,
          totalPoints: assignment.totalPoints,
          blobUrl: blobUrl,
        },
      });
    } catch (error) {
      console.error('[Assignment Gen] Error:', error);

      // Handle OpenAI API errors
      if (error.code === 'insufficient_quota') {
        return res.status(503).json({
          success: false,
          error: 'OpenAI API quota exceeded. Please try again later.',
        });
      }

      if (error.code === 'invalid_api_key') {
        return res.status(500).json({
          success: false,
          error: 'OpenAI API configuration error',
        });
      }

      // Generic error
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate assignment',
      });
    }
  },
  handleUploadError
);

/**
 * GET /api/assignment/list
 * Get assignments - Students see published, Instructors see their own
 * Authenticated users (Student or Instructor)
 */
router.get('/list', auth.authenticate, async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query based on role
    let query = {};

    if (req.user.role === 'student') {
      // Students only see published assignments
      query.status = 'published';
    } else if (req.user.role === 'instructor') {
      // Instructors see their own assignments (all statuses)
      query.instructorId = req.user.id;
      if (status && ['draft', 'published', 'archived'].includes(status)) {
        query.status = status;
      }
    }

    // Get assignments
    const assignments = await Assignment.find(query)
      .populate('instructorId', 'name email')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .select('-sourceDocument.extractedText') // Don't send full text
      .lean();

    // Add metadata
    const assignmentsWithMeta = assignments.map(a => ({
      ...a,
      questionCount: a.questions?.length || 0,
      totalPoints: a.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0,
    }));

    res.json({
      success: true,
      assignments: assignmentsWithMeta,
      count: assignmentsWithMeta.length,
    });
  } catch (error) {
    console.error('[Assignment List] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load assignments',
    });
  }
});

/**
 * GET /api/assignment/:id
 * Get single assignment by ID (for preview and edit)
 * Instructor only
 */
router.get('/:id', auth.instructor, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Verify ownership
    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this assignment',
      });
    }

    res.json({
      success: true,
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        questionType: assignment.questionType,
        questions: assignment.questions,
        totalPoints: assignment.totalPoints,
        timeLimit: assignment.timeLimit,
        deadline: assignment.deadline,
        status: assignment.status,
        allowAI: assignment.allowAI,
        createdAt: assignment.createdAt,
        publishedAt: assignment.publishedAt,
      },
    });
  } catch (error) {
    console.error('[Assignment Get] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load assignment',
    });
  }
});

/**
 * POST /api/assignment/:id/publish
 * Publish assignment to make it available for students
 * Instructor only
 */
router.post('/:id/publish', auth.instructor, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    // Find assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Verify ownership
    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to publish this assignment',
      });
    }

    // Validate assignment has questions
    if (!assignment.questions || assignment.questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish assignment without questions',
      });
    }

    // Update status to published
    assignment.status = 'published';
    assignment.publishedAt = new Date();
    await assignment.save();

    console.log(`✅ Assignment published: ${assignment._id} by instructor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assignment published successfully',
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        status: assignment.status,
        publishedAt: assignment.publishedAt,
        questionCount: assignment.questions.length,
      },
    });
  } catch (error) {
    console.error('[Assignment Publish] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish assignment',
    });
  }
});

/**
 * PUT /api/assignment/:id
 * Update existing assignment (title, description, questions, settings)
 * Instructor only
 */
router.put('/:id', auth.instructor, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { title, description, questions, settings, timeLimit, deadline } = req.body;

    // Find assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Verify ownership
    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this assignment',
      });
    }

    // Validate at least one question
    if (questions && questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Assignment must have at least one question',
      });
    }

    // Update fields if provided
    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (questions !== undefined) {
      assignment.questions = questions;
      // Recalculate total points
      assignment.totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }
    if (settings !== undefined) assignment.settings = { ...assignment.settings, ...settings };
    if (timeLimit !== undefined) assignment.timeLimit = timeLimit;
    if (deadline !== undefined) assignment.deadline = deadline;

    // Save updated assignment
    await assignment.save();

    console.log(`✅ Assignment updated: ${assignment._id} by instructor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        questionType: assignment.questionType,
        questionCount: assignment.questions.length,
        totalPoints: assignment.totalPoints,
        status: assignment.status,
        timeLimit: assignment.timeLimit,
        deadline: assignment.deadline,
      },
    });
  } catch (error) {
    console.error('[Assignment Update] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update assignment',
    });
  }
});

/**
 * POST /api/assignment/:id/unpublish
 * Unpublish (ẩn) bài tập - chuyển từ published → draft
 * Instructor only
 */
router.post('/:id/unpublish', auth.instructor, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Verify ownership
    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to unpublish this assignment',
      });
    }

    // Update status to draft
    assignment.status = 'draft';
    await assignment.save();

    console.log(`✅ Assignment unpublished: ${assignment._id} by instructor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assignment unpublished successfully',
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        status: assignment.status,
      },
    });
  } catch (error) {
    console.error('[Assignment Unpublish] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unpublish assignment',
    });
  }
});

/**
 * DELETE /api/assignment/:id
 * Xóa bài tập hoàn toàn
 * Instructor only
 */
router.delete('/:id', auth.instructor, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Verify ownership
    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this assignment',
      });
    }

    // Delete assignment
    await Assignment.findByIdAndDelete(assignmentId);

    console.log(`✅ Assignment deleted: ${assignmentId} by instructor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('[Assignment Delete] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete assignment',
    });
  }
});

module.exports = router;
