# Essay Grading Workflow - Testing Guide

## Quick Test Scenarios

### Scenario 1: Multiple-Choice Assignment (Existing Behavior)

**Expected:** Immediate scoring, no changes to existing workflow

1. Login as student
2. Select multiple-choice assignment
3. Answer all questions
4. Submit assignment
5. ✅ **Verify:** Status = `submitted`, scores displayed immediately

---

### Scenario 2: Essay-Only Assignment (New Behavior)

**Expected:** Pending grading, no scores until instructor grades

1. Login as student
2. Select essay assignment
3. Answer essay questions
4. Submit assignment
5. ✅ **Verify:**
   - Status = `pending_grading`
   - Message: "⏳ Đang chờ giảng viên chấm bài tự luận"
   - No scores displayed
   - Backend response includes `hasEssayQuestions: true`

6. Login as instructor
7. Go to dashboard
8. Filter by "Chờ Chấm"
9. ✅ **Verify:** Submission appears with "⏳ Chờ Chấm" badge
10. Click grade button (✍️)
11. Grade all essay questions
12. ✅ **Verify:**
    - Status changes to `graded`
    - Final score calculated and displayed
    - Student can now see scores

---

### Scenario 3: Mixed Assignment (Multiple-Choice + Essay)

**Expected:** Multiple-choice auto-graded, essays wait for instructor

1. Login as student
2. Select mixed assignment
3. Answer all questions (both types)
4. Submit assignment
5. ✅ **Verify:**
   - Status = `pending_grading`
   - Multiple-choice questions scored immediately
   - Essay questions show `pointsEarned: undefined`
   - contentScore and finalScore are `null`
   - aiSkillScore is calculated

6. Login as instructor
7. Grade essay questions one by one
8. ✅ **Verify:**
   - After grading first essay: status still `pending_grading`
   - After grading last essay: status changes to `graded`
   - Final score = (contentScore × 0.7) + (aiSkillScore × 0.3)

---

## API Testing

### Test 1: Submit Essay Assignment

```bash
POST http://localhost:5000/api/submission/:id/submit
Headers: {
  "Authorization": "Bearer <student_token>"
}

Expected Response (200):
{
  "success": true,
  "submissionId": "...",
  "status": "pending_grading",
  "message": "Bài làm của bạn đã được nộp. Vui lòng chờ giảng viên chấm câu tự luận.",
  "autoGradedScore": 0,
  "hasEssayQuestions": true,
  "aiSkillScore": 7.5,
  "aiInteractionSummary": { ... }
}
```

### Test 2: Grade Essay Question

```bash
POST http://localhost:5000/api/submission/:id/grade-question
Headers: {
  "Authorization": "Bearer <instructor_token>"
}
Body: {
  "questionId": "...",
  "pointsEarned": 8,
  "feedback": "Good analysis"
}

Expected Response (200):
{
  "success": true,
  "message": "Đã chấm điểm thành công",
  "answer": {
    "questionId": "...",
    "pointsEarned": 8,
    "feedback": "Good analysis"
  },
  "allGraded": false  // or true if last essay
}
```

### Test 3: Get Student Submissions

```bash
GET http://localhost:5000/api/submission/student/my-submissions
Headers: {
  "Authorization": "Bearer <student_token>"
}

Expected Response (200):
{
  "success": true,
  "submissions": [
    {
      "_id": "...",
      "status": "pending_grading",  // Check this
      "finalScore": null,           // Should be null
      "contentScore": null,
      "aiSkillScore": 7.5           // Should be calculated
    }
  ]
}
```

---

## Frontend UI Testing

### Student View (MySubmissionsPage)

**Pending Submission:**

```
┌─────────────────────────────────────────┐
│ 📚 Bài Tập Logic Học                   │
│                                         │
│ ⏳ Chờ Chấm                            │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ ⏳ Đang chờ giảng viên chấm bài tự ││
│ │    luận                             ││
│ │                                     ││
│ │ Bài làm của bạn đã được nộp thành   ││
│ │ công. Vui lòng chờ giảng viên chấm  ││
│ │ điểm.                               ││
│ └─────────────────────────────────────┘│
│                                         │
│ 📅 Nộp ngày: 15/01/2025 10:30         │
│                                         │
│ [Xem Chi Tiết]                         │
└─────────────────────────────────────────┘
```

**Graded Submission:**

```
┌─────────────────────────────────────────┐
│ 📚 Bài Tập Logic Học                   │
│                                         │
│ ⭐ Đã Chấm                             │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Điểm Nội Dung   7.5/10              ││
│ │ Kỹ Năng AI      8.2/10              ││
│ │ ────────────────────────             ││
│ │ Điểm Cuối       7.7/10              ││
│ └─────────────────────────────────────┘│
│                                         │
│ [Xem Chi Tiết]                         │
└─────────────────────────────────────────┘
```

### Instructor View (Dashboard)

**Filter Options:**

```
[Tất Cả Trạng Thái ▼]
  - Tất Cả Trạng Thái
  - Bản Nháp
  - Đã Nộp
  - Chờ Chấm      ← New!
  - Đã Chấm       ← New!
```

**Submissions Table:**

```
┌──────────────┬──────────────┬───────────┬─────────────┬──────────────┐
│ Sinh Viên    │ Bài Tập     │ Trạng Thái│ Điểm Nội Dung│ Hành Động   │
├──────────────┼──────────────┼───────────┼─────────────┼──────────────┤
│ Nguyễn A     │ Logic Học   │⏳ Chờ Chấm│⏳ Chờ chấm  │ 👁️ 📊 ✍️   │
│ Trần B       │ Logic Học   │✔️ Đã Chấm│ 7.5/10      │ 👁️ 📊      │
└──────────────┴──────────────┴───────────┴─────────────┴──────────────┘
```

