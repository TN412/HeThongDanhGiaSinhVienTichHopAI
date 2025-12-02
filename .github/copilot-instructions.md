# AI-Integrated Student Assessment System - Hệ Thống Tạo Bài Tập và Đánh Giá Năng Lực Sinh Viên Tích Hợp AI

## Tổng Quan Dự Án (Project Overview)

Đây là **hệ thống tạo bài tập và đánh giá năng lực sinh viên** cho phép sử dụng AI trong quá trình học tập. Hệ thống có 4 chức năng cốt lõi:

1. **Tạo Bài Tập Tự Động** - Giảng viên upload tài liệu (PDF, DOCX, TXT) và AI tự động tạo câu hỏi trắc nghiệm hoặc tự luận
2. **Hỗ Trợ AI Trong Quá Trình Làm Bài** - Sinh viên được phép hỏi AI bất cứ lúc nào, tất cả tương tác được ghi log
3. **Tự Động Chấm Điểm & Đánh Giá** - Hệ thống tự động chấm trắc nghiệm và tính điểm kỹ năng sử dụng AI
4. **Dashboard Phân Tích** - Giảng viên xem kết quả, log tương tác AI, và đánh giá năng lực sinh viên

**Mục tiêu chính**: Đánh giá cả kiến thức chuyên môn LẪN khả năng sử dụng AI hiệu quả của sinh viên.

### Kiến Trúc Hệ Thống (System Architecture)
- **Frontend** (`frontend/`): React SPA - giao diện làm bài, chat AI, upload tài liệu, xem kết quả
- **Backend** (`backend/`): Node.js + Express + Mongoose ODM
- **Database**: MongoDB Atlas (Azure) - lưu bài tập, bài làm, log AI, điểm số
- **File Storage**: Azure Blob Storage - tài liệu PDF/DOCX/TXT
- **Auth**: JWT tokens (access + refresh, httpOnly cookies)
- **AI Service**: Azure OpenAI hoặc OpenAI API (GPT-4/3.5-turbo)
- **Document Processing**: `pdf-parse`, `mammoth`, hoặc Azure Document Intelligence
- **Deployment**: Azure App Service (backend) + Azure Static Web Apps (frontend)

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
  instructorId: ObjectId,
  title: String,
  sourceDocument: {
    filename: String,
    blobUrl: String,      // Azure Blob Storage URL
    extractedText: String // Cached for regeneration
  },
  questionType: String,   // 'multiple-choice' | 'essay' | 'mixed'
  questions: [{
    type: String,         // 'multiple-choice' | 'essay'
    question: String,
    options: [String],    // Only for multiple-choice
    correctAnswer: String, // Only for multiple-choice
    rubric: String,       // Only for essay (grading criteria)
    points: Number
  }],
  generatedAt: Date,
  status: String,         // 'draft' | 'published' | 'archived'
  settings: {
    timeLimit: Number,    // minutes
    allowAI: Boolean,
    maxAttempts: Number
  }
}
```

**ExamSession State Machine:**
```
'pending' → 'active' → 'completed' | 'violated' | 'timeout'
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
db.assignment_submissions.createIndex({ studentId: 1, assignmentId: 1, attemptNumber: 1 });
db.assignment_submissions.createIndex({ status: 1 });
db.assignment_submissions.createIndex({ submittedAt: 1 });

