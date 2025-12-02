/**
 * AI_AutoGrader Module - Usage Examples
 *
 * Các ví dụ sử dụng module chấm điểm tự động
 */

const { summarizeGrade, gradeMCQ, scoreEssay, gradeAIUsage } = require('./ai_autograder');

// =====================================================
// EXAMPLE 1: Chấm toàn bộ bài tập (MCQ + Essay + AI Usage)
// =====================================================

function example1_FullGrading() {
  console.log('=== EXAMPLE 1: Full Grading ===\n');

  const studentMCQ = [
    { questionId: 'q1', answer: 'A' },
    { questionId: 'q2', answer: 'C' },
    { questionId: 'q3', answer: 'B' },
    { questionId: 'q4', answer: 'D' },
    { questionId: 'q5', answer: 'A' },
  ];

  const correctMCQ = [
    { questionId: 'q1', correctAnswer: 'A', topic: 'Data Structures' },
    { questionId: 'q2', correctAnswer: 'B', topic: 'Algorithms' },
    { questionId: 'q3', correctAnswer: 'B', topic: 'Complexity' },
    { questionId: 'q4', correctAnswer: 'D', topic: 'Sorting' },
    { questionId: 'q5', correctAnswer: 'C', topic: 'Searching' },
  ];

  const studentEssay = `
    Cấu trúc dữ liệu là cách tổ chức và lưu trữ dữ liệu trong máy tính.
    Theo em, việc chọn đúng cấu trúc dữ liệu rất quan trọng vì nó ảnh hưởng đến hiệu suất.

    Ví dụ, nếu cần truy cập nhanh theo index thì dùng Array,
    còn nếu cần thêm/xóa linh hoạt thì LinkedList tốt hơn.

    Em thấy việc hiểu rõ từng cấu trúc giúp viết code hiệu quả hơn.
  `;

  const aiChatLog = [
    {
      prompt: 'Cấu trúc dữ liệu là gì?',
      response: 'Cấu trúc dữ liệu là cách tổ chức dữ liệu...',
    },
    {
      prompt: 'Cho em ví dụ về Array và LinkedList?',
      response: 'Array là danh sách liên tiếp, LinkedList là danh sách liên kết...',
    },
  ];

  const aiGeneratedAnswers = [
    'Cấu trúc dữ liệu là cách tổ chức dữ liệu trong máy tính để sử dụng hiệu quả.',
  ];

  const keyPoints = ['tổ chức dữ liệu', 'hiệu suất', 'ví dụ'];

  const result = summarizeGrade({
    studentMCQ,
    correctMCQ,
    studentEssay,
    keyPoints,
    aiChatLog,
    aiGeneratedAnswers,
    weights: { mcq: 0.4, essay: 0.4, aiUsage: 0.2 },
  });

  console.log('Final Score:', result.finalScore);
  console.log('MCQ Score:', result.mcqScore + '/10');
  console.log('Essay Score:', result.essayScore + '/10');
  console.log('AI Usage Score:', result.aiUsageScore + '/10');
  console.log('Final Score:', result.finalScore + '/10');
  console.log('\nFeedback:', result.feedback.overall);
  console.log('\nDetails:', JSON.stringify(result, null, 2));
}

// =====================================================
// EXAMPLE 2: Chỉ chấm MCQ
// =====================================================

function example2_MCQOnly() {
  console.log('\n=== EXAMPLE 2: MCQ Only ===\n');

  const studentMCQ = [
    { questionId: 'q1', answer: 'A' },
    { questionId: 'q2', answer: 'B' },
    { questionId: 'q3', answer: 'C' },
  ];

  const correctMCQ = [
    { questionId: 'q1', correctAnswer: 'A', topic: 'Topic1' },
    { questionId: 'q2', correctAnswer: 'B', topic: 'Topic1' },
    { questionId: 'q3', correctAnswer: 'D', topic: 'Topic2' },
  ];

  const result = gradeMCQ(studentMCQ, correctMCQ);

  console.log('Accuracy:', result.accuracy + '%');
  console.log('Correct:', result.correctCount + '/' + result.totalQuestions);
  console.log('Feedback:', result.feedback);
  console.log('Weak Topics:', result.incorrectByTopic);
}

// =====================================================
// EXAMPLE 3: Chỉ chấm Essay
// =====================================================

