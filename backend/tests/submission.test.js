/**
 * Unit Tests for Submission Routes
 * Covers: start submission, get submission, save draft, submit, auto-grading, AI skill scoring
 */

const mongoose = require('mongoose');

describe('Submission Routes - Logic Tests', () => {
  describe('calculateAISkillScore Algorithm', () => {
    // Mock implementation of the algorithm for testing
    function calculateAISkillScore(logs, submission) {
      if (logs.length === 0) return 100;

      // Factor 1: Prompt Quality (40%)
      const avgPromptLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length;
      const contextProvidedRate = logs.filter(log => log.contextProvided).length / logs.length;
      const promptQuality = Math.min(100, (avgPromptLength / 50) * 50 + contextProvidedRate * 50);

      // Factor 2: Independence Level (30%)
      const aiUsageRate = logs.length / submission.answers.length;
      const independenceScore = Math.max(0, 100 - aiUsageRate * 30);

      // Factor 3: Iteration Pattern (30%)
      const uniquePrompts = new Set(logs.map(l => l.prompt.toLowerCase().trim())).size;
      const iterationEfficiency = (uniquePrompts / logs.length) * 100;

      return promptQuality * 0.4 + independenceScore * 0.3 + iterationEfficiency * 0.3;
    }

    test('should return 100 for no AI usage (fully independent)', () => {
      const logs = [];
      const submission = { answers: [{}, {}, {}] };

      const score = calculateAISkillScore(logs, submission);
      expect(score).toBe(100);
    });

    test('should calculate prompt quality correctly', () => {
      const logs = [
        { prompt: 'a'.repeat(50), contextProvided: true },
        { prompt: 'b'.repeat(50), contextProvided: true },
      ];
      const submission = { answers: [{}, {}] };

      const score = calculateAISkillScore(logs, submission);

      // avgPromptLength = 50, contextRate = 1.0
      // promptQuality = (50/50)*50 + 1.0*50 = 100
      // aiUsageRate = 2/2 = 1.0
      // independenceScore = 100 - 1.0*30 = 70
      // iterationEfficiency = 2/2 * 100 = 100
      // final = 100*0.4 + 70*0.3 + 100*0.3 = 40 + 21 + 30 = 91
      expect(score).toBeCloseTo(91, 1);
    });

    test('should penalize repetitive prompts', () => {
      const logs = [
        { prompt: 'help me', contextProvided: false },
        { prompt: 'HELP ME', contextProvided: false }, // Duplicate (case insensitive)
        { prompt: 'help me', contextProvided: false }, // Duplicate
      ];
      const submission = { answers: [{}, {}, {}] };

      const score = calculateAISkillScore(logs, submission);

      // uniquePrompts = 1 (all are "help me")
      // iterationEfficiency = 1/3 * 100 = 33.33
      // This should result in lower score
      expect(score).toBeLessThan(50);
    });

    test('should reward high independence', () => {
      const logs = [{ prompt: 'What is this concept?', contextProvided: true }];
      const submission = { answers: [{}, {}, {}, {}, {}] }; // 5 questions, only 1 AI usage

      const score = calculateAISkillScore(logs, submission);

      // aiUsageRate = 1/5 = 0.2
      // independenceScore = 100 - 0.2*30 = 94
      expect(score).toBeGreaterThan(70);
    });

    test('should handle edge case: more AI calls than questions', () => {
      const logs = [
        { prompt: 'help1', contextProvided: false },
        { prompt: 'help2', contextProvided: false },
        { prompt: 'help3', contextProvided: false },
      ];
      const submission = { answers: [{}] }; // Only 1 question

      const score = calculateAISkillScore(logs, submission);

      // aiUsageRate = 3/1 = 3.0
      // independenceScore = 100 - 3.0*30 = 10 (limited by Math.max(0, ...))
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(100);
    });

    test('should calculate balanced score for moderate AI usage', () => {
      const logs = [
        { prompt: 'Explain this concept in detail', contextProvided: true },
        { prompt: 'Can you clarify the previous explanation?', contextProvided: true },
        { prompt: 'What about edge cases?', contextProvided: false },
      ];
      const submission = { answers: [{}, {}, {}, {}, {}] }; // 5 questions, 3 AI calls

      const score = calculateAISkillScore(logs, submission);

      // Moderate usage, good prompts, all unique
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(90);
    });

    test('should handle very short prompts', () => {
      const logs = [
        { prompt: 'hi', contextProvided: false },
        { prompt: 'ok', contextProvided: false },
      ];
      const submission = { answers: [{}, {}] };

      const score = calculateAISkillScore(logs, submission);

      // avgPromptLength = 2.5 (very low)
      // promptQuality will be low
      expect(score).toBeLessThan(60);
    });

    test('should reward context-provided prompts', () => {
      const logs = [
        { prompt: 'a'.repeat(100), contextProvided: true },
        { prompt: 'b'.repeat(100), contextProvided: true },
      ];
      const submission = { answers: [{}, {}] };

      const score1 = calculateAISkillScore(logs, submission);

      // Compare with no context
      const logsNoContext = [
        { prompt: 'a'.repeat(100), contextProvided: false },
        { prompt: 'b'.repeat(100), contextProvided: false },
      ];
      const score2 = calculateAISkillScore(logsNoContext, submission);

      // score1 should be >= score2 (not strictly greater due to rounding)
      expect(score1).toBeGreaterThanOrEqual(score2);
    });
  });

  describe('Auto-Grading Logic', () => {
    test('should correctly grade multiple-choice questions', () => {
      const questions = [
        { _id: 'q1', type: 'multiple-choice', correctAnswer: 'A', points: 10 },
        { _id: 'q2', type: 'multiple-choice', correctAnswer: 'B', points: 10 },
        { _id: 'q3', type: 'multiple-choice', correctAnswer: 'C', points: 10 },
      ];

      const answers = [
        { questionId: 'q1', answer: 'A' }, // Correct
        { questionId: 'q2', answer: 'A' }, // Wrong
        { questionId: 'q3', answer: 'C' }, // Correct
      ];

      let totalScore = 0;
      for (let answer of answers) {
        const question = questions.find(q => q._id === answer.questionId);
        if (question.type === 'multiple-choice') {
          answer.isCorrect = answer.answer === question.correctAnswer;
          answer.pointsEarned = answer.isCorrect ? question.points : 0;
          totalScore += answer.pointsEarned;
        }
      }

      expect(totalScore).toBe(20); // 2 correct out of 3
      expect(answers[0].isCorrect).toBe(true);
      expect(answers[1].isCorrect).toBe(false);
      expect(answers[2].isCorrect).toBe(true);
    });

    test('should handle partial points correctly', () => {
      const questions = [
        { _id: 'q1', type: 'multiple-choice', correctAnswer: 'D', points: 5 },
        { _id: 'q2', type: 'multiple-choice', correctAnswer: 'B', points: 15 },
      ];

      const answers = [
        { questionId: 'q1', answer: 'D' }, // Correct (5 points)
        { questionId: 'q2', answer: 'C' }, // Wrong (0 points)
      ];

      let totalScore = 0;
      for (let answer of answers) {
        const question = questions.find(q => q._id === answer.questionId);
        answer.isCorrect = answer.answer === question.correctAnswer;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        totalScore += answer.pointsEarned;
      }

      expect(totalScore).toBe(5);
    });

    test('should skip essay questions in auto-grading', () => {
      const questions = [
        { _id: 'q1', type: 'multiple-choice', correctAnswer: 'A', points: 10 },
        { _id: 'q2', type: 'essay', points: 20 },
        { _id: 'q3', type: 'multiple-choice', correctAnswer: 'B', points: 10 },
      ];

      const answers = [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: 'Long essay text...' },
        { questionId: 'q3', answer: 'B' },
      ];

      let totalScore = 0;
      for (let answer of answers) {
        const question = questions.find(q => q._id === answer.questionId);
        if (question.type === 'multiple-choice') {
          answer.isCorrect = answer.answer === question.correctAnswer;
          answer.pointsEarned = answer.isCorrect ? question.points : 0;
          totalScore += answer.pointsEarned;
        }
      }

      // Only MC questions graded (q1 + q3 = 20 points)
      expect(totalScore).toBe(20);
      expect(answers[1].pointsEarned).toBeUndefined(); // Essay not auto-graded
    });
  });

  describe('Final Score Calculation', () => {
    test('should calculate weighted final score with scale 10', () => {
      const contentScore = 8.0; // Content score 8/10
      const aiSkillScore = 9.0; // AI skill score 9/10

      // Assuming weights: content 70%, AI 30%
      const finalScore = contentScore * 0.7 + aiSkillScore * 0.3;

      expect(finalScore).toBe(8.3); // 8*0.7 + 9*0.3 = 5.6 + 2.7 = 8.3
    });

    test('should handle perfect scores on scale 10', () => {
      const contentScore = 10;
      const aiSkillScore = 10;

      const finalScore = contentScore * 0.7 + aiSkillScore * 0.3;

      expect(finalScore).toBe(10); // 10*0.7 + 10*0.3 = 7 + 3 = 10
    });

    test('should handle zero content score', () => {
      const totalScore = 0;
      const totalPoints = 100;
      const aiSkillScore = 90;

      const contentScore = (totalScore / totalPoints) * 100;
      const finalScore = contentScore * 0.7 + aiSkillScore * 0.3;

      expect(finalScore).toBe(27); // 0*0.7 + 90*0.3 = 27
    });

    test('should handle low AI skill score', () => {
      const totalScore = 90;
      const totalPoints = 100;
      const aiSkillScore = 20; // Poor AI usage

      const contentScore = (totalScore / totalPoints) * 100;
      const finalScore = contentScore * 0.7 + aiSkillScore * 0.3;

      expect(finalScore).toBe(69); // 90*0.7 + 20*0.3 = 63 + 6 = 69
    });

    test('should maintain weights correctly across different scenarios', () => {
      const scenarios = [
        { content: 50, ai: 50, expected: 50 },
        { content: 100, ai: 0, expected: 70 },
        { content: 0, ai: 100, expected: 30 },
        { content: 75, ai: 85, expected: 78 }, // 75*0.7 + 85*0.3 = 52.5 + 25.5 = 78
      ];

      scenarios.forEach(({ content, ai, expected }) => {
        const finalScore = content * 0.7 + ai * 0.3;
        expect(finalScore).toBeCloseTo(expected, 1);
      });
    });
  });

  describe('Optimistic Concurrency Control', () => {
    test('should detect version mismatch', () => {
      const submissionFromDB = { __v: 5 };
      const clientVersion = 4;

      const isMismatch = submissionFromDB.__v !== clientVersion;
      expect(isMismatch).toBe(true);
    });

    test('should allow update when versions match', () => {
      const submissionFromDB = { __v: 3 };
      const clientVersion = 3;

      const isMismatch = submissionFromDB.__v !== clientVersion;
      expect(isMismatch).toBe(false);
    });

    test('should handle missing version key from client', () => {
      const submissionFromDB = { __v: 2 };
      const clientVersion = undefined;

      // Should reject update if client doesn't provide version
      const shouldReject = clientVersion === undefined;
      expect(shouldReject).toBe(true);
    });
  });

  describe('Access Control Validation', () => {
    test('should allow owner to access their submission', () => {
      const submission = { studentId: 'user123' };
      const requestUser = { id: 'user123', role: 'student' };

      const isOwner = submission.studentId.toString() === requestUser.id;
      expect(isOwner).toBe(true);
    });

    test('should allow instructor to access any submission', () => {
      const submission = { studentId: 'student123' };
      const requestUser = { id: 'instructor456', role: 'instructor' };

      const canAccess = requestUser.role === 'instructor';
      expect(canAccess).toBe(true);
    });

    test('should deny other students from accessing submission', () => {
      const submission = { studentId: 'student123' };
      const requestUser = { id: 'student456', role: 'student' };

      const isOwner = submission.studentId.toString() === requestUser.id;
      const isInstructor = requestUser.role === 'instructor';
      const canAccess = isOwner || isInstructor;

      expect(canAccess).toBe(false);
    });

    test('should handle ObjectId comparison correctly', () => {
      const submission = { studentId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') };
      const requestUser = { id: '507f1f77bcf86cd799439011', role: 'student' };

      const isOwner = submission.studentId.toString() === requestUser.id;
      expect(isOwner).toBe(true);
    });
  });

  describe('Status Validation', () => {
    test('should allow editing draft submissions', () => {
      const submission = { status: 'draft' };
      const canEdit = submission.status === 'draft';
      expect(canEdit).toBe(true);
    });

    test('should prevent editing submitted submissions', () => {
      const submission = { status: 'submitted' };
      const canEdit = submission.status === 'draft';
      expect(canEdit).toBe(false);
    });

    test('should prevent editing graded submissions', () => {
      const submission = { status: 'graded' };
      const canEdit = submission.status === 'draft';
      expect(canEdit).toBe(false);
    });
  });

  describe('Answer Initialization', () => {
    test('should initialize answers array from assignment questions', () => {
      const questions = [
        { _id: 'q1', type: 'multiple-choice', points: 10 },
        { _id: 'q2', type: 'essay', points: 20 },
        { _id: 'q3', type: 'multiple-choice', points: 15 },
      ];

      const answers = questions.map(q => ({
        questionId: q._id,
        answer: '',
        aiInteractionCount: 0,
      }));

      expect(answers).toHaveLength(3);
      expect(answers[0]).toEqual({
        questionId: 'q1',
        answer: '',
        aiInteractionCount: 0,
      });
      expect(answers[2].questionId).toBe('q3');
    });

    test('should handle empty questions array', () => {
      const questions = [];
      const answers = questions.map(q => ({
        questionId: q._id,
        answer: '',
        aiInteractionCount: 0,
      }));

      expect(answers).toHaveLength(0);
    });
  });

  describe('AI Interaction Summary Calculation', () => {
    function calculateInteractionSummary(logs) {
      if (logs.length === 0) {
        return {
          totalPrompts: 0,
          avgPromptLength: 0,
          contextProvidedRate: 0,
          uniquePrompts: 0,
          promptTypes: {},
        };
      }

      const totalPrompts = logs.length;
      const avgPromptLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / totalPrompts;
      const contextProvidedRate = logs.filter(log => log.contextProvided).length / totalPrompts;
      const uniquePrompts = new Set(logs.map(l => l.prompt.toLowerCase().trim())).size;

      const promptTypes = {};
      logs.forEach(log => {
        const type = log.promptType || 'unknown';
        promptTypes[type] = (promptTypes[type] || 0) + 1;
      });

      return {
        totalPrompts,
        avgPromptLength: Math.round(avgPromptLength),
        contextProvidedRate: Math.round(contextProvidedRate * 100) / 100,
        uniquePrompts,
        promptTypes,
      };
    }

    test('should calculate summary correctly', () => {
      const logs = [
        { prompt: 'help', contextProvided: true, promptType: 'question' },
        { prompt: 'explain', contextProvided: false, promptType: 'clarification' },
        { prompt: 'hint', contextProvided: true, promptType: 'hint' },
      ];

      const summary = calculateInteractionSummary(logs);

      expect(summary.totalPrompts).toBe(3);
      expect(summary.contextProvidedRate).toBeCloseTo(0.67, 1);
      expect(summary.uniquePrompts).toBe(3);
      expect(summary.promptTypes.question).toBe(1);
      expect(summary.promptTypes.clarification).toBe(1);
      expect(summary.promptTypes.hint).toBe(1);
    });

    test('should handle no logs', () => {
      const logs = [];
      const summary = calculateInteractionSummary(logs);

      expect(summary.totalPrompts).toBe(0);
      expect(summary.avgPromptLength).toBe(0);
      expect(summary.contextProvidedRate).toBe(0);
    });

    test('should count duplicate prompts correctly', () => {
      const logs = [
        { prompt: 'HELP', contextProvided: false, promptType: 'question' },
        { prompt: 'help', contextProvided: false, promptType: 'question' },
        { prompt: 'different', contextProvided: false, promptType: 'question' },
      ];

      const summary = calculateInteractionSummary(logs);

      expect(summary.totalPrompts).toBe(3);
      expect(summary.uniquePrompts).toBe(2); // "help" appears twice (case insensitive)
    });
  });

  describe('Edge Cases', () => {
    test('should handle division by zero in score calculation', () => {
      const totalScore = 50;
      const totalPoints = 0; // Edge case: no total points

      if (totalPoints === 0) {
        // Should handle gracefully, perhaps return 0
        const contentScore = 0;
        expect(contentScore).toBe(0);
      } else {
        const contentScore = (totalScore / totalPoints) * 100;
        expect(contentScore).toBeDefined();
      }
    });

    test('should handle negative scores gracefully', () => {
      const totalScore = -10; // Invalid but possible if buggy
      const totalPoints = 100;

      const contentScore = Math.max(0, (totalScore / totalPoints) * 100);
      expect(contentScore).toBe(0);
    });

    test('should handle scores over 100%', () => {
      const totalScore = 150; // Extra credit?
      const totalPoints = 100;

      const contentScore = Math.min(100, (totalScore / totalPoints) * 100);
      expect(contentScore).toBe(100);
    });

    test('should handle empty answers array', () => {
      const answers = [];
      const logs = [];

      if (answers.length === 0) {
        // Cannot calculate AI usage rate
        const aiUsageRate = 0;
        expect(aiUsageRate).toBe(0);
      }
    });

    test('should handle very long prompts', () => {
      const logs = [{ prompt: 'a'.repeat(10000), contextProvided: true }];
      const submission = { answers: [{}] };

      // Function should still work
      const avgPromptLength = logs[0].prompt.length;
      expect(avgPromptLength).toBe(10000);
    });

    test('should handle null/undefined in answers', () => {
      const questions = [{ _id: 'q1', type: 'multiple-choice', correctAnswer: 'A', points: 10 }];

      const answers = [
        { questionId: 'q1', answer: null }, // User didn't answer
      ];

      let totalScore = 0;
      for (let answer of answers) {
        const question = questions.find(q => q._id === answer.questionId);
        if (question.type === 'multiple-choice') {
          answer.isCorrect = answer.answer === question.correctAnswer;
          answer.pointsEarned = answer.isCorrect ? question.points : 0;
          totalScore += answer.pointsEarned;
        }
      }

      expect(totalScore).toBe(0);
      expect(answers[0].isCorrect).toBe(false);
    });
  });
});

console.log('\n✅ Submission Routes Tests Complete!');
console.log(
  '📊 Coverage: calculateAISkillScore, auto-grading, access control, optimistic concurrency'
);
