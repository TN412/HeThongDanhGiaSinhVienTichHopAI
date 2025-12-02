# AI_AutoGrader Module

Module chấm điểm tự động cho bài tập với đánh giá khả năng sử dụng AI của sinh viên. Sử dụng thang điểm 10 thống nhất.

## 📦 Cài Đặt

Module này là standalone, không cần cài đặt thêm dependencies. Chỉ cần Node.js.

```bash
# Copy file vào project
cp ai_autograder.js backend/src/utils/
```

## 🚀 Sử Dụng Cơ Bản

### 1. Import Module

```javascript
const { summarizeGrade } = require('./utils/ai_autograder');
```

### 2. Chấm Điểm Toàn Bộ Bài Tập

```javascript
const result = summarizeGrade({
  // Trắc nghiệm
  studentMCQ: [
    { questionId: 'q1', answer: 'A' },
    { questionId: 'q2', answer: 'B' },
  ],
  correctMCQ: [
    { questionId: 'q1', correctAnswer: 'A', topic: 'Data Structures' },
    { questionId: 'q2', correctAnswer: 'B', topic: 'Algorithms' },
  ],

  // Tự luận
  studentEssay: 'Cấu trúc dữ liệu là...',
  keyPoints: ['tổ chức dữ liệu', 'hiệu suất'],

  // AI Usage
  aiChatLog: [{ prompt: 'CTDL là gì?', response: 'CTDL là...' }],
  aiGeneratedAnswers: ['Cấu trúc dữ liệu là...'],

  // Trọng số (optional, default: mcq=0.4, essay=0.4, aiUsage=0.2)
  weights: { mcq: 0.4, essay: 0.4, aiUsage: 0.2 },
});

console.log(result.finalScore); // 3.5/4
console.log(result.feedback.overall); // "Kết quả xuất sắc..."
```

## 📊 Output Format

```javascript
{
  // Điểm số (0-4 scale)
  mcqScore: 4.0,
  essayScore: 3.5,
  aiUsageScore: 4.0,
  finalScore: 3.8,

  // Metrics
  similarityToAI: 25.3,  // %
  promptQualityScore: 4,
  independenceScore: 4,

  // Feedback
  feedback: {
    overall: "🎉 Kết quả xuất sắc!...",
    mcq: "Bạn trả lời đúng 8/10 câu...",
    essay: "🌟 Bài làm rất tốt!...",
    aiUsage: "🌟 Sử dụng AI xuất sắc!..."
  },

  // Chi tiết
  details: {
    mcq: { /* MCQ details */ },
    essay: { /* Essay details */ },
    aiUsage: { /* AI usage details */ }
  }
}
```

## 🔧 Các Function Riêng Lẻ

### Chấm MCQ

```javascript
const { gradeMCQ } = require('./utils/ai_autograder');

const result = gradeMCQ(studentMCQ, correctMCQ);
// {
//   score: 0.8,
//   accuracy: 80,
//   incorrectByTopic: { 'Algorithms': 2 },
//   feedback: "Bạn trả lời đúng 8/10 câu..."
// }
```

### Chấm Essay

```javascript
const { scoreEssay } = require('./utils/ai_autograder');

const result = scoreEssay(studentEssay, referenceAnswer, keyPoints);
// {
//   score: 3.5,
//   level: "Xuất sắc",
//   keyPointsCovered: 3,
//   feedback: "🌟 Bài làm rất tốt!..."
// }
```

### Đánh Giá AI Usage

```javascript
const { gradeAIUsage } = require('./utils/ai_autograder');

const result = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);
// {
//   aiUsageScore: 4.0,
//   promptQualityScore: 4,
//   independenceScore: 4,
//   similarityToAI: 0.25,
//   feedback: "🌟 Sử dụng AI xuất sắc!..."
// }
```

## 📋 Rubric Chi Tiết

### MCQ Grading

- ✅ Tự động chấm đúng/sai
- 📊 Thống kê lỗi theo topic
- 💬 Feedback cá nhân hóa

### Essay Rubric (0-4)

- **4**: Rất chính xác, lập luận tốt, có ví dụ
- **3**: Đúng phần lớn, có sai nhẹ
- **2**: Đúng cơ bản, thiếu chi tiết
- **1**: Nhiều lỗi
- **0**: Sai hoàn toàn

### AI Usage Scoring

#### Prompt Quality (0-4)

- **4**: Prompt rõ ràng, có ngữ cảnh, có iteration
- **3**: Prompt tốt, có ngữ cảnh
- **2**: Prompt đơn giản
- **1**: Prompt yếu
- **0**: Prompt vô nghĩa

#### Independence Score (0-4)

- **4**: Tự diễn giải hoàn toàn (similarity < 30%)
- **3**: Có chỉnh sửa đáng kể (similarity < 50%)
- **2**: Paraphrase nhẹ (similarity < 70%)
- **1**: Gần giống AI (similarity < 85%)
- **0**: Copy nguyên văn (similarity >= 85%)

#### Final AI Usage Score

```
aiUsageScore = (promptQualityScore + independenceScore) / 2
```

## 🎯 Tích Hợp Vào Backend

### Ví dụ: Sử dụng trong route submission

