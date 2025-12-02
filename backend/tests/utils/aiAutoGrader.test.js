/**
 * Tests for AI_AutoGrader module - Thang điểm 10
 * Location: backend/tests/utils/aiAutoGrader.test.js
 */

const {
  gradeMCQ,
  scoreEssay,
  gradeAIUsage,
  summarizeGrade,
} = require('../../src/utils/ai_autograder');

describe('AI_AutoGrader Module Tests (Scale 10)', () => {
  describe('gradeMCQ function', () => {
    test('Nên chấm đúng MCQ 100%', () => {
      const studentMCQ = [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: 'B' },
        { questionId: 'q3', answer: 'C' },
      ];

      const correctMCQ = [
        { questionId: 'q1', correctAnswer: 'A', topic: 'Math' },
        { questionId: 'q2', correctAnswer: 'B', topic: 'Science' },
        { questionId: 'q3', correctAnswer: 'C', topic: 'History' },
      ];

      const result = gradeMCQ(studentMCQ, correctMCQ);

      expect(result.score).toBe(10); // 100% accuracy -> 10/10
      expect(result.accuracy).toBe(100);
      expect(result.correctCount).toBe(3);
      expect(result.totalQuestions).toBe(3);
    });

    test('Nên chấm MCQ 50% đúng', () => {
      const studentMCQ = [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: 'C' }, // Sai
        { questionId: 'q3', answer: 'C' },
        { questionId: 'q4', answer: 'A' }, // Sai
      ];

      const correctMCQ = [
        { questionId: 'q1', correctAnswer: 'A', topic: 'Math' },
        { questionId: 'q2', correctAnswer: 'B', topic: 'Math' },
        { questionId: 'q3', correctAnswer: 'C', topic: 'Science' },
        { questionId: 'q4', correctAnswer: 'D', topic: 'Science' },
      ];

      const result = gradeMCQ(studentMCQ, correctMCQ);

      expect(result.score).toBe(5); // 50% accuracy -> 5/10
      expect(result.accuracy).toBe(50);
      expect(result.correctCount).toBe(2);
      expect(result.incorrectByTopic.Math).toBe(1);
      expect(result.incorrectByTopic.Science).toBe(1);
    });
  });

  describe('scoreEssay function', () => {
    test('Nên chấm essay xuất sắc (>8.5/10)', () => {
      const studentEssay = `
        Trí tuệ nhân tạo (AI) đang cách mạng hóa nhiều lĩnh vực trong xã hội hiện đại.

        Trong y tế, AI giúp chẩn đoán bệnh chính xác hơn qua phân tích hình ảnh y học. Ví dụ,
        hệ thống AI có thể phát hiện ung thư da với độ chính xác 95%, cao hơn bác sĩ da liễu.

        Trong giáo dục, AI cá nhân hóa việc học tập cho từng học sinh. Chẳng hạn, Khan Academy
        sử dụng AI để đề xuất bài tập phù hợp với trình độ của học sinh.

        Tóm lại, AI mang lại nhiều lợi ích cho xã hội nhưng cần được sử dụng có trách nhiệm.
      `;

      const keyPoints = [
        'AI ứng dụng trong y tế',
        'AI trong giáo dục',
        'cá nhân hóa học tập',
        'sử dụng có trách nhiệm',
      ];

      const result = scoreEssay(studentEssay, '', keyPoints);

      expect(result.score).toBeGreaterThan(8.5); // Xuất sắc
      expect(result.level).toBe('Xuất sắc');
      expect(result.keyPointsCovered).toBeGreaterThan(2);
    });

    test('Nên chấm essay yếu (<3/10)', () => {
      const studentEssay = 'AI tốt.';
      const keyPoints = ['AI ứng dụng', 'lợi ích', 'thách thức'];

      const result = scoreEssay(studentEssay, '', keyPoints);

      expect(result.score).toBeLessThan(3); // Yếu
      expect(result.level).toBe('Không đạt');
      expect(result.keyPointsCovered).toBe(0);
    });
  });

  describe('gradeAIUsage function', () => {
    test('Nên chấm AI usage cao với prompt chất lượng', () => {
      const aiChatLog = [
        {
          prompt:
            'Bạn có thể giải thích chi tiết về cách AI hoạt động trong y tế không? Tôi muốn hiểu về các thuật toán machine learning được sử dụng.',
          response: 'AI trong y tế sử dụng các thuật toán như CNN cho phân tích hình ảnh...',
        },
        {
          prompt:
            'Dựa vào thông tin vừa rồi, bạn có thể cho ví dụ cụ thể về ứng dụng CNN trong chẩn đoán ung thư không?',
          response: 'CNN được sử dụng để phân tích hình ảnh X-ray, MRI...',
        },
      ];

      const studentEssay = 'Bài làm tự viết hoàn toàn khác với AI response';
      const aiGeneratedAnswers = aiChatLog.map(log => log.response);

      const result = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);

      expect(result.promptQualityScore).toBeGreaterThan(7); // Prompt dài và chi tiết
      expect(result.independenceScore).toBeGreaterThan(7); // Bài làm khác AI
      expect(result.aiUsageScore).toBeGreaterThan(7);
    });

    test('Nên phát hiện copy từ AI', () => {
      const aiChatLog = [
        {
          prompt: 'Viết về AI trong y tế',
          response: 'AI trong y tế giúp chẩn đoán bệnh chính xác và nhanh chóng hơn',
        },
      ];

      // Sinh viên copy gần nguyên văn
      const studentEssay = 'AI trong y tế giúp chẩn đoán bệnh chính xác và nhanh chóng hơn';
      const aiGeneratedAnswers = [aiChatLog[0].response];

      const result = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);

      expect(result.independenceScore).toBeLessThan(3); // Copy -> độc lập thấp
      expect(result.similarityToAI).toBeGreaterThan(80); // Similarity cao
    });

    test('Nên chấm cao khi không dùng AI', () => {
      const aiChatLog = [];
      const studentEssay = 'Bài làm hoàn toàn tự viết';
      const aiGeneratedAnswers = [];

      const result = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);

      expect(result.aiUsageScore).toBe(10); // Không dùng AI = hoàn hảo
      expect(result.independenceScore).toBe(10);
      expect(result.similarityToAI).toBe(0);
    });
  });

  describe('summarizeGrade function (Integration)', () => {
    test('Nên tính điểm tổng hợp chính xác', () => {
      const studentMCQ = [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: 'B' },
      ];

      const correctMCQ = [
        { questionId: 'q1', correctAnswer: 'A', topic: 'Math' },
        { questionId: 'q2', correctAnswer: 'B', topic: 'Math' },
      ];

      const studentEssay = `
        Bài luận chất lượng tốt với đầy đủ nội dung.
        Có ví dụ minh họa và cấu trúc rõ ràng.
        Đề cập đến các key points quan trọng.
      `;

      const keyPoints = ['nội dung', 'ví dụ', 'cấu trúc'];

      const aiChatLog = [
        {
          prompt: 'Bạn có thể giúp tôi hiểu về chủ đề này không?',
          response: 'Tôi có thể giúp bạn...',
        },
      ];

      const aiGeneratedAnswers = ['Câu trả lời từ AI khác hoàn toàn'];

      const weights = { mcq: 0.4, essay: 0.4, aiUsage: 0.2 };

      const result = summarizeGrade({
        studentMCQ,
        correctMCQ,
        studentEssay,
        keyPoints,
        aiChatLog,
        aiGeneratedAnswers,
        weights,
      });

      expect(result.mcqScore).toBe(10); // 100% MCQ
      expect(result.essayScore).toBeGreaterThan(5); // Essay khá
      expect(result.aiUsageScore).toBeGreaterThan(5); // AI usage OK
      expect(result.finalScore).toBeGreaterThan(7); // Tổng thể tốt
      expect(result.feedback.overall).toContain('Kết quả tốt');
    });

    test('Nên xử lý trường hợp chỉ có MCQ', () => {
      const weights = { mcq: 0.7, essay: 0, aiUsage: 0.3 };

      const result = summarizeGrade({
        studentMCQ: [{ questionId: 'q1', answer: 'A' }],
        correctMCQ: [{ questionId: 'q1', correctAnswer: 'A', topic: 'Test' }],
        studentEssay: '',
        keyPoints: [],
        aiChatLog: [],
        aiGeneratedAnswers: [],
        weights,
      });

      expect(result.mcqScore).toBe(10);
      expect(result.essayScore).toBe(0);
      expect(result.aiUsageScore).toBe(10); // Không dùng AI
      expect(result.finalScore).toBe(10); // MCQ perfect + no AI = perfect
    });
  });
});
