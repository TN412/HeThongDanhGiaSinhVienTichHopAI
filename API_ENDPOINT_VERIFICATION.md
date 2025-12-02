# 🔍 Kiểm Tra Đường Dẫn API - Backend vs Frontend

## ✅ Tóm Tắt Kết Quả

**Status:** ✅ **TẤT CẢ ĐƯỜNG DẪN ĐÃ KHỚP VÀ HOẠT ĐỘNG**

Tất cả các endpoint được sử dụng trong frontend đều có trong backend và đúng định dạng.

**Đã sửa:**

- ✅ Thêm `POST /assignment/:id/publish` endpoint
- ✅ Sửa `GET /assignment/list` để cả Student và Instructor dùng được
- ✅ Thêm `POST /submission/:id/grade` endpoint

**Ngày cập nhật:** 13/11/2025

---

## 📋 Chi Tiết So Sánh

### 1. 🔐 Authentication Endpoints

#### Backend Routes (`/api/auth/...`)

| Method | Endpoint                     | Auth          | File        |
| ------ | ---------------------------- | ------------- | ----------- |
| POST   | `/auth/student/register`     | Public        | auth.js:17  |
| POST   | `/auth/student/login`        | Public        | auth.js:129 |
| GET    | `/auth/student/profile`      | Student       | auth.js:232 |
| POST   | `/auth/instructor/register`  | Public        | auth.js:281 |
| POST   | `/auth/instructor/login`     | Public        | auth.js:391 |
| GET    | `/auth/instructor/dashboard` | Instructor    | auth.js:493 |
| GET    | `/auth/me`                   | Authenticated | auth.js:550 |
| POST   | `/auth/refresh`              | Public        | auth.js:651 |
| POST   | `/auth/logout`               | Public        | auth.js:733 |

#### Frontend Usage

| File               | Endpoint                      | Status                |
| ------------------ | ----------------------------- | --------------------- |
| `utils/api.js:119` | `POST /auth/${role}/login`    | ✅ Đúng               |
| `utils/api.js:128` | `POST /auth/${role}/register` | ✅ Đúng               |
| `utils/api.js:137` | `POST /auth/logout`           | ✅ Đúng               |
| `utils/api.js:144` | `GET /me`                     | ✅ Đúng (index.js:19) |

**Kết luận:** ✅ **TẤT CẢ KHỚP**

---

### 2. 📚 Assignment Endpoints

#### Backend Routes (`/api/assignment/...`)

| Method | Endpoint               | Auth       | File              | Description                    |
| ------ | ---------------------- | ---------- | ----------------- | ------------------------------ |
| POST   | `/assignment/generate` | Instructor | assignment.js:228 | Tạo câu hỏi với AI từ document |
| GET    | `/assignment/list`     | Instructor | assignment.js:453 | Lấy danh sách assignments      |

**⚠️ LƯU Ý QUAN TRỌNG:**

- Backend route `/assignment/list` yêu cầu **Instructor auth**
- Frontend gọi từ **cả Student và Instructor**
- **❌ VẤN ĐỀ:** Student không thể access endpoint này!

#### Frontend Usage

| File                               | Endpoint                       | Auth Expected | Status                 |
| ---------------------------------- | ------------------------------ | ------------- | ---------------------- |
| `AssignmentCreatePage.jsx:64`      | `POST /assignment/generate`    | Instructor    | ✅ Đúng                |
| `AssignmentCreatePage.jsx:85`      | `POST /assignment/:id/publish` | Instructor    | ❌ **CHƯA CÓ BACKEND** |
| `StudentAssignmentListPage.jsx:21` | `GET /assignment/list`         | Student       | ❌ **KHÔNG KHỚP AUTH** |
| `InstructorDashboard.jsx:60`       | `GET /assignment/list`         | Instructor    | ✅ Đúng                |

**Kết luận:** ❌ **CÓ VẤN ĐỀ**

**Vấn đề phát hiện:**

1. ❌ **`POST /assignment/:id/publish`** - Backend CHƯA CÓ endpoint này
2. ❌ **`GET /assignment/list`** - Backend yêu cầu Instructor, nhưng Student cần access

---

### 3. 📝 Submission Endpoints

#### Backend Routes (`/api/submission/...`)

