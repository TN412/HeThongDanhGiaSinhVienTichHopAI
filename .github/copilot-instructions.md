# AI-Integrated Student Assessment System - Hệ Thống Tạo Bài Tập và Đánh Giá Năng Lực Sinh Viên Tích Hợp AI

## Tổng Quan Dự Án (Project Overview)

**HỆ THỐNG HOÀN THIỆN** - Đầy đủ tính năng từ tạo bài tập tự động đến đánh giá AI skill score phức tạp với WISDOM framework.

Đây là **hệ thống tạo bài tập và đánh giá năng lực sinh viên** cho phép sử dụng AI trong quá trình học tập. Hệ thống có 4 chức năng cốt lõi:

1. **Tạo Bài Tập Tự Động** - Giảng viên upload tài liệu (PDF, DOCX, TXT) và AI tự động tạo câu hỏi trắc nghiệm hoặc tự luận
2. **Hỗ Trợ AI Trong Quá Trình Làm Bài** - Sinh viên được phép hỏi AI bất cứ lúc nào, tất cả tương tác được ghi log và phân tích chất lượng
3. **Tự Động Chấm Điểm & Đánh Giá AI Skill** - Hệ thống tự động chấm trắc nghiệm và tính điểm kỹ năng sử dụng AI với 8 tiêu chí (WISDOM, Dependency, Rubric, Timeline)
4. **Dashboard Phân Tích** - Giảng viên xem kết quả, log tương tác AI, và báo cáo đánh giá chi tiết

**Mục tiêu chính**: Đánh giá cả kiến thức chuyên môn LẪN khả năng sử dụng AI hiệu quả của sinh viên.

### Kiến Trúc Hệ Thống (System Architecture)

- **Frontend** (`frontend/`): React 18 + Vite - 20+ pages hoàn thiện cho instructor và student
- **Backend** (`backend/src/`): Node.js + Express + Mongoose ODM - 10 route modules + 5 models
- **Database**: MongoDB Atlas (Azure Southeast Asia) - lưu bài tập, bài làm, log AI, điểm số
- **File Storage**: Azure Blob Storage (optional) - tài liệu PDF/DOCX/TXT
- **Auth**: JWT tokens (access 15m + refresh 7d, httpOnly cookies)
- **AI Service**: Azure OpenAI (o4-mini deployment) hoặc OpenAI API (GPT-4)
- **Document Processing**: `pdf-parse` (PDF), `mammoth` (DOCX)
- **AI Assessment**: WISDOM framework + Dependency analysis + Rubric scoring + Timeline anomaly detection
- **Deployment**: Development ready, Azure deployment planned

## Luồng Dữ Liệu Chính (Critical Data Flow)

**Quy Trình Tạo Bài Tập (Assignment Creation):**

```
Giảng Viên Login → Upload Tài Liệu (PDF/DOCX/TXT) → POST /api/assignment/generate
    ↓
Extract Text → Gửi đến OpenAI với Prompt Template
    ↓
AI Tạo Câu Hỏi (Trắc Nghiệm HOẶC Tự Luận) → Giảng Viên Review/Sửa
    ↓
Giảng Viên Publish Bài Tập → Sinh Viên Có Thể Làm Bài
```

**Quy Trình Làm Bài (Student Workflow):**

```
Sinh Viên Login → Chọn Bài Tập → AssignmentSubmission Created (status: 'draft')
    ↓
Sinh Viên Làm Bài + Hỏi AI Bất Cứ Lúc Nào → POST /api/ai/chat → Log Saved
    ↓
Lưu Nháp Nhiều Lần → Khi Sẵn Sàng → Submit Bài Làm
    ↓
Hệ Thống Tự Động Chấm (Multiple-Choice) + Tính AI Skill Score
    ↓
Sinh Viên Xem Kết Quả + Feedback | Giảng Viên Xem Dashboard + Log AI
```

**Quy Trình Chấm Điểm (Grading Flow):**

```
Auto-Grading (Multiple-Choice): So sánh đáp án → Tính điểm tức thì
    ↓
Manual Grading (Essay): Giảng viên chấm theo rubric + xem AI suggestions
    ↓
AI Skill Scoring: Phân tích log → Prompt quality + Independence level + Iteration pattern
    ↓
Final Score = Content Score (70%) + AI Skill Score (30%)
```

**Lưu Ý Quan Trọng:**

- Sinh viên CÓ THỂ sử dụng AI tự do (không bị khóa màn hình)
- Chỉ TRACK hành vi (tab switch, thời gian làm bài) chứ không chặn
- Cho phép lưu nháp và quay lại làm tiếp nhiều lần
- Deadline linh hoạt (không time limit cứng nhắc như thi)

## Database Schema Patterns

**Assignment Model (Bài Tập):**

