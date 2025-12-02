# 🚀 QUICK START - Bắt Đầu Ngay

## 📋 Status Hiện Tại

✅ **Backend**: 85% complete - Tất cả API routes hoạt động
✅ **Database**: MongoDB Atlas connected, 5 users (2 instructors, 3 students)
✅ **AI Integration**: OpenAI GPT-4 đã config, AI chat + question generation hoạt động
⚠️ **Frontend**: 50% complete - Còn thiếu assignment pages
❌ **Azure Blob**: Chưa setup

---

## ⚡ Làm Gì Trước? (Priority Order)

### 🔴 CRITICAL - Làm Ngay Hôm Nay

**1. Setup Azure Blob Storage** (30 phút - 1 giờ)

Tại sao: Không có Blob → không lưu được tài liệu PDF/DOCX

```bash
# Azure Portal: portal.azure.com
1. Create Storage Account
   Name: aiassessment[random-number]
   Location: Southeast Asia
   Performance: Standard
   Redundancy: LRS

2. Create Container
   Name: assignment-documents
   Access: Private

3. Get Connection String
   Storage Account → Access keys → key1 → Connection string → Copy

4. Add to backend/.env
   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."
```

**Test ngay**:

```bash
cd backend
node -e "const {uploadToBlob} = require('./src/utils/blob'); uploadToBlob(Buffer.from('test'), 'test.txt', 'text/plain', 'test').then(url => console.log('✅ SUCCESS:', url)).catch(err => console.error('❌ FAILED:', err.message))"
```

Expected output:

```
✅ SUCCESS: https://aiassessment123.blob.core.windows.net/assignment-documents/test/...
```

---

**2. Tạo Assignment Create Page** (2 giờ)

