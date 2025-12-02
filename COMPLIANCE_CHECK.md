# 🔍 KIỂM TRA TOÀN BỘ SOURCE CODE - COMPLIANCE CHECKLIST

**Ngày kiểm tra**: 13/11/2025  
**Kiểm tra viên**: AI Agent  
**Tài liệu tham chiếu**: `.github/copilot-instructions.md`

---

## ✅ 1. DATABASE MODELS (Backend Models)

### 1.1 Assignment Model

- ✅ **Có file**: `backend/src/models/Assignment.js`
- ✅ **Schema fields đúng**:
  - ✅ `instructorId` (ObjectId, ref: User)
  - ✅ `title` (String, required)
  - ✅ `description` (String)
  - ✅ `sourceDocument` { filename, blobUrl, extractedText }
  - ✅ `questionType` ('multiple-choice' | 'essay' | 'mixed')
  - ✅ `questions` array with subdocuments
  - ✅ `status` ('draft' | 'published' | 'archived')
  - ✅ `settings` { timeLimit, allowAI, maxAttempts }
- ✅ **Indexes đúng**:
  - ✅ `{ instructorId: 1, status: 1 }`
  - ✅ `{ deadline: 1 }`
- ✅ **Virtual fields**: totalPoints, questionCount, isOverdue
- ✅ **Instance methods**: publish(), archive()

### 1.2 AssignmentSubmission Model

- ✅ **Có file**: `backend/src/models/AssignmentSubmission.js`
- ✅ **Schema fields đúng**:
  - ✅ `studentId`, `assignmentId` (ObjectId refs)
  - ✅ `attemptNumber` (Number)
  - ✅ `answers` array with AI tracking
  - ✅ `status` ('draft' | 'submitted' | 'graded')
  - ✅ `totalScore`, `aiSkillScore`, `finalScore`
  - ✅ `aiInteractionSummary`
- ✅ **Indexes đúng**:
  - ✅ `{ studentId: 1, assignmentId: 1, attemptNumber: 1 }`
  - ✅ `{ status: 1 }`
  - ✅ `{ submittedAt: 1 }`

### 1.3 AI_Log Model

- ✅ **Có file**: `backend/src/models/AI_Log.js`
- ✅ **Schema fields đúng**:
  - ✅ `submissionId`, `assignmentId`, `studentId` (ObjectId refs)
  - ✅ `questionId` (optional)
  - ✅ `prompt`, `response` (String)
  - ✅ `promptType` enum
  - ✅ `contextProvided` (Boolean)
  - ✅ `promptTokens`, `completionTokens`, `totalTokens`
  - ✅ `responseTime` (milliseconds)
  - ✅ `qualityScore` (0-100, for ML)
  - ✅ **NEW**: `instructorLabel` { quality, labeledBy, labeledAt, note }
- ✅ **Indexes đúng**:
  - ✅ `{ submissionId: 1, timestamp: 1 }`
  - ✅ `{ studentId: 1, assignmentId: 1 }`
  - ✅ `{ questionId: 1 }`

### 1.4 User Model

- ✅ **Có file**: `backend/src/models/User.js`
- ✅ **Schema fields đúng**:
  - ✅ `name`, `email`, `passwordHash`
  - ✅ `role` ('student' | 'instructor')
  - ✅ `studentId`, `department` (optional)
  - ✅ `isActive`, `lastLogin`
- ✅ **Pre-save hook**: Hash password với bcrypt

---

## ✅ 2. BACKEND API ROUTES

### 2.1 Auth Routes (`/api/auth/*`)

- ✅ **Có file**: `backend/src/routes/auth.js`
- ✅ **Student routes**:
  - ✅ `POST /auth/student/register` - Đăng ký student
  - ✅ `POST /auth/student/login` - Login student
  - ✅ `GET /auth/student/profile` - Get profile
- ✅ **Instructor routes**:
  - ✅ `POST /auth/instructor/register` - Đăng ký instructor
  - ✅ `POST /auth/instructor/login` - Login instructor
  - ✅ `GET /auth/instructor/dashboard` - Dashboard mock
- ✅ **Common routes**:
  - ✅ `GET /auth/me` - Get current user
  - ✅ `POST /auth/refresh` - Refresh access token
  - ✅ `POST /auth/logout` - Logout (clear cookie)