```javascript
{
  instructorId: ObjectId (required, ref: 'User'),
  title: String (required, 3-200 chars),
  description: String (max 2000 chars),
  sourceDocument: {
    filename: String,
    blobUrl: String,      // Azure Blob Storage URL (optional)
    extractedText: String // Cached for regeneration
  },
  questionType: String (required),   // 'multiple-choice' | 'essay' | 'mixed'
  questions: [{
    type: String (required),         // 'multiple-choice' | 'essay'
    question: String (required),
    options: [String],               // 2-6 options for multiple-choice
    correctAnswer: String,           // 'A', 'B', 'C', 'D' for multiple-choice
    explanation: String,
    rubric: String,                  // Essay grading criteria
    points: Number (required, min: 0),
    difficulty: String,              // 'easy' | 'medium' | 'hard'
    estimatedTime: Number            // minutes
  }],
  status: String (required),         // 'draft' | 'published' | 'archived'
  settings: {
    timeLimit: Number,               // minutes, null = no limit
    allowAI: Boolean (default: true),
    allowMultipleDrafts: Boolean (default: true),
    maxAttempts: Number,
    deadline: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

**AssignmentSubmission Model (Bài Làm):**

```javascript
{
  studentId: ObjectId (required, ref: 'User'),
  assignmentId: ObjectId (required, ref: 'Assignment'),
  attemptNumber: Number (min: 1),
  answers: [{
    questionId: ObjectId (required),
    answer: String,
    isCorrect: Boolean,              // For multiple-choice
    pointsEarned: Number (min: 0),
    aiInteractionCount: Number,
    instructorFeedback: String,
    gradedAt: Date,
    gradedBy: ObjectId (ref: 'User')
  }],
  status: String (required),         // 'draft' | 'submitted' | 'pending_grading' | 'graded'
  totalScore: Number (min: 0),
  aiSkillScore: Number (0-10),
  contentScore: Number (0-10),
  finalScore: Number (0-10),
  feedback: String,                  // Overall instructor feedback
  startedAt: Date (required),
  submittedAt: Date,
  aiInteractionSummary: {
    totalPrompts: Number,
    avgPromptLength: Number,
    contextProvidedRate: Number (0-1),
    independenceLevel: Number (0-1),
    promptQuality: Number (0-100)
  }
}
```

**AI_Log Model (Log Tương Tác):**

```javascript
{
  submissionId: ObjectId (required, ref: 'AssignmentSubmission'),
  assignmentId: ObjectId (required, ref: 'Assignment'),
  studentId: ObjectId (required, ref: 'User'),
  questionId: ObjectId,
  questionText: String (max 2000 chars), // For copy-paste detection
  prompt: String (required, max 5000 chars),
  response: String (required, max 10000 chars),
  promptType: String,                // 'clarifying' | 'expanding' | 'debugging' | 'code_generation' | etc.
  contextProvided: Boolean (required),
  advancedQualityAssessment: {
    score: Number (1-5),
    level: String,                   // 'Xuất sắc' | 'Tốt' | 'Đạt' | 'Yếu' | 'Kém'
    factors: {
      hasGoal: Boolean,
      hasConstraints: Boolean,
      hasContext: Boolean,
      hasIteration: Boolean,
      showsThinking: Boolean,
      isSpecific: Boolean
    },
    details: String
  },
  mutationMetadata: {
    isRefinement: Boolean,
    isDuplicate: Boolean,
    previousPromptId: ObjectId,
    similarity: Number (0-1),
    mutationType: String
  },
  timestamp: Date (required),
  promptTokens: Number (required, min: 0),
  completionTokens: Number (required, min: 0),
  totalTokens: Number,
  responseTime: Number,              // milliseconds
  model: String,
  instructorLabel: String           // 'good' | 'bad' | null (for ML training)
}
```

**User Model:**

```javascript
{
  name: String (required, 2-100 chars),
  email: String (required, unique, valid email),
  password: String (required, hashed with bcrypt),
  role: String (required),          // 'student' | 'instructor'
  studentId: String,                // Only for students
  department: String,               // Only for instructors
  createdAt: Date,
  lastLogin: Date
}
```

**Submission Status State Machine:**

```
'draft' → 'submitted' → 'pending_grading' (if has essay) → 'graded'
```

## Developer Workflows

### Initial Setup

```bash
# Backend (Node.js + Express)
cd backend
npm install express mongoose jsonwebtoken bcryptjs cors dotenv openai multer @azure/storage-blob pdf-parse mammoth
npm install -D nodemon
cp .env.example .env  # Add OPENAI_API_KEY, MONGODB_URI, JWT_SECRET, AZURE_STORAGE_CONNECTION_STRING
npm run dev           # Runs on localhost:5000

# Frontend (React + Vite)
cd frontend
npm create vite@latest . -- --template react
npm install axios react-router-dom
npm run dev           # Runs on localhost:5173
```

### Running Tests

```bash
# Backend tests (includes API mocking)
cd backend
npm test

# Frontend tests
cd frontend
npm test -- AssignmentView.test.jsx
```

### Database Setup (MongoDB)

```bash
# Create indexes (backend/scripts/setup-indexes.js)
cd backend
node scripts/setup-indexes.js

# Seed initial data (optional)
node scripts/seed.js
```

**Critical Indexes:**

```javascript
// AI_Log collection
db.ai_logs.createIndex({ submissionId: 1, timestamp: 1 });
db.ai_logs.createIndex({ studentId: 1, assignmentId: 1 });
db.ai_logs.createIndex({ questionId: 1 });

// AssignmentSubmission collection
db.assignment_submissions.createIndex({
  studentId: 1,
  assignmentId: 1,
  attemptNumber: 1,
});
db.assignment_submissions.createIndex({ status: 1 });
db.assignment_submissions.createIndex({ submittedAt: 1 });