Copy code này vào `frontend/src/pages/AssignmentCreatePage.jsx`:

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function AssignmentCreatePage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionType, setQuestionType] = useState("multiple-choice");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [generatedAssignment, setGeneratedAssignment] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Vui lòng chọn file");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    formData.append("title", title || `Bài tập từ ${file.name}`);
    formData.append("description", description || "Được tạo tự động");
    formData.append("questionType", questionType);
    formData.append("questionCount", questionCount);
    formData.append("difficulty", difficulty);

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/assignment/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Generated:", response.data);
      setGeneratedAssignment(response.data);
      alert(`✅ Tạo thành công ${response.data.questions.length} câu hỏi!`);
    } catch (err) {
      console.error("❌ Generation failed:", err);
      setError(err.response?.data?.error || err.message);
      alert("❌ Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/assignment/${generatedAssignment.assignmentId}/publish`);
      alert("✅ Đã publish thành công!");
      navigate("/instructor/dashboard");
    } catch (err) {
      alert("❌ Publish failed: " + err.response?.data?.error);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1>🎓 Tạo Bài Tập Mới</h1>

      {!generatedAssignment ? (
        <form
          onSubmit={handleGenerate}
          style={{
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <label>📄 Upload Tài Liệu (PDF, DOCX, TXT):</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files[0])}
              required
              style={{ display: "block", marginTop: "5px" }}
            />
            {file && <small>✅ Đã chọn: {file.name}</small>}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>📝 Tiêu đề:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bài tập tuần 1..."
              style={{
                display: "block",
                width: "100%",
                padding: "8px",
                marginTop: "5px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>📋 Mô tả:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bài tập về chương 1..."
              rows={3}
              style={{
                display: "block",
                width: "100%",
                padding: "8px",
                marginTop: "5px",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "15px",
              marginBottom: "15px",
            }}
          >
            <div>
              <label>📝 Loại câu hỏi:</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                }}
              >
                <option value="multiple-choice">Trắc Nghiệm</option>
                <option value="essay">Tự Luận</option>
                <option value="mixed">Hỗn Hợp</option>
              </select>
            </div>

            <div>
              <label>🔢 Số câu hỏi:</label>
              <input
                type="number"
                min="5"
                max="20"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div>
              <label>⚡ Độ khó:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                }}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung Bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: loading ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "⏳ Đang tạo câu hỏi... (30-60 giây)"
              : "🚀 Tạo Câu Hỏi Với AI"}
          </button>

          {error && (
            <div style={{ color: "red", marginTop: "10px" }}>
              ❌ Lỗi: {error}
            </div>
          )}
        </form>
      ) : (
        <div>
          <div
            style={{
              background: "#e8f5e9",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <h2>
              ✅ Đã Tạo {generatedAssignment.assignment.questionCount} Câu Hỏi
            </h2>
            <p>
              <strong>Tổng điểm:</strong>{" "}
              {generatedAssignment.assignment.totalPoints} điểm
            </p>
            <p>
              <strong>Loại:</strong>{" "}
              {generatedAssignment.assignment.questionType}
            </p>
          </div>

          <h3>📝 Review Câu Hỏi</h3>
          {generatedAssignment.assignment.questions.map((q, idx) => (
            <div
              key={idx}
              style={{
                background: "white",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "1px solid #ddd",
              }}
            >
              <h4>
                Câu {idx + 1}:{" "}
                {q.type === "multiple-choice" ? "📊 Trắc Nghiệm" : "✍️ Tự Luận"}{" "}
                - {q.points} điểm
              </h4>
              <p style={{ fontSize: "16px", margin: "10px 0" }}>{q.question}</p>

              {q.type === "multiple-choice" && (
                <>
                  <div style={{ marginLeft: "20px" }}>
                    {q.options.map((opt, i) => (
                      <div key={i} style={{ margin: "5px 0" }}>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      marginTop: "10px",
                      background: "#fff3cd",
                      padding: "8px",
                      borderRadius: "4px",
                    }}
                  >
                    <strong>✅ Đáp án đúng:</strong> {q.correctAnswer}
                  </p>
                  {q.explanation && (
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        marginTop: "5px",
                      }}
                    >
                      💡 {q.explanation}
                    </p>
                  )}
                </>
              )}

              {q.type === "essay" && (
                <>
                  <p
                    style={{
                      background: "#e3f2fd",
                      padding: "10px",
                      borderRadius: "4px",
                      marginTop: "10px",
                    }}
                  >
                    <strong>📋 Rubric:</strong> {q.rubric}
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      marginTop: "5px",
                    }}
                  >
                    ⏱️ Thời gian ước tính: {q.estimatedTime} phút
                  </p>
                </>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={handlePublish}
              style={{
                padding: "12px 24px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              📤 Publish Bài Tập
            </button>

            <button
              onClick={() => {
                setGeneratedAssignment(null);
                setFile(null);
              }}
              style={{
                padding: "12px 24px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              🔄 Tạo Lại
            </button>

            <button
              onClick={() => navigate("/instructor/dashboard")}
              style={{
                padding: "12px 24px",
                background: "#9E9E9E",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ← Quay Lại Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentCreatePage;
```

**Đăng ký route** trong `frontend/src/App.jsx`:

```jsx
import AssignmentCreatePage from "./pages/AssignmentCreatePage";

// Thêm route:
<Route
  path="/instructor/assignment/create"
  element={<AssignmentCreatePage />}
/>;
```

**Test ngay**:

```bash
cd frontend
npm run dev

# Mở browser: http://localhost:5173/instructor/assignment/create
# Login với instructor account
# Upload file PDF
# Click "Tạo Câu Hỏi Với AI"
# Đợi 30-60 giây
# Review questions
# Click "Publish"
```

---

## 🧪 Test Commands

### Backend Health Check

```bash
curl http://localhost:5000/api/health
```

Expected output:

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development",
  "database": "connected",
  "openai": "configured"
}
```

### Test Assignment Generation API

```bash
# Windows PowerShell
$file = Get-Content "test.txt" -Raw -Encoding UTF8
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"document`"; filename=`"test.txt`"",
    "Content-Type: text/plain$LF",
    $file,
    "--$boundary",
    "Content-Disposition: form-data; name=`"questionType`"$LF",
    "multiple-choice",
    "--$boundary",
    "Content-Disposition: form-data; name=`"questionCount`"$LF",
    "5",
    "--$boundary",
    "Content-Disposition: form-data; name=`"difficulty`"$LF",
    "medium",
    "--$boundary--$LF"
) -join $LF

Invoke-RestMethod -Uri "http://localhost:5000/api/assignment/generate" `
  -Method Post `
  -Headers @{Authorization="Bearer YOUR_INSTRUCTOR_TOKEN"} `
  -ContentType "multipart/form-data; boundary=`"$boundary`"" `
  -Body $bodyLines
```

### List All Users (Check Database)

```bash
cd backend
node list-users.js
```

Expected output:

```
=== All Users ===
Found 5 users

1. [STUDENT] Nguyễn Văn A
   Email: nguyen.van.a@student.university.edu.vn
   ID: 676df...
   Created: 2024-01-15

2. [INSTRUCTOR] Trần Văn A
   Email: tran.van.a@university.edu.vn
   ID: 676e0...
   Department: Computer Science
   Created: 2024-01-15

...
```

### Check MongoDB Connection

```bash
cd backend
node -e "require('./src/config/database').connectDB().then(() => {console.log('✅ MongoDB connected'); process.exit(0)}).catch(err => {console.error('❌ MongoDB failed:', err.message); process.exit(1)})"
```

---

## 🐛 Troubleshooting

### Problem 1: Backend không start

**Symptom**:

```
Error: Route.get() requires a callback function but got a [object Undefined]
```

**Fix**: Đã fix rồi trong `backend/src/routes/logs.js` line 87

**Verify**:

```bash
cd backend
grep "auth.all" src/routes/logs.js
# Should return nothing

grep "auth.authenticate" src/routes/logs.js
# Should return: router.get('/export', auth.authenticate, async (req, res) => {
```

---

### Problem 2: OpenAI API Key không work

**Symptom**:

```
Error: OpenAI API is not configured
```

**Fix**:

```bash
# Check .env có OPENAI_API_KEY chưa
cd backend
cat .env | grep OPENAI_API_KEY

# Nếu không có, add:
echo "OPENAI_API_KEY=sk-..." >> .env

# Restart backend
npm run dev
```

**Test**:

```bash
# Test OpenAI connection
node -e "const OpenAI = require('openai'); const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY}); client.chat.completions.create({model:'gpt-3.5-turbo',messages:[{role:'user',content:'Hi'}]}).then(r => console.log('✅ OpenAI OK:', r.choices[0].message.content)).catch(e => console.error('❌ OpenAI failed:', e.message))"
```

---

### Problem 3: Frontend không gọi được Backend

**Symptom**:

```
CORS error / Network error
```

**Fix**:

Check `frontend/src/utils/api.js` có đúng base URL không:

```javascript
const api = axios.create({
  baseURL: "http://localhost:5000/api", // ← Phải đúng port
  withCredentials: true,
});
```

Check backend logs có log request không:

```
📨 POST /assignment/generate
```

---

### Problem 4: Không thấy assignments sau khi publish

**Symptom**: Dashboard empty

**Check Database**:

```bash
cd backend
node -e "require('./src/config/database').connectDB().then(async () => {const {Assignment} = require('./src/models'); const assignments = await Assignment.find({}); console.log('Assignments:', assignments.length); assignments.forEach(a => console.log('-', a.title, a.status)); process.exit(0)})"
```

Expected output:

```
Assignments: 1
- Bài tập từ test.pdf published
```

**Fix nếu status='draft'**:

```bash
node -e "require('./src/config/database').connectDB().then(async () => {const {Assignment} = require('./src/models'); await Assignment.findOneAndUpdate({}, {status:'published'}); console.log('✅ Published'); process.exit(0)})"
```

---

## 📂 File Structure Summary

```
DoAnChuyenNganh/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Assignment.js ✅ (100% spec-compliant)
│   │   │   ├── AssignmentSubmission.js ✅
│   │   │   ├── AI_Log.js ✅
│   │   │   └── User.js ✅
│   │   ├── routes/
│   │   │   ├── assignment.js ✅ (có POST /generate, GET /list)
│   │   │   ├── submission.js ✅ (có auto-grading)
│   │   │   ├── ai.js ✅ (AI chat + logging)
│   │   │   ├── auth.js ✅
│   │   │   ├── analytics.js ✅
│   │   │   └── logs.js ✅ (fixed bug)
│   │   ├── utils/
│   │   │   ├── questionGenerator.js ✅ (NEW - just created)
│   │   │   ├── grading.js ✅ (NEW - just created)
│   │   │   ├── documentParser.js ✅
│   │   │   └── blob.js ✅
│   │   ├── middleware/
│   │   │   ├── auth.js ✅
│   │   │   ├── upload.js ✅
│   │   │   └── security.js ✅
│   │   └── config/
│   │       ├── database.js ✅
│   │       └── appInsights.js ✅
│   ├── .env ✅ (có OPENAI_API_KEY, MONGODB_URI)
│   └── package.json ✅
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx ✅
│   │   │   ├── StudentRegisterPage.jsx ✅
│   │   │   ├── InstructorRegisterPage.jsx ✅
│   │   │   ├── InstructorDashboardPage.jsx ⚠️ (uses mock data)
│   │   │   ├── AssignmentCreatePage.jsx ❌ (need to create)
│   │   │   ├── StudentAssignmentListPage.jsx ❌
│   │   │   └── AssignmentTakingPage.jsx ❌
│   │   ├── components/
│   │   │   └── AIChat.jsx ✅
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx ✅
│   │   └── utils/
│   │       └── api.js ✅
│   └── package.json ✅
│
├── COMPLIANCE_CHECK.md ✅ (comprehensive audit)
├── ACTION_PLAN.md ✅ (this file)
└── QUICK_START.md ✅ (this guide)
```

---

## 🎯 What to Do RIGHT NOW

**Step 1**: Setup Azure Blob (30 phút)
→ Follow hướng dẫn ở đầu file

**Step 2**: Create Assignment Create Page (2 giờ)
→ Copy code ở trên vào `frontend/src/pages/AssignmentCreatePage.jsx`

**Step 3**: Test End-to-End (15 phút)

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login as instructor
4. Go to `/instructor/assignment/create`
5. Upload PDF file
6. Generate questions
7. Review & publish
8. Check database: `node -e "...Assignment.find()..."`

---

## ✅ Success Criteria

Hệ thống OK khi:

- ✅ Backend starts without errors
- ✅ Frontend connects to backend (no CORS errors)
- ✅ Can login as instructor
- ✅ Can upload document
- ✅ AI generates questions (30-60 seconds)
- ✅ Can review questions
- ✅ Can publish assignment
- ✅ Assignment appears in database with status='published'

---

## 🆘 Need Help?

**Check Logs**:

```bash
# Backend logs
cd backend
npm run dev
# Watch terminal for errors

# Frontend logs
cd frontend
npm run dev
# Watch browser console for errors
```

**Check Environment**:

```bash
cd backend
cat .env | grep -E "MONGODB_URI|OPENAI_API_KEY|AZURE_STORAGE"
```

**Test Individual Components**:

```bash
# Test MongoDB
node -e "require('./src/config/database').connectDB().then(() => console.log('✅ DB OK')).catch(e => console.error('❌ DB FAIL:', e.message))"

# Test OpenAI
node -e "const OpenAI = require('openai'); new OpenAI({apiKey: process.env.OPENAI_API_KEY}).chat.completions.create({model:'gpt-3.5-turbo',messages:[{role:'user',content:'test'}]}).then(() => console.log('✅ AI OK')).catch(e => console.error('❌ AI FAIL:', e.message))"

# Test Blob Storage
node -e "const {isBlobStorageConfigured} = require('./src/utils/blob'); console.log('Blob configured:', isBlobStorageConfigured())"
```

---

**START HERE**: Setup Azure Blob → Create Assignment Page → Test!

Good luck! 🚀