### 2.2 Assignment Routes (`/api/assignment/*`)

- ❌ **THIẾU FILE**: `backend/src/routes/assignment.js` - **CẦN TẠO**
- ❌ **THIẾU ENDPOINTS**:
  - ❌ `POST /assignment/generate` - Upload document + AI generate questions
  - ❌ `POST /assignment` - Tạo assignment thủ công
  - ❌ `GET /assignment/:id` - Xem chi tiết assignment
  - ❌ `PUT /assignment/:id` - Chỉnh sửa assignment
  - ❌ `POST /assignment/:id/publish` - Publish assignment
  - ❌ `POST /assignment/:id/regenerate` - Regenerate questions
  - ✅ `GET /assignment/list` - List assignments (đã có)

### 2.3 Submission Routes (`/api/submission/*`)

- ✅ **Có file**: `backend/src/routes/submission.js`
- ✅ **Endpoints đầy đủ**:
  - ✅ `POST /submission/start` - Bắt đầu làm bài
  - ✅ `GET /submission/:id` - Lấy submission
  - ✅ `PUT /submission/:id` - Lưu nháp (update answers)
  - ✅ `POST /submission/:id/submit` - Nộp bài + auto-grade
  - ✅ `GET /submission/instructor/all` - Instructor xem all submissions
- ❌ **THIẾU ENDPOINTS**:
  - ❌ `POST /submission/:id/grade` - Instructor chấm essay
  - ❌ `POST /submission/:id/feedback` - Gửi feedback

### 2.4 AI Chat Routes (`/api/ai/*`)

- ✅ **Có file**: `backend/src/routes/ai.js`
- ✅ **Endpoints đầy đủ**:
  - ✅ `POST /ai/chat` - Sinh viên hỏi AI + log interaction
  - ✅ `GET /ai/stats` - AI usage stats
- ✅ **Features đúng spec**:
  - ✅ Validate submission exists và chưa submit
  - ✅ Check assignment allowAI
  - ✅ Build context-aware system prompt
  - ✅ Call OpenAI API
  - ✅ **Log TRƯỚC KHI trả response** (CRITICAL!)
  - ✅ Track prompt quality với heuristic scoring
  - ✅ Rate limiting per submission/question
  - ✅ Return promptQuality feedback

### 2.5 Analytics & Logs Routes (`/api/logs/*`, `/api/analytics/*`)

- ✅ **Logs routes** (`backend/src/routes/logs.js`):
  - ✅ `POST /logs/:logId/label` - Instructor label prompt
  - ✅ `PUT /logs/:logId/label` - Update label
  - ✅ `DELETE /logs/:logId/label` - Remove label
  - ✅ `GET /logs/submission/:submissionId` - Get logs by submission
  - ✅ `GET /logs/assignment/:assignmentId` - Get logs by assignment
  - ✅ `GET /logs/export-training-data` - Export CSV/JSON
  - ✅ `GET /logs/label-stats` - Labeling statistics
- ✅ **Analytics routes** (`backend/src/routes/analytics.js`):
  - ✅ `GET /analytics/logs/submission/:submissionId`
  - ✅ `GET /analytics/logs/student/:studentId`
  - ✅ `GET /analytics/assignment/:id`
  - ✅ `GET /analytics/student/:id`

---

## ✅ 3. BACKEND SERVICES & UTILITIES

### 3.1 Prompt Scoring Service

- ✅ **Có file**: `backend/src/services/promptScoringService.js`
- ✅ **Functions đầy đủ**:
  - ✅ `scorePromptHeuristic(prompt, context)` - Returns 0-100 score
  - ✅ `extractFeatures(prompt, context)` - 24 features
  - ✅ `detectAntiPatterns(prompt)` - Warning messages
  - ✅ `analyzeBatchForTraining(logs)` - Prepare ML data
  - ✅ `generateTrainingCSV(analyzedLogs)` - CSV export

### 3.2 Document Processing