// Assignment collection
db.assignments.createIndex({ instructorId: 1, status: 1 });
db.assignments.createIndex({ deadline: 1 });
```

## Project-Specific Conventions

### API Route Organization

**Assignment Routes (Bài Tập) - `backend/src/routes/assignment.js`:**

- `POST /api/assignment/generate` - Upload tài liệu + AI tạo câu hỏi (instructor only)
- `POST /api/assignment` - Tạo bài tập thủ công
- `GET /api/assignment/list` - Danh sách bài tập (filter: instructorId, status, deadline)
- `GET /api/assignment/:id` - Xem chi tiết bài tập
- `PUT /api/assignment/:id` - Chỉnh sửa bài tập draft
- `POST /api/assignment/:id/publish` - Publish bài tập cho sinh viên
- `POST /api/assignment/:id/archive` - Archive bài tập
- `POST /api/assignment/:id/regenerate` - Tạo lại câu hỏi từ cùng tài liệu
- `DELETE /api/assignment/:id` - Delete bài tập draft (nếu không có submission)

**Submission Routes (Bài Làm) - `backend/src/routes/submission.js`:**

- `POST /api/submission/start` - Bắt đầu làm bài (tạo submission với status='draft')
- `GET /api/submission/:id` - Lấy bài làm + populate assignment questions
- `PUT /api/submission/:id` - Lưu nháp (update answers, auto-save)
- `POST /api/submission/:id/submit` - Nộp bài (chuyển status='submitted', tự động chấm MC)
- `POST /api/submission/:id/grade` - Giảng viên chấm bài tự luận (batch or single question)
- `GET /api/submission/instructor/all` - Danh sách tất cả submissions (instructor view)
- `GET /api/submission/student/my-submissions` - Danh sách bài làm của sinh viên

**AI Chat Routes - `backend/src/routes/ai.js`:**

- `POST /api/ai/chat` - Sinh viên hỏi AI + log tương tác với quality assessment
  - Body: `{ submissionId, questionId, prompt, context }`
  - Response: `{ message, suggestedActions, promptQuality, tokensUsed }`
  - Features: Rate limiting (20 prompts/30min), context-aware system prompt, real-time quality feedback
- Note: AI_Log.createWithClassification() tự động classify prompt type + quality

**AI Assessment Routes - `backend/src/routes/ai_assessment.js`:**

- `GET /api/ai-assessment/submission/:id` - Full 8-part assessment report (WISDOM + Dependency + Rubric + Timeline)
- `GET /api/ai-assessment/submission/:id/summary` - Quick metrics overview
- `GET /api/ai-assessment/submission/:id/timeline` - Timeline data with anomalies
- `GET /api/ai-assessment/submission/:id/prompts/top` - Best and worst prompts
- `GET /api/ai-assessment/submission/:id/wisdom` - WISDOM framework scores only
- `GET /api/ai-assessment/submission/:id/dependency` - Dependency analysis only
- `GET /api/ai-assessment/submission/:id/rubric` - Rubric scores only
- `GET /api/ai-assessment/submission/:id/warnings` - Warnings and recommendations
- `GET /api/ai-assessment/assignment/:assignmentId/overview` - Overview for all submissions in assignment

**Analytics & Logs Routes - `backend/src/routes/logs.js` & `backend/src/routes/analytics.js`:**

- `GET /api/logs/submission/:submissionId` - Tất cả log AI cho một bài làm (instructor)
- `POST /api/logs/label` - Instructor label prompt as good/bad for ML training
- `GET /api/logs/export` - Export logs to CSV/JSON for ML pipeline
- `GET /api/analytics/assignment/:id` - Thống kê bài tập (avg score, completion rate, AI usage patterns)
- `GET /api/analytics/student/:id` - Thống kê sinh viên (progress, AI skill trend over time)

**Auth Routes - `backend/src/routes/auth.js`:**

- `POST /api/auth/student/register` - Student registration
- `POST /api/auth/instructor/register` - Instructor registration
- `POST /api/auth/student/login` - Student login (returns JWT access + refresh tokens)
- `POST /api/auth/instructor/login` - Instructor login
- `POST /api/auth/refresh` - Refresh access token using refresh token (httpOnly cookie)
- `POST /api/auth/logout` - Logout (clear refresh token cookie)
- `GET /api/auth/me` - Get current user profile

**Health Check - `backend/src/routes/health.js`:**

- `GET /api/health` - Health check endpoint (database connection, OpenAI status)

### Document Upload & Question Generation Pattern

**Located in `backend/routes/exam.js`:**

```javascript
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post(
  "/api/assignment/generate",
  auth.instructor,
  upload.single("document"),
  async (req, res) => {
    const { questionType, questionCount, difficulty } = req.body;
    const file = req.file;

    // 1. Extract text from uploaded document
    let extractedText;
    if (file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text;
    } else if (file.mimetype.includes("wordprocessingml")) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    } else {
      extractedText = file.buffer.toString("utf-8");
    }

    // 2. Upload to Azure Blob Storage for archival
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    );
    const containerClient =
      blobServiceClient.getContainerClient("exam-documents");
    const blobName = `${req.user.id}/${Date.now()}_${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(file.buffer, file.size);

    // 3. Generate questions with OpenAI
    const prompt = buildQuestionGenerationPrompt(
      extractedText,
      questionType,
      questionCount,
      difficulty,
    );
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    // 4. Parse AI response into structured questions
    const questions = parseAIQuestions(
      aiResponse.choices[0].message.content,
      questionType,
    );

    // 5. Create draft assignment
    const assignment = await Assignment.create({
      instructorId: req.user.id,
      title: `Bài tập từ ${file.originalname}`,
      description: "Được tạo tự động từ tài liệu",
      sourceDocument: {
        filename: file.originalname,
        blobUrl: blockBlobClient.url,
        extractedText,
      },
      questionType,
      questions,
      allowAI: true, // Mặc định cho phép AI
      allowMultipleDrafts: true,
      status: "draft",
    });

    res.json({ assignmentId: assignment._id, questions });
  },
);

// Helper: Build OpenAI prompt for question generation
function buildQuestionGenerationPrompt(text, type, count, difficulty) {
  if (type === "multiple-choice") {
    return `Based on the following document, generate ${count} ${difficulty}-level multiple-choice questions.
For each question, provide:
- The question text
- 4 options (A, B, C, D)
- The correct answer
- Brief explanation

Format as JSON array.

