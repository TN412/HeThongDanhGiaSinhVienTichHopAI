/**
 * Tests for AI Skill Score calculation with AI_AutoGrader
 * Location: backend/tests/utils/aiSkillScore.test.js
 */

const { gradeAIUsage } = require('../../src/utils/ai_autograder');

// Mock data helpers
const createLog = (prompt, contextProvided = false) => ({
  prompt,
  contextProvided,
  timestamp: new Date(),
});

const createSubmission = answerCount => ({
  answers: Array(answerCount).fill({ questionId: 'q1' }),
});

describe('AI Skill Score Calculation with AI_AutoGrader (Scale 10)', () => {
  describe('Scenario: Không dùng AI', () => {
    test('Nên trả về 10 điểm khi không có log AI', () => {
      const logs = [];
      const studentEssay = 'Bài làm độc lập của sinh viên';
      const aiGeneratedAnswers = [];

      const result = gradeAIUsage(logs, studentEssay, aiGeneratedAnswers);

      expect(result.aiUsageScore).toBe(10); // Thang 10, không dùng AI = 10 điểm
    });

    test('Nên trả về 10 điểm với array rỗng', () => {
      const result = gradeAIUsage([], 'Bài làm', []);
      expect(result.aiUsageScore).toBe(10);
    });
  });

  describe('Scenario: Prompt Quality', () => {
    test('Nên điểm thấp với nhiều prompt ngắn (< 20 chars)', () => {
      const logs = [
        { prompt: 'help', response: 'How can I help you?' },
        { prompt: '?', response: 'Please be more specific.' },
        { prompt: 'what', response: 'What do you need help with?' },
        { prompt: 'how', response: 'How can I assist you?' },
        { prompt: 'why', response: 'Please provide more context.' },
      ];
      const studentEssay = 'Bài làm ngắn';
      const aiGeneratedAnswers = logs.map(l => l.response);

      const result = gradeAIUsage(logs, studentEssay, aiGeneratedAnswers);

      // Prompt ngắn => prompt quality thấp => điểm < 5 (trên thang 10)
      expect(result.promptQualityScore).toBeLessThan(5);
    });

    test('Nên điểm cao hơn với prompt dài và chi tiết', () => {
      const logs = [
        createLog(
          'Can you explain the difference between stack and heap memory allocation in detail?'
        ),
        createLog('What are the best practices for handling exceptions in asynchronous code?'),
      ];
      const submission = createSubmission(5);

      const score = calculateAISkillScore(logs, submission);

      // Prompt dài => quality tốt hơn
      expect(score).toBeGreaterThan(30);
    });

    test('Nên tăng điểm khi có contextProvided', () => {
      const logsWithoutContext = [
        createLog('Explain this concept', false),
        createLog('How does it work', false),
      ];

      const logsWithContext = [
        createLog('Given the code above, explain this concept', true),
        createLog('Based on the question, how does it work', true),
      ];

      const submission = createSubmission(5);

      const scoreWithoutContext = calculateAISkillScore(logsWithoutContext, submission);
      const scoreWithContext = calculateAISkillScore(logsWithContext, submission);

      // Context => quality tốt hơn
      expect(scoreWithContext).toBeGreaterThan(scoreWithoutContext);
    });
  });

  describe('Scenario: Independence Level', () => {
    test('Nên điểm thấp khi dùng AI cho mọi câu hỏi', () => {
      // 10 câu hỏi, 10 lần hỏi AI => không độc lập
      const logs = Array(10)
        .fill(null)
        .map(() => createLog('Help me solve this problem with detailed steps'));
      const submission = createSubmission(10);

      const score = calculateAISkillScore(logs, submission);

      // Dùng AI quá nhiều => independence thấp
      expect(score).toBeLessThan(70);
    });

    test('Nên điểm cao hơn khi chỉ dùng AI cho 1-2 câu', () => {
      const logs = [createLog('Can you give me a hint for this specific question?')];
      const submission = createSubmission(10); // 10 câu, chỉ hỏi AI 1 lần

      const score = calculateAISkillScore(logs, submission);

      // Ít dùng AI => independence cao
      expect(score).toBeGreaterThan(80);
    });
  });

  describe('Scenario: Iteration Efficiency', () => {
    test('Nên điểm thấp với nhiều prompt lặp lại', () => {
      const logs = [
        createLog('help me'),
        createLog('help me'),
        createLog('help me'),
        createLog('help me'),
        createLog('help me'),
      ];
      const submission = createSubmission(5);

      const score = calculateAISkillScore(logs, submission);

      // Duplicate prompts => iteration efficiency thấp
      expect(score).toBeLessThan(60);
    });

    test('Nên điểm cao với prompt đa dạng', () => {
      const logs = [
        createLog('What is the main concept here?'),
        createLog('Can you provide an example?'),
        createLog('How does this relate to the previous topic?'),
      ];
      const submission = createSubmission(10);

      const score = calculateAISkillScore(logs, submission);

      // Unique prompts => better iteration
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('Scenario: Combined Factors', () => {
    test('Nên điểm rất cao với usage tối ưu', () => {
      // Best case: ít hỏi AI, prompt chất lượng cao, có context
      const logs = [
        createLog(
          'Given the problem statement, can you clarify the requirements for edge cases?',
          true
        ),
      ];
      const submission = createSubmission(10);

      const score = calculateAISkillScore(logs, submission);

      expect(score).toBeGreaterThan(85);
    });

    test('Nên điểm rất thấp với usage kém', () => {
      // Worst case: hỏi nhiều, prompt ngắn, không context, lặp lại
      const logs = [
        createLog('help'),
        createLog('help'),
        createLog('?'),
        createLog('what'),
        createLog('help'),
        createLog('??'),
        createLog('help me'),
        createLog('help'),
      ];
      const submission = createSubmission(8);

      const score = calculateAISkillScore(logs, submission);

      expect(score).toBeLessThan(40);
    });
  });

  describe('Edge Cases', () => {
    test('Nên xử lý submission không có answers', () => {
      const logs = [createLog('test')];
      const submission = { answers: [] };

      const score = calculateAISkillScore(logs, submission);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('Nên trả về điểm trong khoảng 0-100', () => {
      const logs = Array(100)
        .fill(null)
        .map(() => createLog('test'));
      const submission = createSubmission(5);

      const score = calculateAISkillScore(logs, submission);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('Nên xử lý prompt rất dài', () => {
      const logs = [createLog('a'.repeat(10000), true)];
      const submission = createSubmission(5);

      const score = calculateAISkillScore(logs, submission);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