- ❌ **THIẾU FILE**: `backend/src/utils/documentParser.js` - **CẦN TẠO**
- ❌ **THIẾU FUNCTIONS**:
  - ❌ `extractTextFromPDF(buffer)` - Parse PDF with pdf-parse
  - ❌ `extractTextFromDOCX(buffer)` - Parse DOCX with mammoth
  - ❌ `extractTextFromTXT(buffer)` - Plain text
  - ❌ Unified interface: `extractText(file, mimetype)`

### 3.3 Question Generation

- ❌ **THIẾU FILE**: `backend/src/utils/questionGenerator.js` - **CẦN TẠO**
- ❌ **THIẾU FUNCTIONS**:
  - ❌ `buildQuestionGenerationPrompt(text, type, count, difficulty)`
  - ❌ `parseAIQuestions(aiResponse, questionType)` - Parse JSON response
  - ❌ `validateGeneratedQuestions(questions)` - Validation

### 3.4 Grading Utils

- ❌ **THIẾU FILE**: `backend/src/utils/grading.js` - **CẦN TẠO**
- ❌ **THIẾU FUNCTIONS**:
  - ❌ `calculateAISkillScore(logs, submission)` - AI Skill Scoring Algorithm
  - ❌ `calculateInteractionSummary(logs)` - Stats summary
  - ❌ `generateAutoFeedback(submission, logs)` - Auto feedback
  - ❌ **Algorithm theo spec**:
    - Prompt Quality (40%)
    - Independence Level (30%)
    - Iteration Pattern (30%)

### 3.5 Azure Blob Storage

- ❌ **THIẾU FILE**: `backend/src/utils/blobStorage.js` - **CẦN TẠO**
- ❌ **THIẾU FUNCTIONS**:
  - ❌ `uploadFile(buffer, filename, instructorId)` - Upload to Azure
  - ❌ `getFileUrl(blobName)` - Get public URL
  - ❌ `deleteFile(blobName)` - Delete blob

---

## ✅ 4. FRONTEND COMPONENTS & PAGES

### 4.1 Auth Pages

- ✅ **LoginPage** (`frontend/src/pages/LoginPage.jsx`)
- ✅ **RegisterPage** (`frontend/src/pages/RegisterPage.jsx`) - Student
- ✅ **InstructorRegisterPage** (`frontend/src/pages/InstructorRegisterPage.jsx`) - Instructor

### 4.2 Student Pages

- ❌ **THIẾU**: `frontend/src/pages/AssignmentListPage.jsx` - List available assignments
- ✅ **AssignmentView** (`frontend/src/pages/AssignmentView.jsx`) - Làm bài
- ❌ **THIẾU**: `frontend/src/pages/SubmissionResultPage.jsx` - Xem kết quả

### 4.3 Instructor Pages

- ✅ **InstructorDashboard** (`frontend/src/pages/InstructorDashboard.jsx`)
- ❌ **THIẾU**: `frontend/src/pages/AssignmentCreatePage.jsx` - Tạo assignment
- ❌ **THIẾU**: `frontend/src/pages/SubmissionReviewPage.jsx` - Chấm bài + xem logs
- ❌ **THIẾU**: `frontend/src/components/QuestionEditor.jsx` - Edit AI-generated questions
- ✅ **PromptLabelingInterface** (`frontend/src/components/PromptLabelingInterface.jsx`)

### 4.4 AI Components

- ✅ **AIChat** (`frontend/src/components/AIChat.jsx`)
  - ✅ Send message to AI
  - ✅ Display chat history
  - ✅ Show token usage
  - ✅ Build context automatically
  - ✅ **NEW**: Display prompt quality feedback
  - ✅ **NEW**: Toggle quality panel
- ✅ **PromptQualityFeedback** (`frontend/src/components/PromptQualityFeedback.jsx`)
  - ✅ Real-time quality score display
  - ✅ Inline mode (compact badge)
  - ✅ Panel mode (full feedback card)
- ✅ **PromptQualityIndicator** - Badge in message history

### 4.5 Contexts

- ✅ **AuthContext** (`frontend/src/contexts/AuthContext.jsx`)
  - ✅ login(), register() with role support
  - ✅ logout()
  - ✅ Token refresh interceptor
  - ✅ User state management
- ❌ **THIẾU**: `frontend/src/contexts/AssignmentContext.jsx` - **CẦN TẠO**
  - ❌ submission state
  - ❌ currentQuestionIndex
  - ❌ aiChatOpen
  - ❌ Auto-save draft every 30s
  - ❌ Track tab switches