Document:
${text.substring(0, 8000)} // Limit context to avoid token limits
`;
  } else if (type === "essay") {
    return `Based on the following document, generate ${count} ${difficulty}-level essay questions.
For each question, provide:
- The question text
- Suggested rubric for grading (key points to look for)
- Estimated time to complete

Format as JSON array.

Document:
${text.substring(0, 8000)}
`;
  }
}
```

### AI Chat Integration Pattern (Hỗ Trợ Sinh Viên)

**LUÔN log TRƯỚC KHI trả response + Advanced Quality Assessment:**

```javascript
// backend/src/routes/ai.js
router.post(
  "/chat",
  auth.authenticate,
  auth.student,
  aiChatLimiter,
  async (req, res) => {
    const { prompt, submissionId, questionId, context } = req.body;

    // 1. Rate limiting check (20 prompts per 30 minutes per submission)
    const rateLimit = checkRateLimit(submissionId);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${Math.ceil((rateLimit.resetTime - Date.now()) / 60000)} minutes.`,
        resetTime: rateLimit.resetTime,
      });
    }

    // 2. Validate submission exists và chưa submit
    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });
    if (submission.status === "submitted")
      return res.status(403).json({ error: "Cannot use AI after submission" });

    // 3. Check xem assignment có cho phép AI không
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment.settings?.allowAI)
      return res
        .status(403)
        .json({ error: "AI not allowed for this assignment" });

    // 4. Get question text for copy-paste detection (NEW)
    let questionText = null;
    if (questionId) {
      const question = assignment.questions.id(questionId);
      if (question) {
        questionText = question.question; // Store for similarity comparison
      }
    }

    // 5. Build context-aware system prompt
    let systemPrompt = `You are a helpful tutor for students. Your role is to guide thinking, not provide direct answers.
- Ask clarifying questions to understand what the student needs
- Break down complex problems into steps
- Provide hints and examples, not full solutions
- Encourage independent problem-solving`;

    if (questionId && questionText) {
      systemPrompt += `\n\nContext: Student is working on: "${questionText}"`;
    }

    // 6. Call OpenAI (Azure OpenAI or OpenAI)
    const startTime = Date.now();
    const aiResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 5000,
    });

    const response = aiResponse.choices[0].message.content;
    const responseTime = Date.now() - startTime;

    // 7. CRITICAL: Log interaction với ADVANCED QUALITY CLASSIFICATION
    // AI_Log.createWithClassification() automatically:
    // - Classifies promptType (clarifying, expanding, debugging, etc.)
    // - Assesses prompt quality (score 1-5, factors like hasGoal, hasContext, etc.)
    // - Detects copy-paste (similarity with questionText > 70% = penalty)
    // - Detects mutations (refinement vs duplicate)
    const logEntry = await AI_Log.createWithClassification({
      submissionId,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      questionId,
      questionText, // NEW: For copy-paste detection
      prompt,
      response,
      contextProvided: !!context,
      timestamp: new Date(),
      promptTokens: aiResponse.usage.prompt_tokens,
      completionTokens: aiResponse.usage.completion_tokens,
      totalTokens: aiResponse.usage.total_tokens,
      responseTime,
      model: aiResponse.model,
    });

    // 8. Cập nhật interaction count
    if (questionId) {
      await AssignmentSubmission.updateOne(
        { _id: submissionId, "answers.questionId": questionId },
        { $inc: { "answers.$.aiInteractionCount": 1 } },
      );
    }

    // 9. Return với real-time feedback về prompt quality
    res.json({
      message: response,
      promptQuality: logEntry.advancedQualityAssessment, // Score, level, factors, details
      tokensUsed: aiResponse.usage.total_tokens,
      remaining: rateLimit.remaining,
      suggestedActions: generateSuggestedActions(logEntry),
    });
  },
);