function example3_EssayOnly() {
  console.log('\n=== EXAMPLE 3: Essay Only ===\n');

  const studentEssay = `
    Giải thuật là tập hợp các bước có thứ tự để giải quyết bài toán.
    Ví dụ như giải thuật sắp xếp bubble sort, quicksort.
  `;

  const keyPoints = ['tập hợp các bước', 'giải quyết bài toán', 'ví dụ'];

  const result = scoreEssay(studentEssay, '', keyPoints);

  console.log('Score:', result.score + '/10');
  console.log('Level:', result.level);
  console.log('Feedback:', result.feedback);
  console.log('Key Points Covered:', result.keyPointsCovered + '/' + result.totalKeyPoints);
}

// =====================================================
// EXAMPLE 4: Chỉ đánh giá AI Usage
// =====================================================

function example4_AIUsageOnly() {
  console.log('\n=== EXAMPLE 4: AI Usage Only ===\n');

  const aiChatLog = [
    {
      prompt: 'Giải thích giải thuật quicksort?',
      response: 'Quicksort là giải thuật chia để trị...',
    },
    {
      prompt: 'Độ phức tạp của quicksort là bao nhiêu? Tại sao?',
      response: 'Độ phức tạp trung bình là O(n log n)...',
    },
  ];

  const studentEssay = `
    Quicksort là một giải thuật sắp xếp hiệu quả.
    Theo em hiểu thì nó dùng kỹ thuật chia để trị, chọn pivot và chia mảng.
    Độ phức tạp trung bình O(n log n) nhưng worst case là O(n^2).
  `;

  const aiGeneratedAnswers = ['Quicksort là giải thuật chia để trị với độ phức tạp O(n log n).'];

  const result = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);

  console.log('AI Usage Score:', result.aiUsageScore + '/10');
  console.log('Prompt Quality:', result.promptQualityScore + '/10');
  console.log('Independence:', result.independenceScore + '/10');
  console.log('Similarity to AI:', (result.similarityToAI * 100).toFixed(1) + '%');
  console.log('Feedback:', result.feedback);
}

// =====================================================
// EXAMPLE 5: Trường hợp sinh viên không dùng AI
// =====================================================

function example5_NoAIUsage() {
  console.log('\n=== EXAMPLE 5: No AI Usage (Independent Work) ===\n');

  const result = summarizeGrade({
    studentMCQ: [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
    ],
    correctMCQ: [
      { questionId: 'q1', correctAnswer: 'A', topic: 'Topic1' },
      { questionId: 'q2', correctAnswer: 'B', topic: 'Topic1' },
    ],
    studentEssay: 'Giải thuật là tập hợp các bước để giải quyết vấn đề.',
    keyPoints: ['tập hợp các bước', 'giải quyết vấn đề'],
    aiChatLog: [], // Không dùng AI
    aiGeneratedAnswers: [],
    weights: { mcq: 0.5, essay: 0.5, aiUsage: 0 }, // AI weight = 0
  });

  console.log('Final Score:', result.finalScore);
  console.log('AI Usage Score:', result.aiUsageScore, '(Excellent - Independent work)');
  console.log('Overall Feedback:', result.feedback.overall);
}

// =====================================================
// EXAMPLE 6: Trường hợp sinh viên copy AI
// =====================================================

function example6_CopyFromAI() {
  console.log('\n=== EXAMPLE 6: Copy from AI (Bad Practice) ===\n');

  const aiAnswer = 'Cấu trúc dữ liệu là cách tổ chức dữ liệu trong bộ nhớ máy tính.';
  const studentEssay = 'Cấu trúc dữ liệu là cách tổ chức dữ liệu trong bộ nhớ máy tính.'; // Copy nguyên văn

  const result = gradeAIUsage([{ prompt: 'CTDL là gì?', response: aiAnswer }], studentEssay, [
    aiAnswer,
  ]);

  console.log('Independence Score:', result.independenceScore + '/10');
  console.log('Similarity:', (result.similarityToAI * 100).toFixed(1) + '%');
  console.log('Feedback:', result.details.independence.feedback);
}

// =====================================================
// RUN ALL EXAMPLES
// =====================================================

if (require.main === module) {
  example1_FullGrading();
  example2_MCQOnly();
  example3_EssayOnly();
  example4_AIUsageOnly();
  example5_NoAIUsage();
  example6_CopyFromAI();
}

module.exports = {
  example1_FullGrading,
  example2_MCQOnly,
  example3_EssayOnly,
  example4_AIUsageOnly,
  example5_NoAIUsage,
  example6_CopyFromAI,
};