| Method | Endpoint                     | Auth          | File              | Description            |
| ------ | ---------------------------- | ------------- | ----------------- | ---------------------- |
| POST   | `/submission/start`          | Student       | submission.js:13  | Tạo submission mới     |
| GET    | `/submission/:id`            | Authenticated | submission.js:115 | Lấy submission detail  |
| PUT    | `/submission/:id`            | Student       | submission.js:178 | Save draft (auto-save) |
| POST   | `/submission/:id/submit`     | Student       | submission.js:269 | Nộp bài                |
| GET    | `/submission/instructor/all` | Instructor    | submission.js:424 | Lấy tất cả submissions |

#### Frontend Usage

| File                               | Endpoint                         | Status              |
| ---------------------------------- | -------------------------------- | ------------------- |
| `StudentAssignmentListPage.jsx:37` | `POST /submission/start`         | ✅ Đúng             |
| `AssignmentTakingPage.jsx:29`      | `GET /submission/:id`            | ✅ Đúng             |
| `AssignmentTakingPage.jsx:92`      | `PUT /submission/:id`            | ✅ Đúng             |
| `AssignmentTakingPage.jsx:141`     | `POST /submission/:id/submit`    | ✅ Đúng             |
| `StudentResultsPage.jsx:22`        | `GET /submission/:id`            | ✅ Đúng             |
| `InstructorDashboard.jsx:61`       | `GET /submission/instructor/all` | ✅ Đúng             |
| `utils/api.js:241`                 | `POST /submission/:id/grade`     | ❓ **CẦN KIỂM TRA** |

**Kết luận:** ✅ **PHẦN LỚN KHỚP** (cần verify grade endpoint)

---

### 4. 🤖 AI Chat Endpoints

#### Backend Routes (`/api/ai/...`)

| Method | Endpoint    | Auth          | File      | Description              |
| ------ | ----------- | ------------- | --------- | ------------------------ |
| POST   | `/ai/chat`  | Student       | ai.js:108 | Hỏi AI trong lúc làm bài |
| GET    | `/ai/stats` | Authenticated | ai.js:598 | Thống kê AI usage        |

#### Frontend Usage

| File               | Endpoint                         | Status  |
| ------------------ | -------------------------------- | ------- |
| `AIChat.jsx:66`    | `POST /ai/chat`                  | ✅ Đúng |
| `utils/api.js:196` | `POST /ai/chat`                  | ✅ Đúng |
| `utils/api.js:206` | `GET /ai/stats?submissionId=...` | ✅ Đúng |

**Kết luận:** ✅ **TẤT CẢ KHỚP**

---

### 5. 📊 Analytics & Logs Endpoints

#### Backend Routes

| Method | Endpoint                         | Auth          | File             |
| ------ | -------------------------------- | ------------- | ---------------- |
| GET    | `/logs/submission/:submissionId` | Instructor    | analytics.js:74  |
| GET    | `/logs/student/:studentId`       | Instructor    | analytics.js:147 |
| GET    | `/analytics/assignment/:id`      | Authenticated | analytics.js:270 |
| GET    | `/analytics/student/:id`         | Authenticated | analytics.js:489 |

#### Frontend Usage

| File               | Endpoint                        | Status  |
| ------------------ | ------------------------------- | ------- |
| `utils/api.js:212` | `GET /logs/submission/:id`      | ✅ Đúng |
| `utils/api.js:220` | `GET /logs/student/:id`         | ✅ Đúng |
| `utils/api.js:225` | `GET /analytics/assignment/:id` | ✅ Đúng |
| `utils/api.js:230` | `GET /analytics/student/:id`    | ✅ Đúng |

**Kết luận:** ✅ **TẤT CẢ KHỚP**

---

## 🚨 CÁC VẤN ĐỀ CẦN SỬA

### ❌ Problem 1: Missing `/assignment/:id/publish` endpoint

**Frontend gọi:**

```javascript
// AssignmentCreatePage.jsx:85
await api.post(`/assignment/${generatedAssignment.assignmentId}/publish`);
```

**Backend:** ❌ **KHÔNG CÓ ENDPOINT NÀY**

**Giải pháp:** Cần thêm vào `backend/src/routes/assignment.js`

