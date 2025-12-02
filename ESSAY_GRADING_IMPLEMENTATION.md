# Essay Grading Workflow Implementation

## Overview

Implemented a complete essay grading workflow where essay questions must wait for instructor manual grading instead of auto-scoring at submission time.

## Implementation Date

2025-01-XX

## Status

✅ **COMPLETED** - Backend and frontend fully implemented

---

## Key Changes

### 1. Database Model Updates

#### AssignmentSubmission Model

**File:** `backend/src/models/AssignmentSubmission.js`

Added new status to enum:

```javascript
status: {
  type: String,
  enum: ['draft', 'submitted', 'pending_grading', 'graded'],
  default: 'draft'
}
```

**Status Flow:**

- `draft` → Initial state when student starts assignment
- `submitted` → Auto-graded multiple-choice submissions with final scores
- `pending_grading` → Submissions with essay questions awaiting instructor grading
- `graded` → All questions (including essays) have been graded

---

### 2. Backend Logic Changes

#### Submission Route (POST /api/submission/:id/submit)

**File:** `backend/src/routes/submission.js`

**Key Logic:**

```javascript
// 1. Detect essay questions
const hasEssayQuestions = assignment.questions.some((q) => q.type === "essay");
let needsManualGrading = false;

// 2. Process answers
for (let answer of submission.answers) {
  const question = assignment.questions.id(answer.questionId);

  if (question.type === "multiple-choice") {
    // Auto-grade immediately
    answer.isCorrect = answer.answer === question.correctAnswer;
    answer.pointsEarned = answer.isCorrect ? question.points : 0;
    totalScore += answer.pointsEarned;
  } else if (question.type === "essay") {
    // Mark as ungraded
    answer.pointsEarned = undefined;
    needsManualGrading = true;
  }
}

// 3. Set status based on grading needs
if (!needsManualGrading) {
  // All questions auto-graded → calculate final score
  submission.status = "submitted";
  submission.contentScore = (totalScore / assignment.totalPoints) * 10;
  submission.aiSkillScore = aiSkillScore;
  submission.finalScore =
    submission.contentScore * 0.7 + submission.aiSkillScore * 0.3;
} else {
  // Has essays → wait for instructor
  submission.status = "pending_grading";
  submission.contentScore = null;
  submission.finalScore = null;
  submission.aiSkillScore = aiSkillScore; // Still calculate AI skill
}
```

#### Essay Grading Route (POST /api/submission/:id/grade-question)

**File:** `backend/src/routes/submission.js`

**Key Logic:**

```javascript
// 1. Instructor grades individual essay question
const answer = submission.answers.find((a) => a.questionId === questionId);
answer.pointsEarned = pointsEarned;
answer.feedback = feedback;

// 2. Check if all essays are now graded
const allEssayGraded = submission.answers.every((answer) => {
  const q = assignment.questions.id(answer.questionId);
  return q?.type !== "essay" || answer.pointsEarned !== undefined;
});

// 3. Calculate final score when complete
if (allEssayGraded) {
  const totalScore = submission.answers.reduce(
    (sum, a) => sum + (a.pointsEarned || 0),
    0,
  );
  const contentScore = (totalScore / assignment.totalPoints) * 10;
  const aiSkillScore = submission.aiSkillScore || 0;

  submission.contentScore = contentScore;
  submission.finalScore = contentScore * 0.7 + aiSkillScore * 0.3;
  submission.status = "graded"; // Transition to graded
}
```

---

### 3. Frontend Changes

#### MySubmissionsPage Component

**File:** `frontend/src/pages/MySubmissionsPage.jsx`

**Changes:**

1. Added `pending_grading` to status badge mapping
2. Added "Chờ Chấm" filter tab
3. Added pending message display when status is pending_grading:

```jsx
{
  submission.status === "pending_grading" && (
    <div className="pending-message">
      <span className="pending-icon">⏳</span>
      <div className="pending-text">
        <strong>Đang chờ giảng viên chấm bài tự luận</strong>
        <p>
          Bài làm của bạn đã được nộp thành công. Vui lòng chờ giảng viên chấm
          điểm.
        </p>
      </div>
    </div>
  );
}
```

4. Updated score display logic to only show scores when `hasScores` is true:

```jsx
const hasScores =
  submission.finalScore !== null && submission.finalScore !== undefined;
const isGraded = submission.status === "graded";

{
  hasScores && <div className="scores-summary">{/* Display scores */}</div>;
}
```

**CSS Added:**

```css
.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.pending-message {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}
```

#### InstructorDashboard Component

**File:** `frontend/src/pages/InstructorDashboard.jsx`

**Changes:**

1. Added `pending_grading` and `graded` to status filter dropdown
2. Updated `getStatusClass` function to handle new statuses
3. Updated status badge display to show "⏳ Chờ Chấm" and "✔️ Đã Chấm"
4. Updated score column display to show "⏳ Chờ chấm" when scores are null
5. Updated `hasEssayToGrade` logic to check for both `pending_grading` and `submitted` status
6. Updated `pendingEssayGrading` calculation to include `pending_grading` status

**Example Score Display:**