---

## Database Verification

### Check Submission Status

```javascript
db.assignment_submissions.find({
  status: 'pending_grading'
}).pretty()

// Expected output:
{
  "_id": ObjectId("..."),
  "status": "pending_grading",
  "finalScore": null,
  "contentScore": null,
  "aiSkillScore": 7.5,
  "answers": [
    {
      "questionId": "...",
      "answer": "Essay text...",
      "pointsEarned": undefined  // Not graded yet
    }
  ]
}
```

### Check After Grading

```javascript
db.assignment_submissions.find({
  status: 'graded',
  submittedAt: { $gte: new Date('2025-01-15') }
}).pretty()

// Expected output:
{
  "_id": ObjectId("..."),
  "status": "graded",
  "finalScore": 7.7,
  "contentScore": 7.5,
  "aiSkillScore": 8.2,
  "answers": [
    {
      "questionId": "...",
      "pointsEarned": 8,
      "feedback": "Good analysis"
    }
  ]
}
```

---

## Console Logs to Watch

### Backend Console (Submission)

```
🎯 [Submission] Student submitted assignment
├─ Submission ID: 678...
├─ Assignment: Logic Học
├─ Has Essay Questions: true
├─ Status: pending_grading
├─ Multiple-Choice Score: 0/0
├─ AI Skill Score: 7.5/10
└─ Final Score: null (awaiting essay grading)
```

### Backend Console (Grading)

```
✅ [Grading] Essay question graded
├─ Question ID: 123...
├─ Points Earned: 8
├─ All Essays Graded: true
├─ Content Score: 7.5/10
├─ AI Skill Score: 8.2/10
├─ Final Score: 7.7/10
└─ Status: graded
```

---

## Common Issues & Fixes

### Issue 1: Status Not Changing to `graded`

**Symptom:** After grading last essay, status still `pending_grading`

**Check:**

```javascript
// All essay answers should have pointsEarned defined
const allGraded = submission.answers.every((answer) => {
  const q = assignment.questions.id(answer.questionId);
  return q?.type !== "essay" || answer.pointsEarned !== undefined;
});
```

**Fix:** Ensure `pointsEarned` is a number (not undefined/null)

---

### Issue 2: Scores Showing as `null` in Frontend

**Symptom:** `contentScore` and `finalScore` display as `null/10`

**Check:** Verify status is `graded` before displaying scores

```jsx
const hasScores =
  submission.finalScore !== null && submission.finalScore !== undefined;
```

---

### Issue 3: Multiple-Choice Questions Not Auto-Grading

**Symptom:** Multiple-choice in mixed assignment also pending

**Check:** Ensure multiple-choice grading happens in submit route:

```javascript
if (question.type === "multiple-choice") {
  answer.pointsEarned = answer.isCorrect ? question.points : 0;
  totalScore += answer.pointsEarned;
}
```

---

## Performance Monitoring

### Metrics to Track

- Average time from submission to grading
- Number of pending submissions per instructor
- Grading completion rate
- Score distribution (content vs AI skill)

### Dashboard Queries

```javascript
// Count pending by instructor
db.assignment_submissions.aggregate([
  { $match: { status: 'pending_grading' } },
  { $lookup: { from: 'assignments', ... } },
  { $group: { _id: '$assignment.instructorId', count: { $sum: 1 } } }
])

// Average grading time
db.assignment_submissions.aggregate([
  { $match: { status: 'graded' } },
  { $project: {
    gradingTime: { $subtract: ['$gradedAt', '$submittedAt'] }
  }},
  { $group: { _id: null, avgTime: { $avg: '$gradingTime' } } }
])
```

---

## Success Criteria

### ✅ Feature Complete When:

1. Essay submissions show `pending_grading` status
2. Students see clear "waiting for grading" message
3. Instructors can filter by "Chờ Chấm"
4. Grading individual questions updates answers
5. Grading last question triggers status change to `graded`
6. Final score calculated correctly: (content × 0.7) + (AI × 0.3)
7. Students can view scores after grading complete
8. All scores display in 10-point scale

### ✅ No Breaking Changes:

1. Multiple-choice assignments still auto-grade
2. Existing submitted assignments unaffected
3. Draft functionality unchanged
4. AI skill scoring still works
5. All existing API routes functional

---

## Rollback Plan

If issues arise, revert these commits:

1. `AssignmentSubmission.js` - Remove `pending_grading` from enum
2. `submission.js` - Restore original submit logic
3. `MySubmissionsPage.jsx` - Remove pending status handling
4. `InstructorDashboard.jsx` - Remove pending filters

Or use:

```bash
git revert <commit-hash>
```

---

## Deployment Checklist

- [ ] Backend deployed with updated submission model
- [ ] Frontend deployed with updated UI components
- [ ] Database indexes created for status field
- [ ] Monitor error logs for 24 hours post-deployment
- [ ] Verify instructor dashboard shows pending submissions
- [ ] Verify student view displays pending messages
- [ ] Test full workflow end-to-end in production
- [ ] Update user documentation
- [ ] Train instructors on new grading workflow

---

## Support Resources

- Implementation Doc: `ESSAY_GRADING_IMPLEMENTATION.md`
- API Docs: `backend/README.md`
- User Guide: `docs/ESSAY_GRADING_USER_GUIDE.md` (create)
- Video Tutorial: (record and link)

---

**Last Updated:** 2025-01-XX
**Tested By:** Development Team
**Status:** ✅ Ready for Production