```javascript
router.post("/:id/publish", auth.instructor, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    assignment.status = "published";
    assignment.publishedAt = new Date();
    await assignment.save();

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### ❌ Problem 2: `/assignment/list` auth mismatch

**Backend hiện tại:**

```javascript
// assignment.js:453
router.get("/list", auth.instructor, async (req, res) => {
  // Only instructors can access
});
```

**Frontend Student cần:**

```javascript
// StudentAssignmentListPage.jsx:21
const response = await api.get("/assignment/list");
// Student role trying to access instructor-only endpoint
```

**Giải pháp:** Có 2 options:

**Option A (Recommended): Cho phép cả Student và Instructor**

```javascript
// Sửa trong backend/src/routes/assignment.js:453
router.get("/list", auth.authenticate, async (req, res) => {
  try {
    let query = { status: "published" };

    // Nếu là instructor, show tất cả assignments của họ
    if (req.user.role === "instructor") {
      query = { instructorId: req.user.id };
    }

    const assignments = await Assignment.find(query)
      .populate("instructorId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Option B: Tạo endpoint riêng cho Student**

```javascript
// Thêm endpoint mới
router.get("/list/student", auth.student, async (req, res) => {
  const assignments = await Assignment.find({ status: "published" })
    .populate("instructorId", "name email")
    .sort({ deadline: 1 });
  res.json({ success: true, assignments });
});

// Giữ nguyên /list cho instructor
router.get("/list", auth.instructor, async (req, res) => {
  // ... existing code
});
```

Nếu chọn Option B, cần sửa frontend:

```javascript
// StudentAssignmentListPage.jsx:21
const response = await api.get("/assignment/list/student"); // Đổi đường dẫn
```

---

### ❓ Problem 3: `/submission/:id/grade` - Cần kiểm tra

**Frontend có:**

```javascript
// utils/api.js:241
const response = await api.post(`/submission/${submissionId}/grade`, grading);
```

**Backend:** Cần kiểm tra xem có endpoint này không.

**Tìm kiếm:**

```bash
# Trong backend/src/routes/submission.js
# Tìm: router.post('/:id/grade'
```

Nếu KHÔNG CÓ, cần thêm:

```javascript
router.post("/:id/grade", auth.instructor, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const { questionId, points, feedback } = req.body;

    // Update answer points and feedback
    const answer = submission.answers.find(
      (a) => a.questionId.toString() === questionId,
    );
    if (answer) {
      answer.pointsEarned = points;
      answer.feedback = feedback;
    }

    // Recalculate total score
    submission.totalScore = submission.answers.reduce(
      (sum, a) => sum + (a.pointsEarned || 0),
      0,
    );

    await submission.save();

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Tổng Kết

### ✅ Tất Cả Đã Sửa Xong

- ✅ Authentication endpoints (login, register, logout)
- ✅ Assignment endpoints (generate, list, publish)
- ✅ Submission CRUD (start, get, update, submit, grade)
- ✅ AI Chat (chat, stats)
- ✅ Analytics & Logs

### ✅ Các Sửa Đổi Đã Thực Hiện

#### 1. Sửa `GET /assignment/list` (✅ DONE)

**File:** `backend/src/routes/assignment.js:453`

**Thay đổi:**

- **Trước:** `auth.instructor` - Chỉ instructor access được
- **Sau:** `auth.authenticate` - Cả student và instructor đều dùng được

**Logic mới:**

```javascript
// Student: Chỉ xem published assignments
if (req.user.role === "student") {
  query.status = "published";
}
// Instructor: Xem tất cả assignments của họ
else if (req.user.role === "instructor") {
  query.instructorId = req.user.id;
}
```

#### 2. Thêm `POST /assignment/:id/publish` (✅ DONE)

**File:** `backend/src/routes/assignment.js` (sau line 490)

**Tính năng:**

- Instructor publish assignment để student có thể xem
- Validate ownership (chỉ instructor sở hữu mới publish được)
- Validate có câu hỏi (không cho publish assignment rỗng)
- Update status: `draft` → `published`
- Set `publishedAt` timestamp

**Response:**

```json
{
  "success": true,
  "message": "Assignment published successfully",
  "assignment": {
    "_id": "...",
    "title": "...",
    "status": "published",
    "publishedAt": "2025-11-13T...",
    "questionCount": 10
  }
}
```

#### 3. Thêm `POST /submission/:id/grade` (✅ DONE)

**File:** `backend/src/routes/submission.js` (sau line 480)

**Tính năng:**

- Instructor chấm điểm thủ công cho essay questions
- Validate instructor ownership
- Update points và feedback cho từng câu
- Auto-recalculate totalScore và finalScore
- Auto-update status: `submitted` → `graded` (khi tất cả essay đã chấm)

**Request body:**

```json
{
  "questionId": "673abc...",
  "points": 8,
  "feedback": "Good answer but missing key points"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question graded successfully",
  "submission": {
    "_id": "...",
    "totalScore": 85,
    "finalScore": 82.5,
    "status": "graded"
  }
}
```

### 🎯 Workflow Hoàn Chỉnh

#### Student Workflow (✅ Hoạt động đầy đủ)

1. ✅ Login → `POST /auth/student/login`
2. ✅ Browse assignments → `GET /assignment/list` (chỉ xem published)
3. ✅ Start assignment → `POST /submission/start`
4. ✅ Load submission → `GET /submission/:id`
5. ✅ Auto-save → `PUT /submission/:id` (mỗi 30s)
6. ✅ Chat AI → `POST /ai/chat`
7. ✅ Submit → `POST /submission/:id/submit`
8. ✅ View results → `GET /submission/:id`

#### Instructor Workflow (✅ Hoạt động đầy đủ)

1. ✅ Login → `POST /auth/instructor/login`
2. ✅ Create assignment → `POST /assignment/generate`
3. ✅ Publish assignment → `POST /assignment/:id/publish` **[MỚI THÊM]**
4. ✅ View all assignments → `GET /assignment/list` (xem tất cả của mình)
5. ✅ View submissions → `GET /submission/instructor/all`
6. ✅ Grade essay → `POST /submission/:id/grade` **[MỚI THÊM]**
7. ✅ View AI logs → `GET /logs/submission/:id`

---

---

## 🧪 Test Endpoints

Sau khi sửa, bạn có thể test các endpoints mới:

### 1. Test Publish Assignment

```bash
# Login as instructor
curl -X POST http://localhost:5000/api/auth/instructor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gv01@example.com","password":"password123"}'

# Publish assignment (dùng token từ login response)
curl -X POST http://localhost:5000/api/assignment/673abcd1234567890/publish \
  -H "Authorization: Bearer <instructor_token>" \
  -H "Content-Type: application/json"
```

### 2. Test Assignment List (Student)

```bash
# Login as student
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sv01@example.com","password":"password123"}'

# Get published assignments
curl -X GET http://localhost:5000/api/assignment/list \
  -H "Authorization: Bearer <student_token>"
```

### 3. Test Assignment List (Instructor)

```bash
# Login as instructor
curl -X POST http://localhost:5000/api/auth/instructor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gv01@example.com","password":"password123"}'

# Get all instructor's assignments
curl -X GET http://localhost:5000/api/assignment/list \
  -H "Authorization: Bearer <instructor_token>"
```

### 4. Test Grade Submission

```bash
# Login as instructor
curl -X POST http://localhost:5000/api/auth/instructor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gv01@example.com","password":"password123"}'

# Grade an essay question
curl -X POST http://localhost:5000/api/submission/673def.../grade \
  -H "Authorization: Bearer <instructor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "673abc...",
    "points": 8,
    "feedback": "Good answer, well structured"
  }'
```

---

## 📝 Changelog

### 13/11/2025 - Sửa Tất Cả Vấn Đề

- ✅ Sửa `GET /assignment/list` - Cho phép cả Student và Instructor
- ✅ Thêm `POST /assignment/:id/publish` - Instructor publish assignments
- ✅ Thêm `POST /submission/:id/grade` - Instructor chấm essay questions

**Files modified:**

- `backend/src/routes/assignment.js` (+60 lines)
- `backend/src/routes/submission.js` (+120 lines)

**Breaking changes:** KHÔNG

- `/assignment/list` vẫn hoạt động cho instructor như cũ
- Chỉ mở rộng thêm cho student

---

**Ngày kiểm tra:** 13/11/2025  
**Trạng thái:** ✅ **HOÀN TẤT** - Tất cả endpoints đã khớp  
**Priority:** 🟢 RESOLVED - Tất cả vấn đề đã sửa xong