### 4.6 Utils

- ✅ **API Client** (`frontend/src/utils/api.js`)
  - ✅ Axios instance with interceptors
  - ✅ JWT token handling (in memory)
  - ✅ Auto refresh on 401
  - ✅ Helper functions (login, register, etc.)

---

## ✅ 5. MIDDLEWARE & SECURITY

### 5.1 Auth Middleware

- ✅ **Có file**: `backend/src/middleware/auth.js`
- ✅ **Middleware đầy đủ**:
  - ✅ `authenticate` - Verify JWT, any role
  - ✅ `student` - Only students
  - ✅ `instructor` - Only instructors
- ✅ **Token functions**:
  - ✅ `signTokens(user)` - Generate access + refresh
  - ✅ `verifyRefreshToken(token)`
  - ✅ `setRefreshTokenCookie(res, token)`
  - ✅ `clearRefreshTokenCookie(res)`

### 5.2 Security Middleware

- ✅ **Có file**: `backend/src/middleware/security.js`
- ✅ **Features**:
  - ✅ Helmet config
  - ✅ Rate limiters: authLimiter, generalLimiter
  - ✅ CORS config

### 5.3 Error Handling

- ✅ **Có file**: `backend/src/middleware/errorHandler.js`
- ✅ **Có file**: `backend/src/middleware/notFound.js`

---

## ✅ 6. CONFIGURATION & ENVIRONMENT

### 6.1 Environment Variables