// Assignment collection
db.assignments.createIndex({ instructorId: 1, status: 1 });
db.assignments.createIndex({ deadline: 1 });
```

## Project-Specific Conventions

### API Route Organization

**Assignment Routes (Bài Tập):**
- `/api/assignment/generate` - POST: Upload tài liệu + AI tạo câu hỏi (instructor only)
- `/api/assignment` - POST: Tạo bài tập thủ công, GET `/:id`: Xem chi tiết, PUT `/:id`: Chỉnh sửa
- `/api/assignment/:id/publish` - POST: Publish bài tập cho sinh viên
- `/api/assignment/:id/regenerate` - POST: Tạo lại câu hỏi từ cùng tài liệu
- `/api/assignment/list` - GET: Danh sách bài tập (có filter: status, deadline)

**Submission Routes (Bài Làm):**
- `/api/submission/start` - POST: Bắt đầu làm bài (tạo submission với status='draft')
- `/api/submission/:id` - GET: Lấy bài làm, PUT: Lưu nháp (update answers)
- `/api/submission/:id/submit` - POST: Nộp bài (chuyển status='submitted', tự động chấm)
- `/api/submission/:id/grade` - POST: Giảng viên chấm bài tự luận (instructor only)
- `/api/submission/:id/feedback` - POST: Giảng viên gửi feedback (instructor only)

**AI Chat Routes:**
- `/api/ai/chat` - POST: Sinh viên hỏi AI + log tương tác
  - Body: `{ submissionId, questionId, prompt, context }`
  - Response: `{ message, suggestedActions }`
- `/api/ai/hint` - POST: Xin gợi ý cho câu hỏi cụ thể (nếu cho phép)

**Analytics & Logs Routes:**
- `/api/logs/submission/:submissionId` - GET: Tất cả log AI cho một bài làm (instructor)
- `/api/logs/student/:studentId` - GET: Log AI của sinh viên across all assignments
- `/api/analytics/assignment/:id` - GET: Thống kê bài tập (avg score, completion rate, AI usage)
- `/api/analytics/student/:id` - GET: Thống kê sinh viên (progress, AI skill trend)

**Auth Routes:**
- `/api/student` - POST `/login`, POST `/register`, GET `/profile`
- `/api/instructor` - POST `/login`, GET `/dashboard`

### Document Upload & Question Generation Pattern
**Located in `backend/routes/exam.js`:**
```javascript
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.post('/api/assignment/generate', auth.instructor, upload.single('document'), async (req, res) => {
  const { questionType, questionCount, difficulty } = req.body;
  const file = req.file;
  
  // 1. Extract text from uploaded document
  let extractedText;
  if (file.mimetype === 'application/pdf') {
    const pdfData = await pdfParse(file.buffer);
    extractedText = pdfData.text;
  } else if (file.mimetype.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    extractedText = result.value;
  } else {
    extractedText = file.buffer.toString('utf-8');
  }
  
  // 2. Upload to Azure Blob Storage for archival
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient('exam-documents');
  const blobName = `${req.user.id}/${Date.now()}_${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(file.buffer, file.size);
  
  // 3. Generate questions with OpenAI
  const prompt = buildQuestionGenerationPrompt(extractedText, questionType, questionCount, difficulty);
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });
  
  // 4. Parse AI response into structured questions
  const questions = parseAIQuestions(aiResponse.choices[0].message.content, questionType);
  
  // 5. Create draft assignment
  const assignment = await Assignment.create({
    instructorId: req.user.id,
    title: `Bài tập từ ${file.originalname}`,
    description: 'Được tạo tự động từ tài liệu',
    sourceDocument: {
      filename: file.originalname,
      blobUrl: blockBlobClient.url,
      extractedText
    },
    questionType,
    questions,
    allowAI: true,  // Mặc định cho phép AI
    allowMultipleDrafts: true,
    status: 'draft'
  });
  
  res.json({ assignmentId: assignment._id, questions });
});

// Helper: Build OpenAI prompt for question generation
function buildQuestionGenerationPrompt(text, type, count, difficulty) {
  if (type === 'multiple-choice') {
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
  } else if (type === 'essay') {
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
**LUÔN log trước khi trả response:**
```javascript
// backend/routes/ai.js
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, submissionId, questionId, context } = req.body;
  
  // 1. Validate submission exists và chưa submit
  const submission = await AssignmentSubmission.findById(submissionId);
  if (!submission) return res.status(404).json({error: 'Submission not found'});
  if (submission.status === 'submitted') return res.status(403).json({error: 'Cannot use AI after submission'});
  
  // 2. Check xem assignment có cho phép AI không
  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment.allowAI) return res.status(403).json({error: 'AI not allowed for this assignment'});
  
  // 3. Build context-aware prompt
  let systemPrompt = `You are a helpful tutor. Guide the student but don't give direct answers.`;
  if (questionId) {
    const question = assignment.questions.id(questionId);
    systemPrompt += `\n\nContext: Student is working on this question: "${question.question}"`;
  }
  
  // 4. Call OpenAI
  const startTime = Date.now();
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });
  
  const response = aiResponse.choices[0].message.content;
  
  // 5. CRITICAL: Log interaction TRƯỚC KHI trả về
  await AI_Log.create({
    submissionId,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    questionId,
    prompt,
    response,
    promptType: classifyPromptType(prompt), // 'question' | 'clarification' | 'hint'
    contextProvided: !!context,
    timestamp: new Date(),
    promptTokens: aiResponse.usage.prompt_tokens,
    completionTokens: aiResponse.usage.completion_tokens,
    responseTime: Date.now() - startTime
  });
  
  // 6. Cập nhật interaction count cho câu hỏi
  if (questionId) {
    await AssignmentSubmission.updateOne(
      { _id: submissionId, 'answers.questionId': questionId },
      { $inc: { 'answers.$.aiInteractionCount': 1 } }
    );
  }
  
  // 7. Return to student
  res.json({ 
    message: response,
    tokensUsed: aiResponse.usage.total_tokens,
    suggestedActions: generateSuggestions(prompt, response)
  });
});