// Helper: Generate suggested actions based on prompt quality
function generateSuggestedActions(logEntry) {
  const suggestions = [];
  const factors = logEntry.advancedQualityAssessment?.factors || {};

  if (!factors.hasGoal) {
    suggestions.push(
      'Try stating your goal clearly: "I want to understand..."',
    );
  }
  if (!factors.hasContext) {
    suggestions.push("Provide context: What have you tried? What's confusing?");
  }
  if (!factors.isSpecific) {
    suggestions.push(
      "Be more specific: Which part exactly do you need help with?",
    );
  }
  if (logEntry.advancedQualityAssessment?.score < 3) {
    suggestions.push(
      "💡 Your prompt could be improved. See the quality assessment above.",
    );
  }

  return suggestions;
}
```

### Auto-Grading & Advanced AI Assessment Pattern

**Located in `backend/src/routes/submission.js` + `backend/src/utils/ai_advanced_assessment.js`:**

**Step 1: Submit & Auto-Grade Multiple-Choice:**

```javascript
router.post(
  "/:id/submit",
  auth.authenticate,
  auth.student,
  async (req, res) => {
    const submission = await AssignmentSubmission.findById(req.params.id);
    const assignment = await Assignment.findById(submission.assignmentId);

    // 1. Auto-grade multiple-choice questions
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (let answer of submission.answers) {
      const question = assignment.questions.id(answer.questionId);
      maxPossibleScore += question.points;

      if (question.type === "multiple-choice") {
        answer.isCorrect = answer.answer === question.correctAnswer;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        totalScore += answer.pointsEarned;
      } else {
        // Essay questions need manual grading
        answer.pointsEarned = 0;
      }
    }

    // 2. Generate COMPREHENSIVE 8-Part AI Assessment
    const logs = await AI_Log.find({ submissionId: submission._id })
      .sort({ timestamp: 1 })
      .lean();
    const assessment = await generateComprehensiveAssessment(logs); // From ai_advanced_assessment.js

    // Assessment includes:
    // - summary: { totalPrompts, dependencyScore, riskLevel, overallQuality }
    // - dependencyAnalysis: { score (0-100), level, patterns with counts }
    // - rubricScores: { promptEngineering, independence, creativity, thinking, criticalAnalysis }
    // - wisdomScore: { inquiry, disruptiveThinking, mindfulness, overall, interpretation }
    // - timeline: { segments, anomalies, avgPromptsPerSegment }
    // - topPrompts: { best[5], worst[5] }
    // - warningsAndRecommendations: { warnings[], recommendations[], thinkingErrors[] }
    // - classifiedLogs: [...]
    // - basicStats: { totalPrompts, uniquePrompts, totalWorkingTime, diversificationScore, ... }

    // 3. Calculate AI Skill Score from Dependency Analysis
    // Lower dependency = Higher skill (Independence = 100 - Dependency)
    const aiSkillScore = (100 - assessment.dependencyAnalysis.score) / 10; // Scale to 0-10

    // 4. Calculate content score
    const contentScore = (totalScore / maxPossibleScore) * 10; // Scale to 0-10

    // 5. Calculate final score (70% content + 30% AI skill)
    const AI_SKILL_WEIGHT =
      parseFloat(process.env.AI_SKILL_SCORE_WEIGHT) || 0.3;
    const finalScore =
      contentScore * (1 - AI_SKILL_WEIGHT) + aiSkillScore * AI_SKILL_WEIGHT;

    // 6. Update submission
    submission.status = assignment.questions.some((q) => q.type === "essay")
      ? "pending_grading"
      : "graded";
    submission.totalScore = totalScore;
    submission.contentScore = contentScore;
    submission.aiSkillScore = aiSkillScore;
    submission.finalScore = finalScore;
    submission.submittedAt = new Date();
    submission.aiInteractionSummary = {
      totalPrompts: assessment.basicStats.totalPrompts,
      avgPromptLength:
        logs.reduce((sum, l) => sum + l.prompt.length, 0) / logs.length,
      contextProvidedRate:
        logs.filter((l) => l.contextProvided).length / logs.length,
      independenceLevel: (100 - assessment.dependencyAnalysis.score) / 100,
      promptQuality: assessment.summary.overallQuality,
    };
    await submission.save();

    res.json({
      success: true,
      submission,
      assessment: {
        aiSkillScore,
        contentScore,
        finalScore,
        dependencyLevel: assessment.dependencyAnalysis.level,
        wisdomOverall: assessment.wisdomScore.overall,
        topWarnings: assessment.warningsAndRecommendations.warnings.slice(0, 3),
      },
    });
  },
);
```

**Step 2: Advanced AI Assessment (8-Part Framework):**
Located in `backend/src/utils/ai_advanced_assessment.js`:

1. **WISDOM Framework** (`wisdom_mapper.js`):
   - **Inquiry (0-10)**: Follow-up questions, verification, critical thinking
   - **Disruptive Thinking (0-10)**: Unique prompts, diversity, perspective shifts
   - **Mindfulness (0-10)**: Penalties for writeForMe, copyPaste, lackContext patterns

2. **Dependency Analysis** (0-100, higher = more dependent):
   - Detects 5 patterns: writeForMe (30%), tooFast (25%), copyPaste (20%), lackOfInquiry (15%), noIteration (10%)
   - Uses `prompt_classifier.js` to detect anti-patterns
   - Copy-paste detection: Jaccard similarity > 70% with questionText

3. **Rubric Scoring** (1-5 scale, 5 criteria):
   - Prompt Engineering: Goal clarity, specificity
   - Independence: Self-sufficiency, critical evaluation
   - Creativity: Novel approaches, problem reframing
   - Thinking Process: Iterative refinement, depth
   - Critical Analysis: Verification, cross-checking

4. **Timeline Analysis**:
   - Time segments (10-minute buckets)
   - Anomaly detection (bursts, long gaps)
   - Working pattern analysis

5. **Top Prompts**: Best 5 and Worst 5 by quality score

6. **Warnings & Recommendations**: Auto-generated based on detected patterns

7. **Classified Logs**: All logs with quality assessments

8. **Basic Stats**: Total prompts, unique prompts, working time, diversification, refinement count

**Key Utilities:**

- `prompt_classifier.js`:
  - `assessPromptQuality(prompt, context)`: Returns score 1-5, level, factors, details
  - `calculateTextSimilarity(text1, text2)`: Jaccard similarity for copy-paste detection
  - `detectDependencyPatterns(logs)`: Returns pattern counts
- `wisdom_mapper.js`:
  - `calculateWisdomScores(logs)`: Returns inquiry, disruptive, mindfulness scores
  - `generateWisdomInterpretation(scores)`: Human-readable feedback

````

### Frontend Assignment View Implementation
**Use React Context for assignment state + AI chat:**
```jsx
// frontend/contexts/AssignmentContext.jsx
const AssignmentContext = createContext();