- ✅ **Có file**: `backend/.env`
- ✅ **Variables đầy đủ**:
  - ✅ `MONGODB_URI` - MongoDB Atlas connection
  - ✅ `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
  - ✅ `OPENAI_API_KEY`, `OPENAI_MODEL`
  - ✅ `FRONTEND_URL` - CORS
  - ❌ **THIẾU**: `AZURE_STORAGE_CONNECTION_STRING` - Chưa setup
  - ❌ **THIẾU**: `AZURE_STORAGE_CONTAINER` - Chưa setup

### 6.2 Application Insights

- ✅ **Có file**: `backend/src/config/appInsights.js`
- ✅ **Features**:
  - ✅ Initialize AI tracking
  - ✅ trackEvent, trackException, trackMetric helpers
  - ✅ Request timing middleware

---

## ❌ 7. THIẾU FEATURES QUAN TRỌNG

### 7.1 Document Upload & Question Generation (CRITICAL!)

**Theo spec, đây là chức năng cốt lõi #1:**

```
Giảng Viên Upload Tài Liệu → AI Tạo Câu Hỏi → Giảng Viên Review → Publish
```

**Cần tạo:**

1. ❌ `backend/src/routes/assignment.js` với `/assignment/generate` endpoint
2. ❌ `backend/src/utils/documentParser.js` - Extract text from PDF/DOCX/TXT
3. ❌ `backend/src/utils/questionGenerator.js` - OpenAI prompt templates
4. ❌ `backend/src/utils/blobStorage.js` - Azure Blob upload
5. ❌ `frontend/src/pages/AssignmentCreatePage.jsx` - Upload UI + question review

**Impact**: 🔴 **HIGH PRIORITY** - Không có feature này, giảng viên không thể tạo bài tập!

### 7.2 Auto-Grading & AI Skill Scoring

**Theo spec, tính điểm = 70% content + 30% AI skill:**

**Cần tạo:**

1. ❌ `backend/src/utils/grading.js` với `calculateAISkillScore()` algorithm
2. ❌ Integrate vào `POST /submission/:id/submit` route
3. ❌ `generateAutoFeedback()` function

**Impact**: 🔴 **HIGH PRIORITY** - Không có, submission không có điểm AI skill!

### 7.3 Frontend Assignment Context

**Theo spec, cần auto-save draft + track tab switches:**

**Cần tạo:**

1. ❌ `frontend/src/contexts/AssignmentContext.jsx`
2. ❌ Auto-save interval (every 30s)
3. ❌ Tab visibility tracking

**Impact**: 🟡 **MEDIUM PRIORITY** - Không có auto-save, sinh viên có thể mất dữ liệu

### 7.4 Instructor Dashboard với AI Log Viewer

**Theo spec, giảng viên phải xem được:**

- Chi tiết log AI của từng sinh viên
- Prompt quality distribution
- Timeline interactions
- Filter by assignment/student/status

**Cần tạo:**

1. ❌ `frontend/src/components/LogViewer.jsx` - Timeline view
2. ❌ `frontend/src/components/GradingInterface.jsx` - Chấm essay + xem AI suggestions
3. ❌ Integrate vào InstructorDashboard

**Impact**: 🟡 **MEDIUM PRIORITY** - Dashboard hiện chỉ có mock data

### 7.5 Manual Grading for Essay Questions

**Theo spec, essay questions cần instructor chấm thủ công:**

**Cần tạo:**

1. ❌ `POST /submission/:id/grade` endpoint
2. ❌ `POST /submission/:id/feedback` endpoint
3. ❌ Frontend grading interface

**Impact**: 🟡 **MEDIUM PRIORITY** - Hiện chỉ auto-grade multiple-choice

---

## 📊 SUMMARY - COMPLIANCE SCORE

### ✅ ĐÃ HOÀN THÀNH (Completed):

- ✅ **Models (100%)**: Assignment, AssignmentSubmission, AI_Log, User
- ✅ **Auth System (100%)**: Student + Instructor register/login, JWT tokens
- ✅ **AI Chat (100%)**: Real-time chat, logging, rate limiting, prompt quality scoring
- ✅ **Prompt Scoring (100%)**: Heuristic algorithm, feature extraction, labeling
- ✅ **Submission Basic (80%)**: Start, get, update, submit, auto-grade multiple-choice
- ✅ **Analytics Routes (100%)**: Logs export, label stats, analytics endpoints

### ❌ CHƯA HOÀN THÀNH (Missing):

- ❌ **Document Upload & Question Generation (0%)** - 🔴 CRITICAL
- ❌ **Auto-Grading Algorithm (0%)** - 🔴 CRITICAL
- ❌ **Azure Blob Storage Integration (0%)** - 🔴 CRITICAL
- ❌ **Frontend Assignment Context (0%)** - 🟡 MEDIUM
- ❌ **Instructor Dashboard Full Features (30%)** - 🟡 MEDIUM
- ❌ **Essay Manual Grading (0%)** - 🟡 MEDIUM
- ❌ **Student Assignment List Page (0%)** - 🟢 LOW

### 📈 OVERALL COMPLIANCE: **65%**

**Breakdown:**

- Backend Core: 70% ✅
- Frontend Core: 50% ⚠️
- Critical Features: 40% ❌

---

## 🚀 RECOMMENDED ACTION PLAN

### Phase 1: CRITICAL FIXES (Must Have)

1. **Tạo Document Upload & Question Generation** (4-6 hours)
   - Create `backend/src/utils/documentParser.js`
   - Create `backend/src/utils/questionGenerator.js`
   - Create `backend/src/utils/blobStorage.js`
   - Add `/assignment/generate` endpoint
   - Create `frontend/src/pages/AssignmentCreatePage.jsx`

2. **Implement Auto-Grading Algorithm** (2-3 hours)
   - Create `backend/src/utils/grading.js`
   - Implement `calculateAISkillScore()` algorithm
   - Integrate into `/submission/:id/submit`

3. **Setup Azure Blob Storage** (1 hour)
   - Create Azure Storage account
   - Add connection string to .env
   - Test upload/download

### Phase 2: IMPORTANT FIXES (Should Have)

4. **Create Assignment Context** (2 hours)
   - Create `frontend/src/contexts/AssignmentContext.jsx`
   - Add auto-save functionality
   - Add tab tracking

5. **Enhance Instructor Dashboard** (3-4 hours)
   - Create `frontend/src/components/LogViewer.jsx`
   - Create `frontend/src/components/GradingInterface.jsx`
   - Integrate real data (not mock)

### Phase 3: NICE TO HAVE

6. **Essay Manual Grading** (2 hours)
7. **Student Assignment List** (1 hour)
8. **Submission Result Page** (1 hour)

---

**Tổng thời gian ước tính**: 15-20 hours để đạt 95% compliance