// Helper function
function classifyPromptType(prompt) {
  if (prompt.includes('?')) return 'question';
  if (prompt.toLowerCase().includes('hint') || prompt.toLowerCase().includes('gợi ý')) return 'hint';
  return 'clarification';
}
```

### Auto-Grading Pattern (Tự Động Chấm Điểm)
**Located in `backend/routes/submission.js`:**
```javascript
app.post('/api/submission/:id/submit', auth.student, async (req, res) => {
  const submission = await AssignmentSubmission.findById(req.params.id);
  const assignment = await Assignment.findById(submission.assignmentId);
  
  // 1. Auto-grade multiple-choice questions
  let totalScore = 0;
  for (let answer of submission.answers) {
    const question = assignment.questions.id(answer.questionId);
    
    if (question.type === 'multiple-choice') {
      answer.isCorrect = (answer.answer === question.correctAnswer);
      answer.pointsEarned = answer.isCorrect ? question.points : 0;
      totalScore += answer.pointsEarned;
    }
    // Essay questions cần instructor chấm thủ công
  }
  
  // 2. Calculate AI Skill Score
  const logs = await AI_Log.find({ submissionId: submission._id });
  const aiSkillScore = calculateAISkillScore(logs, submission);
  
  // 3. Calculate final score (70% content + 30% AI skill)
  const contentScore = (totalScore / assignment.totalPoints) * 100;
  const finalScore = (contentScore * 0.7) + (aiSkillScore * 0.3);
  
  // 4. Update submission
  submission.status = 'submitted';
  submission.totalScore = totalScore;
  submission.aiSkillScore = aiSkillScore;
  submission.finalScore = finalScore;
  submission.submittedAt = new Date();
  submission.aiInteractionSummary = calculateInteractionSummary(logs);
  await submission.save();
  
  res.json({ 
    success: true,
    totalScore,
    aiSkillScore,
    finalScore,
    feedback: generateAutoFeedback(submission, logs)
  });
});