export const AssignmentProvider = ({ children }) => {
  const [submission, setSubmission] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // Auto-save draft mỗi 30 giây
  useEffect(() => {
    if (!submission || submission.status !== 'draft') return;

    const autoSave = setInterval(async () => {
      await api.put(`/submission/${submission._id}`, {
        answers: submission.answers
      });
      console.log('Draft auto-saved');
    }, 30000);

    return () => clearInterval(autoSave);
  }, [submission]);

  // Track tab switches (nhẹ nhàng, không chặn)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && submission) {
        api.post(`/analytics/track-event`, {
          submissionId: submission._id,
          eventType: 'tab_switch',
          timestamp: new Date()
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [submission]);

  return (
    <AssignmentContext.Provider value={{
      submission,
      setSubmission,
      currentQuestionIndex,
      setCurrentQuestionIndex,
      aiChatOpen,
      setAiChatOpen
    }}>
      {children}
    </AssignmentContext.Provider>
  );
};
````

**AI Chat Component:**

```jsx
// frontend/components/AIChat.jsx
function AIChat({ submissionId, questionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/ai/chat", {
        prompt: input,
        submissionId,
        questionId,
        context: getCurrentQuestionContext(), // Tự động gửi context
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.message,
          tokensUsed: response.data.tokensUsed,
        },
      ]);
    } catch (error) {
      alert("AI Error: " + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-panel">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
            {msg.tokensUsed && (
              <span className="tokens">🪙 {msg.tokensUsed} tokens</span>
            )}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Hỏi AI về câu hỏi này..."
        disabled={loading}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? "Đang xử lý..." : "Gửi"}
      </button>
      <div className="ai-tips">
        💡 Tips: Mô tả rõ vấn đề bạn gặp để AI hỗ trợ tốt hơn!
      </div>
    </div>
  );
}
```

### Frontend Pages Structure (20+ Complete Pages)

**Instructor Pages:**

1. **InstructorDashboard.jsx** - Main dashboard với submissions table
   - View all submissions with scores (totalScore, aiSkillScore, finalScore)
   - Filter by assignment, status, date
   - Navigation buttons: 🧠 AI Assessment, ✍️ Grading
   - Shows AI usage summary (totalPrompts, independence level)

2. **AssignmentCreatePage.jsx** - Create assignments with AI generation
   - Upload document (PDF/DOCX/TXT)
   - Configure question type, count, difficulty
   - AI generates questions
   - Review/edit generated questions
   - Publish or save as draft

3. **InstructorAssignmentListPage.jsx** - View all assignments
   - List with status (draft/published/archived)
   - Actions: Edit, Publish, Regenerate, Archive, Delete
   - Shows submission count per assignment

4. **AssignmentPreviewPage.jsx** - Preview assignment before publishing
5. **GradingPage.jsx** - Manual grading for essay questions with batch support
6. **AIAssessmentReport.jsx** - Comprehensive 8-part assessment with visualizations
7. **AILogsViewerPage.jsx** - View all AI interaction logs

**Student Pages:** 8. **StudentAssignmentListPage.jsx** - Browse available assignments 9. **AssignmentTakingPage.jsx** - Take assignment with AI chat sidebar 10. **StudentResultsPage.jsx** - View results after submission 11. **MySubmissionsPage.jsx** - Student's submission history

**Auth Pages:** LoginPage, RegisterPage, InstructorRegisterPage

### Instructor Dashboard Features

**Located in `frontend/src/pages/InstructorDashboard.jsx`:**

```jsx
// Dashboard tổng quan
<DashboardOverview>
  <StatCard title="Bài Tập Đã Tạo" value={assignments.length} />
  <StatCard title="Sinh Viên Đã Nộp" value={submissions.filter(s => s.status === 'submitted').length} />
  <StatCard title="Cần Chấm Bài Tự Luận" value={pendingGrading} />
  <StatCard title="Avg AI Skill Score" value={avgAISkillScore} />
</DashboardOverview>

// Bảng chi tiết submissions
<SubmissionTable>
  <Filters>
    <Select onChange={setSelectedAssignment}>Chọn Bài Tập</Select>
    <Select onChange={setStatusFilter}>Trạng Thái</Select>
    <Input type="date" onChange={setDateFilter}>Deadline</Input>
  </Filters>

  {submissions.map(sub => (
    <SubmissionRow key={sub._id}>
      <Student>{sub.studentName}</Student>
      <Assignment>{sub.assignmentTitle}</Assignment>
      <Score>
        <div>Content: {sub.totalScore}/{sub.assignment.totalPoints}</div>
        <div>AI Skill: {sub.aiSkillScore}/100</div>
        <div className="final">Final: {sub.finalScore}/100</div>
      </Score>
      <AIUsage>
        {sub.aiInteractionSummary.totalPrompts} prompts
        <Badge color={sub.aiInteractionSummary.independenceLevel > 0.7 ? 'green' : 'orange'}>
          {Math.round(sub.aiInteractionSummary.independenceLevel * 100)}% độc lập
        </Badge>
      </AIUsage>
      <Actions>
        <Button onClick={() => viewDetails(sub._id)}>Xem Chi Tiết</Button>
        <Button onClick={() => viewAILogs(sub._id)}>Xem Log AI</Button>
        {sub.hasEssayQuestions && <Button onClick={() => gradeEssay(sub._id)}>Chấm Tự Luận</Button>}
      </Actions>
    </SubmissionRow>
  ))}
</SubmissionTable>

// AI Log Viewer
<AILogViewer submissionId={selectedSubmission}>
  <Timeline>
    {logs.map(log => (
      <LogEntry key={log._id}>
        <Time>{formatTime(log.timestamp)}</Time>
        <Question>{log.questionId && `Câu ${getQuestionNumber(log.questionId)}`}</Question>
        <Prompt className={classifyQuality(log.prompt)}>
          📝 {log.prompt}
          {log.contextProvided && <Badge>✅ Có context</Badge>}
        </Prompt>
        <Response collapsed>
          🤖 {log.response}
        </Response>
        <Metadata>
          Type: {log.promptType} |
          Tokens: {log.promptTokens + log.completionTokens} |
          Response: {log.responseTime}ms
        </Metadata>
      </LogEntry>
    ))}
  </Timeline>

  <AIAnalysis>
    <h3>Phân Tích Sử Dụng AI</h3>
    <Chart type="bar" data={promptQualityDistribution} />
    <Insight>
      Sinh viên này có {logs.length} lượt hỏi AI.
      Prompt chất lượng cao: {highQualityPrompts}/{logs.length}
      Mức độ độc lập: {independenceLevel}%
    </Insight>
  </AIAnalysis>
</AILogViewer>
```

**Key Instructor Actions:**

- ✅ Xem tất cả bài làm với điểm số tổng hợp
- ✅ Filter theo bài tập, sinh viên, trạng thái, deadline
- ✅ Xem chi tiết log AI của từng sinh viên
- ✅ Chấm bài tự luận với rubric suggestions từ AI
- ✅ Export logs + điểm số ra CSV/Excel
- ✅ Gửi feedback cho sinh viên
- ✅ Xem analytics: AI usage trends, score distribution

## Environment Variables

**Required in `backend/.env`:**

```bash
# OpenAI (Azure OpenAI Service recommended for production)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
# For Azure OpenAI:
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=...
# AZURE_OPENAI_DEPLOYMENT=gpt-4

# MongoDB Atlas (Azure region)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_assessment_system?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=use-openssl-rand-base64-32-to-generate
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Assignment Settings
AUTO_SAVE_INTERVAL_SECONDS=30
DEFAULT_DEADLINE_DAYS=7
AI_SKILL_SCORE_WEIGHT=0.3  # 30% của final score

# CORS
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Azure Blob Storage (for document uploads)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER=assignment-documents

# File Upload Limits
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,docx,txt

# Azure App Insights (production monitoring)
APPINSIGHTS_INSTRUMENTATIONKEY=your-key-here
```

**Azure Deployment Secrets (GitHub Actions or Azure Key Vault):**

- `AZURE_WEBAPP_PUBLISH_PROFILE`
- `MONGODB_URI` (production connection string)
- `OPENAI_API_KEY` (or Azure OpenAI credentials)

## Common Pitfalls (Những Lỗi Thường Gặp)

1. **Document Text Extraction**: PDF/DOCX parsing có thể fail với ảnh scan - dùng Azure Document Intelligence OCR
2. **OpenAI Token Limits**: GPT-4 có giới hạn 8K-128K tokens - truncate hoặc chunk long documents
3. **File Upload Security**: Validate file types ở CẢ frontend VÀ backend - check magic bytes không chỉ extension
4. **AI Response Parsing**: AI không luôn trả về valid JSON - cần robust error handling + fallback to manual
5. **Auto-Save Race Conditions**: Nếu user đổi câu trả lời nhanh → có thể overwrite lẫn nhau → dùng optimistic locking
6. **AI Skill Scoring Bias**: Sinh viên không dùng AI không có nghĩa là giỏi hơn → cân nhắc kỹ trọng số
7. **Draft vs Submitted**: Phải check status trước khi cho phép edit hoặc use AI
8. **Token Cost Explosion**: Mỗi lần hỏi AI tốn tiền → cân nhắc giới hạn số lượt hỏi/bài tập
9. **Concurrent Grading**: Nhiều instructor chấm cùng lúc → dùng optimistic locking hoặc lock submission
10. **Timezone Issues**: Student ở timezone khác → deadline phải xử lý đúng (lưu UTC, hiển thị local)
11. **MongoDB Connection Pool**: Chỉ connect MỘT LẦN lúc startup, reuse connection
12. **JWT Security**: Refresh token trong httpOnly cookie, access token trong memory (KHÔNG localStorage)

## Key Files to Review (Files Quan Trọng)

**Backend Core:**

- `backend/src/routes/assignment.js` - Document upload, text extraction, AI question generation (829 lines)
- `backend/src/routes/submission.js` - Bài làm CRUD, auto-grading, submit logic (849 lines)
- `backend/src/routes/ai.js` - OpenAI integration cho student chat + logging (641 lines)
- `backend/src/routes/ai_assessment.js` - 9 endpoints for comprehensive AI assessment (481 lines)
- `backend/src/routes/analytics.js` - Analytics & statistics endpoints
- `backend/src/routes/logs.js` - AI log viewing + prompt labeling for ML
- `backend/src/routes/auth.js` - JWT authentication (student/instructor)
- `backend/src/routes/health.js` - Health check endpoint

**Backend Middleware:**

- `backend/src/middleware/auth.js` - JWT verification + role-based access control (auth.authenticate, auth.student, auth.instructor)
- `backend/src/middleware/security.js` - Rate limiting + file upload security
- `backend/src/middleware/upload.js` - Multer config + file validation

**Backend Models:**

- `backend/src/models/Assignment.js` - Mongoose schema cho bài tập (261 lines)
- `backend/src/models/AssignmentSubmission.js` - Mongoose schema cho bài làm (307 lines)
- `backend/src/models/AI_Log.js` - Mongoose schema cho AI interaction logs với advanced quality assessment (533 lines)
- `backend/src/models/User.js` - Student + Instructor schema

**Backend AI Assessment Utils (CORE):**

- `backend/src/utils/ai_advanced_assessment.js` - Comprehensive 8-part assessment orchestrator (667 lines)
- `backend/src/utils/prompt_classifier.js` - Prompt quality analysis, copy-paste detection, dependency patterns (536 lines)
- `backend/src/utils/wisdom_mapper.js` - WISDOM framework scoring (Inquiry, Disruptive Thinking, Mindfulness) (517 lines)
- `backend/src/utils/documentParser.js` - PDF/DOCX text extraction
- `backend/src/utils/questionGenerator.js` - OpenAI prompt templates
- `backend/src/utils/grading.js` - Auto-grading logic + AI skill scoring algorithm
- `backend/src/utils/blob.js` - Azure Blob Storage integration

**Frontend Pages (Instructor):**

- `frontend/src/pages/InstructorDashboard.jsx` - Main dashboard với submissions table (615 lines)
- `frontend/src/pages/AssignmentCreatePage.jsx` - Tạo bài tập + upload document + AI generation (704 lines)
- `frontend/src/pages/InstructorAssignmentListPage.jsx` - View all assignments (340 lines)
- `frontend/src/pages/AssignmentPreviewPage.jsx` - Preview before publishing (142 lines)
- `frontend/src/pages/GradingPage.jsx` - Essay grading interface (106 lines)
- `frontend/src/pages/AIAssessmentReport.jsx` - Comprehensive 8-part assessment with visualizations (564 lines)
- `frontend/src/pages/AILogsViewerPage.jsx` - View AI interaction logs (55 lines)

**Frontend Pages (Student):**

- `frontend/src/pages/StudentAssignmentListPage.jsx` - Browse available assignments (270 lines)
- `frontend/src/pages/AssignmentTakingPage.jsx` - Take assignment + AI chat sidebar (456 lines)
- `frontend/src/pages/StudentResultsPage.jsx` - View results after submission (421 lines)
- `frontend/src/pages/MySubmissionsPage.jsx` - Student's submission history (247 lines)

**Frontend Pages (Auth):**

- `frontend/src/pages/LoginPage.jsx` - Login for both roles (135 lines)
- `frontend/src/pages/RegisterPage.jsx` - Student registration (182 lines)
- `frontend/src/pages/InstructorRegisterPage.jsx` - Instructor registration (171 lines)

**Frontend Components (Core):**

- `frontend/src/components/AIChat.jsx` - Real-time AI chat interface
- `frontend/src/components/GradingInterface.jsx` - Essay grading form (391 lines)
- `frontend/src/components/PromptQualityFeedback.jsx` - Real-time prompt quality display
- `frontend/src/components/DependencyGauge.jsx` - Circular gauge for independence score (69 lines)
- `frontend/src/components/WisdomRadarChart.jsx` - Radar chart for WISDOM scores
- `frontend/src/components/TimelineChart.jsx` - Timeline with anomaly detection
- `frontend/src/components/RubricScoreCard.jsx` - Display rubric scores
- `frontend/src/components/AISkillBadges.jsx` - Visual badges for AI skill levels
- `frontend/src/components/RiskLevelBadge.jsx` - Color-coded risk level badges
- `frontend/src/components/LogViewer.jsx` - AI log timeline display
- `frontend/src/components/Layout.jsx` - Main layout with header/footer
- `frontend/src/components/ProtectedRoute.jsx` - Route protection by role

**Frontend Contexts:**

- `frontend/src/contexts/AuthContext.jsx` - JWT token management, user state
- `frontend/src/contexts/AssignmentContext.jsx` - Global assignment state, auto-save, tab tracking

**Frontend Utils:**

- `frontend/src/utils/api.js` - Axios instance with JWT interceptors + auto-refresh
- `frontend/src/App.jsx` - Main router with 20+ routes (196 lines)

**Infrastructure:**

- `.github/workflows/deploy.yml` - CI/CD pipeline cho Azure (if exists)
- `backend/scripts/setup-indexes.js` - MongoDB index creation
- `backend/scripts/seed.js` - Seed data for testing
- `backend/.env.example` - Environment variables template
- `README.md` - Project documentation (296 lines)
- `PROJECT_STATUS.md` - Detailed project status (549 lines)
- `QUICK_START.md` - Quick start guide (785 lines)

## Roadmap & Extensions (Lộ Trình Phát Triển)

**Phase 1 (MVP Hiện Tại):**

- ✅ Tạo bài tập từ tài liệu (PDF/DOCX/TXT) với AI
- ✅ Sinh viên làm bài + hỏi AI tự do
- ✅ Tự động chấm trắc nghiệm
- ✅ Tính AI Skill Score dựa trên prompt quality + independence
- ✅ Log tất cả AI interactions
- ✅ Dashboard cho giảng viên với analytics
- ✅ Export logs & scores ra CSV

**Phase 2 (Cải Tiến Scoring):**

- 🔄 Instructor label "good" vs "bad" prompts
- 🔄 Build labeled dataset
- 🔄 Train ML model để predict prompt quality tự động
- 🔄 Real-time feedback cho sinh viên ("Hãy thử hỏi cụ thể hơn...")

**Phase 3 (Advanced Analytics):**

- 📊 AI usage trends over time
- 📊 Peer comparison (anonymized)
- 📊 Identify struggling students early
- 📊 Recommend personalized learning paths

**Phase 4 (Integration & Scale):**

- 🔗 LMS integration (Canvas, Moodle, Google Classroom)
- 🔗 SSO with university systems
- 🔗 Plagiarism detection (cross-check submissions)
- 🔗 Mobile app (React Native)
- 🔗 Real-time collaboration (multiple students, group assignments)

**Phase 5 (AI Enhancements):**

- 🤖 AI-powered rubric generation for essay questions
- 🤖 Automated essay grading with GPT-4
- 🤖 Prompt suggestion engine
- 🤖 Adaptive difficulty (harder questions if student does well)
- 🤖 AI tutor mode (proactive hints without asking)

**Azure Best Practices:**

- 🔐 **Azure OpenAI Service** (data residency + compliance)
- 📈 **Application Insights** (monitor AI response times, errors)
- 🔑 **Azure Key Vault** (manage secrets securely)
- 💾 **Azure Cosmos DB** (nếu cần global distribution + guaranteed SLA)
- 🚀 **Azure CDN** (cache static files cho frontend)
- 🔔 **Azure Logic Apps** (email notifications cho deadlines)