```javascript
// backend/src/routes/submission.js
const { summarizeGrade } = require('../utils/ai_autograder');

router.post('/:id/submit', auth.student, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id).populate('assignmentId');

    // Lấy dữ liệu
    const studentMCQ = submission.answers
      .filter(a => a.type === 'multiple-choice')
      .map(a => ({ questionId: a.questionId, answer: a.answer }));

    const correctMCQ = submission.assignmentId.questions
      .filter(q => q.type === 'multiple-choice')
      .map(q => ({
        questionId: q._id,
        correctAnswer: q.correctAnswer,
        topic: q.topic,
      }));

    const studentEssay = submission.answers.find(a => a.type === 'essay')?.answer || '';

    const keyPoints =
      submission.assignmentId.questions.find(q => q.type === 'essay')?.keyPoints || [];

    const aiChatLog = await AI_Log.find({ submissionId: submission._id }).select(
      'prompt response -_id'
    );

    const aiGeneratedAnswers = aiChatLog.map(log => log.response);

    // Chấm điểm
    const gradingResult = summarizeGrade({
      studentMCQ,
      correctMCQ,
      studentEssay,
      keyPoints,
      aiChatLog,
      aiGeneratedAnswers,
      weights: { mcq: 0.4, essay: 0.4, aiUsage: 0.2 },
    });

    // Lưu kết quả
    submission.totalScore = gradingResult.finalScore;
    submission.mcqScore = gradingResult.mcqScore;
    submission.essayScore = gradingResult.essayScore;
    submission.aiSkillScore = gradingResult.aiUsageScore;
    submission.feedback = gradingResult.feedback;
    submission.gradingDetails = gradingResult.details;
    submission.status = 'submitted';

    await submission.save();

    res.json({
      success: true,
      results: gradingResult,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🧪 Testing

```bash
# Chạy examples
cd backend/src/utils
node ai_autograder.examples.js

# Output:
# === EXAMPLE 1: Full Grading ===
# Final Score: 3.5
# MCQ Score: 3.2
# Essay Score: 3.5
# AI Usage Score: 4.0
# ...
```

## 📝 Customization

### Thay đổi trọng số

```javascript
const result = summarizeGrade({
  // ... data
  weights: {
    mcq: 0.5, // 50%
    essay: 0.3, // 30%
    aiUsage: 0.2, // 20%
  },
});
```

### Thay đổi similarity method

Module sử dụng hybrid approach (Jaccard + Cosine). Để chỉ dùng 1 method:

```javascript
const { jaccardSimilarity, cosineSimilarity } = require('./utils/ai_autograder');

// Chỉ dùng Jaccard
const similarity = jaccardSimilarity(text1, text2);

// Chỉ dùng Cosine
const similarity = cosineSimilarity(text1, text2);
```

### Thêm custom key points

```javascript
const keyPoints = [
  'định nghĩa cấu trúc dữ liệu',
  'ví dụ về array',
  'ví dụ về linked list',
  'so sánh hiệu suất',
];

const result = scoreEssay(studentEssay, '', keyPoints);
```

## 🔍 Debugging

Module có logging chi tiết trong `details` field:

```javascript
const result = summarizeGrade({
  /* ... */
});

console.log(result.details.mcq.incorrectByTopic);
// { 'Algorithms': 2, 'Data Structures': 1 }

console.log(result.details.essay.keyPointsFound);
// ['tổ chức dữ liệu', 'hiệu suất']

console.log(result.details.aiUsage.promptQuality);
// { score: 4, level: 'Xuất sắc', avgPromptLength: 52, ... }
```

## ⚠️ Lưu Ý

1. **Module không tạo database** - Bạn cần lưu kết quả vào DB
2. **Module không gọi API** - Tất cả tính toán local
3. **Text similarity** - Kết quả phụ thuộc vào chất lượng text normalization
4. **Essay scoring** - Tốt nhất khi có key points rõ ràng
5. **AI detection** - Chỉ là heuristic, không 100% chính xác

## 📚 API Reference

### `summarizeGrade(params)`

Chấm điểm toàn bộ bài tập

**Parameters:**

- `studentMCQ`: Array of `{questionId, answer}`
- `correctMCQ`: Array of `{questionId, correctAnswer, topic?}`
- `studentEssay`: String
- `referenceAnswer`: String (optional)
- `keyPoints`: Array of strings
- `aiChatLog`: Array of `{prompt, response}`
- `aiGeneratedAnswers`: Array of strings
- `weights`: Object `{mcq, essay, aiUsage}` (optional)

**Returns:** `AIGradingResult`

### `gradeMCQ(studentMCQ, correctMCQ)`

Chấm điểm trắc nghiệm

**Returns:** `{score, accuracy, incorrectByTopic, feedback, ...}`

### `scoreEssay(studentEssay, referenceAnswer, keyPoints)`

Chấm điểm tự luận

**Returns:** `{score, level, feedback, keyPointsCovered, ...}`

### `gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers)`

Đánh giá AI usage

**Returns:** `{aiUsageScore, promptQualityScore, independenceScore, similarityToAI, ...}`

## 🤝 Contributing

Module này được thiết kế để dễ mở rộng:

1. Thêm scoring criteria mới trong `scoreEssay()`
2. Thêm similarity algorithms mới
3. Thêm advanced prompt analysis
4. Integrate machine learning models

## 📄 License

MIT License - Free to use and modify