// AI Skill Scoring Algorithm
function calculateAISkillScore(logs, submission) {
  if (logs.length === 0) return 100; // Không dùng AI = điểm tối đa về độc lập
  
  // Factor 1: Prompt Quality (40%)
  const avgPromptLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length;
  const contextProvidedRate = logs.filter(log => log.contextProvided).length / logs.length;
  const promptQuality = Math.min(100, (avgPromptLength / 50) * 50 + contextProvidedRate * 50);
  
  // Factor 2: Independence Level (30%)
  const aiUsageRate = logs.length / submission.answers.length;
  const independenceScore = Math.max(0, 100 - (aiUsageRate * 30));
  
  // Factor 3: Iteration Pattern (30%)
  const uniquePrompts = new Set(logs.map(l => l.prompt.toLowerCase().trim())).size;
  const iterationEfficiency = (uniquePrompts / logs.length) * 100;
  
  return (promptQuality * 0.4) + (independenceScore * 0.3) + (iterationEfficiency * 0.3);
}
```

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
```

**AI Chat Component:**
```jsx
// frontend/components/AIChat.jsx
function AIChat({ submissionId, questionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await api.post('/ai/chat', {
        prompt: input,
        submissionId,
        questionId,
        context: getCurrentQuestionContext() // Tự động gửi context
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message,
        tokensUsed: response.data.tokensUsed
      }]);
    } catch (error) {
      alert('AI Error: ' + error.response?.data?.error);
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
            {msg.tokensUsed && <span className="tokens">🪙 {msg.tokensUsed} tokens</span>}
          </div>
        ))}
      </div>
      <input 
        value={input} 
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
        placeholder="Hỏi AI về câu hỏi này..."
        disabled={loading}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Gửi'}
      </button>
      <div className="ai-tips">
        💡 Tips: Mô tả rõ vấn đề bạn gặp để AI hỗ trợ tốt hơn!
      </div>
    </div>
  );
}
```

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

**Backend:**
- `backend/routes/assignment.js` - Document upload, text extraction, AI question generation
- `backend/routes/submission.js` - Bài làm CRUD, auto-grading, submit logic
- `backend/routes/ai.js` - OpenAI integration cho student chat + logging
- `backend/routes/analytics.js` - Analytics & statistics endpoints
- `backend/middleware/auth.js` - JWT verification + role-based access control
- `backend/middleware/upload.js` - Multer config + file validation
- `backend/utils/documentParser.js` - PDF/DOCX text extraction
- `backend/utils/questionGenerator.js` - OpenAI prompt templates
- `backend/utils/grading.js` - Auto-grading logic + AI skill scoring algorithm
- `backend/models/Assignment.js` - Mongoose schema cho bài tập
- `backend/models/AssignmentSubmission.js` - Mongoose schema cho bài làm
- `backend/models/AI_Log.js` - Mongoose schema cho AI interaction logs
- `backend/models/User.js` - Student + Instructor schema

**Frontend:**
- `frontend/src/pages/InstructorDashboard.jsx` - Dashboard tổng quan cho giảng viên
- `frontend/src/pages/AssignmentCreate.jsx` - Tạo bài tập + upload document
- `frontend/src/pages/AssignmentView.jsx` - Sinh viên làm bài
- `frontend/src/pages/SubmissionReview.jsx` - Giảng viên xem + chấm bài
- `frontend/src/components/QuestionEditor.jsx` - Review/edit AI-generated questions
- `frontend/src/components/AIChat.jsx` - Student AI chat interface
- `frontend/src/components/LogViewer.jsx` - Hiển thị AI interaction logs
- `frontend/src/components/GradingInterface.jsx` - Chấm bài tự luận interface
- `frontend/src/contexts/AssignmentContext.jsx` - Global state cho assignment
- `frontend/src/utils/api.js` - Axios instance + JWT interceptors
- `frontend/src/utils/scoring.js` - Frontend AI skill score visualization

**Infrastructure:**
- `.github/workflows/deploy.yml` - CI/CD pipeline cho Azure
- `backend/scripts/setup-indexes.js` - MongoDB index creation
- `backend/scripts/seed.js` - Seed data for testing

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
