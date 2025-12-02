# 🎯 ACTION PLAN - Hoàn Thiện Hệ Thống

## 📊 Status Tổng Quan

**Compliance Score**: 75% → **Target: 95%**

**Chức Năng Đã Hoàn Thành** (75%):

- ✅ **Backend Core** (85%)
  - ✅ Database Models (100%) - Assignment, Submission, AI_Log, User
  - ✅ Authentication (100%) - Student + Instructor JWT auth
  - ✅ AI Chat System (100%) - Real-time chat + logging + quality scoring
  - ✅ Assignment Generation (100%) - Document upload + OpenAI integration
  - ✅ Auto-Grading Algorithm (100%) - Multiple-choice + AI skill scoring
  - ✅ Analytics & Logs (100%) - Dashboard data, export CSV/JSON
  - ⚠️ Manual Grading (0%) - Giảng viên chấm bài tự luận

- ⚠️ **Frontend Core** (50%)
  - ✅ Auth Pages (100%) - Login, Register (Student + Instructor)
  - ✅ AI Chat Component (100%) - Real-time chat với prompt quality feedback
  - ❌ Assignment Creation Page (0%) - Upload document + review questions
  - ❌ Assignment List Pages (0%) - Student view + Instructor view
  - ❌ Assignment Taking Page (0%) - Student làm bài + AI chat
  - ❌ Results Page (0%) - Xem điểm + feedback
  - ⚠️ Instructor Dashboard (30%) - Có UI nhưng dùng mock data

- ⚠️ **Infrastructure** (60%)
  - ✅ MongoDB Atlas (100%) - Đã connect, có 5 users
  - ✅ OpenAI Integration (100%) - Đã config, test thành công
  - ❌ Azure Blob Storage (0%) - Chưa setup
  - ✅ Application Insights (100%) - Đã config
  - ✅ Environment Variables (100%) - Có .env.example

---

## 🚨 CRITICAL - Phải Làm Ngay (Blocking Core Features)

### 1. Setup Azure Blob Storage (1-2 giờ)

**Tại Sao Quan Trọng**: Không có Blob Storage → không lưu được tài liệu PDF/DOCX

**Steps**:

```bash
# Azure Portal
1. Tạo Storage Account:
   - Tên: aiassessment<random>
   - Region: Southeast Asia (gần với bạn)
   - Performance: Standard
   - Redundancy: LRS (rẻ nhất)

2. Tạo Container:
   - Tên: assignment-documents
   - Public access level: Private

3. Get Connection String:
   - Settings → Access keys → Copy connection string

# Backend .env
4. Thêm vào backend/.env:
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."
AZURE_STORAGE_CONTAINER=assignment-documents

# Test
5. Chạy test script:
cd backend
node -e "const {uploadToBlob} = require('./src/utils/blob'); uploadToBlob(Buffer.from('test'), 'test.txt', 'text/plain', 'test-user').then(console.log)"
```

**Expected Output**:

```
Uploaded blob to: https://aiassessment....blob.core.windows.net/assignment-documents/test-user/test.txt
```

---

### 2. Create Frontend Assignment Pages (6-8 giờ)

#### 2.1. Assignment Create Page (2 giờ)

**File**: `frontend/src/pages/AssignmentCreatePage.jsx`

**Chức Năng**:

- Upload document (PDF/DOCX/TXT)
- Chọn question type (multiple-choice / essay / mixed)
- Chọn số lượng câu hỏi (5-20)
- Chọn độ khó (easy / medium / hard)
- Submit → Loading → AI tạo câu hỏi
- Review questions (edit/delete/add)
- Publish assignment

**Pseudocode**:

```jsx
// frontend/src/pages/AssignmentCreatePage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function AssignmentCreatePage() {
  const [file, setFile] = useState(null);
  const [questionType, setQuestionType] = useState("multiple-choice");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [generatedAssignment, setGeneratedAssignment] = useState(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    formData.append("questionType", questionType);
    formData.append("questionCount", questionCount);
    formData.append("difficulty", difficulty);

    setLoading(true);
    try {
      const response = await api.post("/assignment/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setGeneratedAssignment(response.data.assignment);
      alert("Questions generated! Please review before publishing.");
    } catch (error) {
      alert("Generation failed: " + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/assignment/${generatedAssignment.id}/publish`);
      alert("Assignment published successfully!");
      navigate("/instructor/dashboard");
    } catch (error) {
      alert("Publish failed: " + error.response?.data?.error);
    }
  };

  return (
    <div className="container">
      <h1>Tạo Bài Tập Mới</h1>

      {!generatedAssignment ? (
        <div className="upload-form">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
          >
            <option value="multiple-choice">Trắc Nghiệm</option>
            <option value="essay">Tự Luận</option>
            <option value="mixed">Hỗn Hợp</option>
          </select>

          <input
            type="number"
            min="5"
            max="20"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
          />

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung Bình</option>
            <option value="hard">Khó</option>
          </select>

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Đang tạo câu hỏi..." : "Tạo Câu Hỏi"}
          </button>
        </div>
      ) : (
        <div className="review-section">
          <h2>Review Questions ({generatedAssignment.questionCount} câu)</h2>

          {generatedAssignment.questions.map((q, idx) => (
            <div key={idx} className="question-card">
              <h3>
                Câu {idx + 1} ({q.type}) - {q.points} điểm
              </h3>
              <p>{q.question}</p>

              {q.type === "multiple-choice" && (
                <div>
                  {q.options.map((opt, i) => (
                    <div key={i}>{opt}</div>
                  ))}
                  <p>
                    <strong>Đáp án: {q.correctAnswer}</strong>
                  </p>
                </div>
              )}

              {q.type === "essay" && (
                <div>
                  <p>
                    <strong>Rubric:</strong> {q.rubric}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="actions">
            <button onClick={handlePublish}>Publish Assignment</button>
            <button onClick={() => setGeneratedAssignment(null)}>
              Generate Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentCreatePage;
```

**Register Route**:

```jsx
// frontend/src/App.jsx
import AssignmentCreatePage from "./pages/AssignmentCreatePage";

// Thêm route:
<Route
  path="/instructor/assignment/create"
  element={<AssignmentCreatePage />}
/>;
```

---

#### 2.2. Assignment List Page - Student View (1 giờ)

**File**: `frontend/src/pages/StudentAssignmentListPage.jsx`

**Chức Năng**:

- Hiển thị tất cả published assignments
- Filter theo question type
- Click vào assignment → Redirect to làm bài

**Pseudocode**:

```jsx
function StudentAssignmentListPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await api.get("/assignment/list");
        setAssignments(response.data.assignments);
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const handleStart = async (assignmentId) => {
    try {
      const response = await api.post("/submission/start", { assignmentId });
      navigate(`/student/assignment/${response.data.submissionId}`);
    } catch (error) {
      alert("Failed to start assignment: " + error.response?.data?.error);
    }
  };

  return (
    <div className="container">
      <h1>Bài Tập Của Tôi</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="assignment-grid">
          {assignments.map((assignment) => (
            <div key={assignment._id} className="assignment-card">
              <h3>{assignment.title}</h3>
              <p>{assignment.description}</p>
              <div className="meta">
                <span>📝 {assignment.questionCount} câu hỏi</span>
                <span>🎯 {assignment.totalPoints} điểm</span>
                <span>
                  {assignment.settings.allowAI
                    ? "🤖 Cho phép AI"
                    : "🚫 Không AI"}
                </span>
              </div>
              <button onClick={() => handleStart(assignment._id)}>
                Bắt Đầu Làm Bài
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentAssignmentListPage;
```

---

#### 2.3. Assignment Taking Page (3-4 giờ) - QUAN TRỌNG NHẤT

**File**: `frontend/src/pages/AssignmentTakingPage.jsx`

**Chức Năng**:

- Hiển thị câu hỏi từng câu một
- Input trả lời (radio buttons cho MC, textarea cho essay)
- AI Chat sidebar luôn available
- Auto-save mỗi 30 giây
- Navigate giữa các câu hỏi
- Submit bài làm

**Pseudocode**:

```jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AIChat from "../components/AIChat";
import api from "../utils/api";

function AssignmentTakingPage() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch submission data
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await api.get(`/submission/${submissionId}`);
        setSubmission(response.data.submission);
        setAssignment(response.data.submission.assignmentId);

        // Populate existing answers
        const existingAnswers = {};
        response.data.submission.answers.forEach((ans) => {
          existingAnswers[ans.questionId] = ans.answer;
        });
        setAnswers(existingAnswers);
      } catch (error) {
        alert("Failed to load assignment: " + error.message);
        navigate("/student/assignments");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, navigate]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!submission || submission.status !== "draft") return;

    const autoSave = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(autoSave);
  }, [submission, answers]);

  const saveDraft = useCallback(async () => {
    try {
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
        }),
      );

      await api.put(`/submission/${submissionId}`, {
        answers: formattedAnswers,
      });
      console.log("Draft auto-saved");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [submissionId, answers]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (
      !confirm("Bạn có chắc muốn nộp bài? Sau khi nộp không thể chỉnh sửa.")
    ) {
      return;
    }

    // Save draft trước khi submit
    await saveDraft();

    try {
      const response = await api.post(`/submission/${submissionId}/submit`);
      alert(
        "Nộp bài thành công!\n\nĐiểm số:\n" +
          `Content: ${response.data.results.contentScore}/100\n` +
          `AI Skill: ${response.data.results.aiSkillScore}/100\n` +
          `Final: ${response.data.results.finalScore}/100`,
      );
      navigate(`/student/results/${submissionId}`);
    } catch (error) {
      alert("Submit failed: " + error.response?.data?.error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!assignment) return <div>Assignment not found</div>;

  const currentQuestion = assignment.questions[currentQuestionIndex];

  return (
    <div className="assignment-taking-page">
      <div className="main-content">
        <h1>{assignment.title}</h1>
        <div className="progress">
          Câu {currentQuestionIndex + 1} / {assignment.questions.length}
        </div>

        <div className="question-section">
          <h2>
            Câu {currentQuestionIndex + 1} ({currentQuestion.type}) -{" "}
            {currentQuestion.points} điểm
          </h2>
          <p>{currentQuestion.question}</p>

          {currentQuestion.type === "multiple-choice" && (
            <div className="options">
              {currentQuestion.options.map((option, idx) => (
                <label key={idx}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value={option[0]}
                    checked={answers[currentQuestion._id] === option[0]}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion._id, e.target.value)
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "essay" && (
            <textarea
              value={answers[currentQuestion._id] || ""}
              onChange={(e) =>
                handleAnswerChange(currentQuestion._id, e.target.value)
              }
              placeholder="Nhập câu trả lời của bạn..."
              rows={10}
            />
          )}
        </div>

        <div className="navigation">
          <button
            onClick={() =>
              setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
            }
            disabled={currentQuestionIndex === 0}
          >
            ← Câu Trước
          </button>

          <button onClick={saveDraft}>💾 Lưu Nháp</button>

          {currentQuestionIndex < assignment.questions.length - 1 ? (
            <button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
              Câu Tiếp →
            </button>
          ) : (
            <button onClick={handleSubmit} className="submit-button">
              📤 Nộp Bài
            </button>
          )}
        </div>
      </div>

      {assignment.settings.allowAI && (
        <div className="ai-chat-sidebar">
          <button onClick={() => setAiChatOpen(!aiChatOpen)}>
            {aiChatOpen ? "✖️ Đóng AI" : "🤖 Hỏi AI"}
          </button>

          {aiChatOpen && (
            <AIChat
              submissionId={submissionId}
              questionId={currentQuestion._id}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default AssignmentTakingPage;
```

---

### 3. Enhance Instructor Dashboard (2 giờ)

**File**: `frontend/src/pages/InstructorDashboardPage.jsx`

**Thay Mock Data bằng Real API Calls**:

```jsx
// Hiện tại (mock data):
const assignments = [
  { _id: "mock1", title: "Mock Assignment", status: "published" },
];

// Cần đổi thành:
const [assignments, setAssignments] = useState([]);
const [submissions, setSubmissions] = useState([]);

useEffect(() => {
  const fetchData = async () => {
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        api.get("/assignment/list"),
        api.get("/submission/instructor/all"),
      ]);

      setAssignments(assignmentsRes.data.assignments);
      setSubmissions(submissionsRes.data.submissions);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  fetchData();
}, []);
```

---

## 🟡 IMPORTANT - Nên Làm Sau Core (Cải Thiện UX)

### 4. Assignment Context với Auto-Save (2 giờ)

**File**: `frontend/src/contexts/AssignmentContext.jsx`

**Chức Năng**:

- Global state cho assignment đang làm
- Auto-save logic (tách riêng khỏi component)
- Tab visibility tracking
- Time tracking

**Pseudocode**:

```jsx
import { createContext, useState, useEffect, useContext } from "react";
import api from "../utils/api";

const AssignmentContext = createContext();

export function AssignmentProvider({ children }) {
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save mỗi 30 giây
  useEffect(() => {
    if (!submission || submission.status !== "draft") return;

    const interval = setInterval(async () => {
      await saveToBackend(answers);
      setLastSaved(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [submission, answers]);

  // Track tab switches
  useEffect(() => {
    if (!submission) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        api.post("/analytics/track-event", {
          submissionId: submission._id,
          eventType: "tab_switch",
          timestamp: new Date(),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submission]);

  const saveToBackend = async (currentAnswers) => {
    if (!submission) return;

    try {
      const formattedAnswers = Object.entries(currentAnswers).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
        }),
      );

      await api.put(`/submission/${submission._id}`, {
        answers: formattedAnswers,
      });
      console.log("Auto-saved at", new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  return (
    <AssignmentContext.Provider
      value={{
        submission,
        setSubmission,
        answers,
        setAnswers,
        lastSaved,
        saveToBackend,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export const useAssignment = () => useContext(AssignmentContext);
```

---

### 5. Results Page - Student View (1 giờ)

**File**: `frontend/src/pages/StudentResultsPage.jsx`

**Chức Năng**:

- Hiển thị điểm số (content, AI skill, final)
- Feedback từ hệ thống
- Review câu trả lời (đúng/sai)
- AI interaction summary

---

### 6. Manual Grading - Instructor (2 giờ)

**Backend**: Đã có endpoint `POST /submission/:id/grade`

**Frontend**: `frontend/src/pages/GradingInterface.jsx`

**Chức Năng**:

- Hiển thị bài essay của sinh viên
- Rubric bên cạnh
- Input điểm số
- Textarea feedback
- Submit grade

---

## 🟢 NICE TO HAVE - Tính Năng Mở Rộng (Làm Khi Có Thời Gian)

### 7. Assignment List - Instructor View với Advanced Filters (1 giờ)

### 8. AI Log Viewer với Timeline (2 giờ)

### 9. Export Logs & Scores ra Excel (1 giờ)

### 10. Real-time Progress Charts (2 giờ)

---

## 📋 CHECKLIST - Làm Theo Thứ Tự Này

**Phase 1: Core Infrastructure** (1-2 giờ)

- [ ] 1. Setup Azure Blob Storage
  - [ ] 1.1. Tạo Storage Account trong Azure Portal
  - [ ] 1.2. Tạo Container `assignment-documents`
  - [ ] 1.3. Copy connection string vào `.env`
  - [ ] 1.4. Test upload với script

**Phase 2: Frontend Assignment Workflow** (6-8 giờ)

- [ ] 2. Tạo Assignment Create Page
  - [ ] 2.1. Component cơ bản với file upload
  - [ ] 2.2. Call API /assignment/generate
  - [ ] 2.3. Review questions UI
  - [ ] 2.4. Publish button
  - [ ] 2.5. Register route trong App.jsx
  - [ ] 2.6. Test end-to-end

- [ ] 3. Tạo Student Assignment List Page
  - [ ] 3.1. Component với grid layout
  - [ ] 3.2. Fetch từ /assignment/list
  - [ ] 3.3. Filter UI
  - [ ] 3.4. Start assignment button
  - [ ] 3.5. Register route

- [ ] 4. Tạo Assignment Taking Page
  - [ ] 4.1. Component structure
  - [ ] 4.2. Fetch submission data
  - [ ] 4.3. Question display logic
  - [ ] 4.4. Answer input (radio + textarea)
  - [ ] 4.5. Navigation buttons
  - [ ] 4.6. Auto-save logic
  - [ ] 4.7. AI Chat sidebar integration
  - [ ] 4.8. Submit button + confirmation
  - [ ] 4.9. Register route
  - [ ] 4.10. Test full flow

**Phase 3: Dashboard Enhancement** (2 giờ)

- [ ] 5. Update Instructor Dashboard
  - [ ] 5.1. Replace mock data với real API
  - [ ] 5.2. Test analytics display
  - [ ] 5.3. Add loading states

**Phase 4: Polish** (2-3 giờ)

- [ ] 6. Create Assignment Context
  - [ ] 6.1. Context provider
  - [ ] 6.2. Auto-save logic
  - [ ] 6.3. Tab tracking
  - [ ] 6.4. Wrap App với provider

- [ ] 7. Create Results Page
  - [ ] 7.1. Component với score display
  - [ ] 7.2. Feedback section
  - [ ] 7.3. Review answers
  - [ ] 7.4. Register route

- [ ] 8. Manual Grading Interface
  - [ ] 8.1. Component với rubric
  - [ ] 8.2. Grade input
  - [ ] 8.3. Call POST /submission/:id/grade
  - [ ] 8.4. Register route

---

## 🧪 Testing Plan

**Sau Mỗi Phase, Test:**

**Phase 1 Test**:

```bash
# Test blob upload
cd backend
node -e "const {uploadToBlob} = require('./src/utils/blob'); uploadToBlob(Buffer.from('test'), 'test.txt', 'text/plain', 'test-user').then(console.log)"
```

**Phase 2 Test - Assignment Creation Flow**:

1. Login as instructor
2. Go to /instructor/assignment/create
3. Upload PDF file (sample: lorem ipsum PDF)
4. Select "Multiple Choice", 10 questions, "medium"
5. Click "Tạo Câu Hỏi"
6. Wait for AI (30-60 seconds)
7. Review questions
8. Click "Publish"
9. Check database: `db.assignments.findOne({status: 'published'})`

**Phase 2 Test - Student Assignment Flow**:

1. Login as student
2. Go to /student/assignments
3. See published assignment
4. Click "Bắt Đầu Làm Bài"
5. Answer first question
6. Wait 30 seconds → Check auto-save log
7. Click "🤖 Hỏi AI"
8. Ask question → Get response
9. Navigate to next question
10. Answer all questions
11. Click "Nộp Bài"
12. See results page with scores

**Phase 3 Test - Dashboard**:

1. Login as instructor
2. Go to /instructor/dashboard
3. See real assignments (not mock)
4. See real submissions
5. Check analytics numbers

---

## 🎓 Estimated Time

| Phase             | Tasks                  | Time      | Priority     |
| ----------------- | ---------------------- | --------- | ------------ |
| 1. Infrastructure | Azure Blob Setup       | 1-2 hours | 🔴 CRITICAL  |
| 2. Frontend Core  | Assignment Create Page | 2 hours   | 🔴 CRITICAL  |
|                   | Student List Page      | 1 hour    | 🔴 CRITICAL  |
|                   | Assignment Taking Page | 3-4 hours | 🔴 CRITICAL  |
| 3. Dashboard      | Replace Mock Data      | 2 hours   | 🟡 IMPORTANT |
| 4. Polish         | Context + Auto-save    | 2 hours   | 🟡 IMPORTANT |
|                   | Results Page           | 1 hour    | 🟡 IMPORTANT |
|                   | Manual Grading         | 2 hours   | 🟡 IMPORTANT |

**Total Critical Path**: 7-9 giờ
**Total Important**: 7 giờ
**Grand Total**: 14-16 giờ

---

## 🚀 Quick Start Commands

**Bắt Đầu Từ Đây**:

```bash
# 1. Setup Azure Blob (làm trong Azure Portal)
# → Hướng dẫn chi tiết ở trên

# 2. Chạy backend
cd backend
npm run dev

# 3. Chạy frontend (terminal mới)
cd frontend
npm run dev

# 4. Login as instructor
# Email: tran.van.a@university.edu.vn
# Password: password123

# 5. Tạo Assignment Create Page
# → Code ở trên, copy vào frontend/src/pages/AssignmentCreatePage.jsx

# 6. Register route
# → Thêm vào frontend/src/App.jsx

# 7. Test upload flow
# → Go to http://localhost:5173/instructor/assignment/create
```

---

## ✅ Definition of Done

**Hệ Thống Được Coi Là Hoàn Thành Khi**:

- [ ] ✅ Instructor có thể upload PDF → AI tạo câu hỏi → Review → Publish
- [ ] ✅ Student có thể xem danh sách assignments
- [ ] ✅ Student có thể làm bài + hỏi AI + auto-save + submit
- [ ] ✅ Student thấy kết quả (content score + AI skill score + feedback)
- [ ] ✅ Instructor thấy dashboard với real data (không phải mock)
- [ ] ✅ Instructor có thể xem logs AI của sinh viên
- [ ] ✅ Instructor có thể chấm bài tự luận

**Acceptance Criteria**:

- End-to-end flow hoạt động không lỗi
- Auto-save work đúng (test bằng F5 refresh)
- AI chat trả lời đúng và log được
- Scores tính toán chính xác
- Dashboard hiển thị đúng dữ liệu

---

## 🐛 Known Issues & Workarounds

### Issue 1: Azure Blob Chưa Setup

**Symptom**: Assignment generation fails at "Uploading to Azure Blob Storage..."

**Workaround**: Backend code đã handle - nếu blob fail, vẫn tiếp tục (chỉ không lưu file)

**Fix**: Setup Azure Blob theo hướng dẫn ở trên

### Issue 2: OpenAI Timeout

**Symptom**: "Failed to generate questions" sau 30 giây

**Workaround**: Reduce questionCount xuống 5, hoặc giảm document size

**Fix**: Increase timeout trong assignment.js hoặc dùng GPT-3.5-turbo (nhanh hơn)

### Issue 3: Auto-Save Conflicts

**Symptom**: Student đổi câu trả lời nhanh → auto-save overwrite

**Fix**: Dùng Assignment Context với debouncing (đã có trong plan)

---

## 📚 Resources

**Backend API Documentation**:

- Health check: `GET http://localhost:5000/api/health`
- OpenAPI docs: (chưa có, nên tạo)

**Frontend Component Library**:

- Đang dùng native HTML/CSS
- Có thể upgrade lên Material-UI hoặc Ant Design nếu muốn

**Azure Resources**:

- [Azure Blob Storage Quickstart](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs)
- [Application Insights Node.js](https://docs.microsoft.com/en-us/azure/azure-monitor/app/nodejs)

---

## 🎯 Next Steps

**HÔM NAY (Ưu Tiên Cao)**:

1. ✅ Setup Azure Blob Storage (1-2 giờ)
2. ✅ Tạo Assignment Create Page (2 giờ)
3. ✅ Test upload → generate → publish flow

**NGÀY MAI**: 4. ✅ Tạo Student Assignment List Page (1 giờ) 5. ✅ Tạo Assignment Taking Page (3-4 giờ) 6. ✅ Test full student workflow

**TUẦN NÀY**: 7. ✅ Update Instructor Dashboard 8. ✅ Tạo Results Page 9. ✅ Manual Grading Interface 10. ✅ Full system testing

---

**Good luck! 🚀 Bất cứ bước nào gặp vấn đề, hãy hỏi ngay!**