```jsx
<td>
  {submission.status === "submitted" || submission.status === "graded" ? (
    submission.totalScore !== null && submission.totalScore !== undefined ? (
      <div
        className={`score-cell ${getScoreClass(submission.totalScore || 0, assignment?.totalPoints || 100)}`}
      >
        <span className="score-value">{submission.totalScore || 0}</span>
        <span className="score-divider">/</span>
        <span className="score-max">{assignment?.totalPoints || 0}</span>
      </div>
    ) : (
      <span className="pending-score">⏳ Chờ chấm</span>
    )
  ) : (
    <span className="not-submitted">—</span>
  )}
</td>
```

**CSS Added:**

```css
.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-graded {
  background: #d1fae5;
  color: #065f46;
}

.pending-score {
  color: #f59e0b;
  font-size: 0.875rem;
  font-weight: 600;
}
```

---

## Complete Workflow

### Student Perspective

1. **Start Assignment**
   - Status: `draft`
   - Can answer questions, use AI, save drafts

2. **Submit Assignment**
   - **If Multiple-Choice Only:**
     - Status: `submitted`
     - Receives scores immediately
     - Can view final score breakdown
   - **If Contains Essays:**
     - Status: `pending_grading`
     - Sees "⏳ Đang chờ giảng viên chấm bài tự luận" message
     - Scores are hidden (null)

3. **After Instructor Grades**
   - Status: `graded`
   - Can view all scores (content, AI skill, final)
   - Can read instructor feedback

### Instructor Perspective

1. **Dashboard View**
   - Filter by "Chờ Chấm" to see pending submissions
   - "Chờ Chấm Điểm" stat card shows count
   - Submissions with essays show "✍️" grade button

2. **Grade Essay Questions**
   - Navigate to grading interface
   - Assign points to each essay question
   - Optionally add feedback

3. **System Auto-Calculates**
   - When last essay is graded
   - Status changes to `graded`
   - Final score calculated: (contentScore × 0.7) + (aiSkillScore × 0.3)

---

## API Endpoints

### Submit Assignment

**POST** `/api/submission/:id/submit`

**Response for Essay Submissions:**

```json
{
  "success": true,
  "submissionId": "...",
  "status": "pending_grading",
  "message": "Bài làm của bạn đã được nộp. Vui lòng chờ giảng viên chấm câu tự luận.",
  "autoGradedScore": 0,
  "hasEssayQuestions": true,
  "aiInteractionSummary": { ... }
}
```

### Grade Essay Question

**POST** `/api/submission/:id/grade-question`

**Request Body:**

```json
{
  "questionId": "...",
  "pointsEarned": 8,
  "feedback": "Good analysis but needs more examples"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đã chấm điểm thành công",
  "answer": {
    "questionId": "...",
    "pointsEarned": 8,
    "feedback": "..."
  },
  "allGraded": true,
  "finalScore": 7.5
}
```

---

## Testing Checklist

### Backend Tests

- ✅ Submit essay assignment → status = `pending_grading`
- ✅ Submit multiple-choice assignment → status = `submitted` with scores
- ✅ Grade one essay → status remains `pending_grading` if others ungraded
- ✅ Grade last essay → status changes to `graded` + final score calculated
- ✅ GET /api/submission/student/my-submissions → includes pending_grading submissions

### Frontend Tests

- ✅ MySubmissionsPage shows "⏳ Chờ Chấm" badge for pending submissions
- ✅ Pending message displayed when status is pending_grading
- ✅ Scores hidden until status is graded
- ✅ Filter tabs include "Chờ Chấm" option
- ✅ InstructorDashboard shows pending_grading in filters
- ✅ Dashboard displays "⏳ Chờ chấm" in score columns for pending
- ✅ Grade button (✍️) appears for submissions with ungraded essays

---

## Database Considerations

### Existing Submissions

No migration needed for this feature since:

- Old submissions without essays remain `submitted`
- New essay submissions use `pending_grading`
- Status enum is backward compatible

### Indexes

Consider adding index for efficient filtering:

```javascript
db.assignment_submissions.createIndex({ status: 1, submittedAt: -1 });
```

---

## Future Enhancements

1. **Bulk Grading**
   - Grade multiple essay questions at once
   - Batch grade all submissions for same question

2. **AI-Assisted Grading**
   - AI suggests scores based on rubric
   - Instructor reviews and adjusts

3. **Grading Progress Indicator**
   - Show "3/5 essays graded" in dashboard
   - Student sees partial progress

4. **Email Notifications**
   - Notify student when grading complete
   - Notify instructor when new essays submitted

5. **Rubric Templates**
   - Pre-defined rubrics for common question types
   - Auto-populate feedback based on rubric

---

## Summary

The essay grading workflow ensures that:

- ✅ Essay questions wait for instructor manual grading
- ✅ Multiple-choice questions are auto-graded immediately
- ✅ Students see clear pending status with informative messages
- ✅ Instructors can easily find and grade pending submissions
- ✅ Final scores are only calculated when all questions are graded
- ✅ The 10-point scale is maintained throughout the workflow
- ✅ AI skill scores are still calculated and included in final scores

This implementation provides a complete, user-friendly essay grading experience that integrates seamlessly with the existing auto-grading system.
