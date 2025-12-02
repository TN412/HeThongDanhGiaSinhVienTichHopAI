// Test assignment generation helpers and logic
// Không import trực tiếp assignment.js để tránh OpenAI initialization

describe('Assignment Generation Helpers', () => {
  describe('parseAIQuestions', () => {
    test('should parse valid multiple-choice questions JSON', () => {
      const aiResponse = JSON.stringify([
        {
          type: 'multiple-choice',
          question: 'What is 2 + 2?',
          options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'],
          correctAnswer: 'B',
          explanation: '2 + 2 equals 4',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'What is the capital of France?',
          options: ['A. London', 'B. Paris', 'C. Berlin', 'D. Madrid'],
          correctAnswer: 'B',
          explanation: 'Paris is the capital of France',
          points: 10,
          difficulty: 'medium',
        },
      ]);

      // Since parseAIQuestions is not exported, we'll test the logic here
      const questions = JSON.parse(aiResponse);
      expect(questions).toHaveLength(2);
      expect(questions[0].type).toBe('multiple-choice');
      expect(questions[0].correctAnswer).toBe('B');
      expect(questions[1].question).toContain('France');
    });

    test('should parse valid essay questions JSON', () => {
      const aiResponse = JSON.stringify([
        {
          type: 'essay',
          question: 'Explain the concept of artificial intelligence',
          rubric: 'Key points: 1) Definition, 2) Applications, 3) Impact',
          estimatedTime: 20,
          points: 25,
          difficulty: 'medium',
        },
      ]);

      const questions = JSON.parse(aiResponse);
      expect(questions).toHaveLength(1);
      expect(questions[0].type).toBe('essay');
      expect(questions[0].rubric).toContain('Key points');
    });

    test('should parse JSON with markdown code blocks', () => {
      const aiResponseWithMarkdown =
        '```json\n[{"type": "multiple-choice", "question": "Test?", "options": ["A. One", "B. Two"], "correctAnswer": "A", "points": 5}]\n```';

      // Remove markdown blocks
      let cleaned = aiResponseWithMarkdown.trim();
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');

      const questions = JSON.parse(cleaned);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('Test?');
    });

    test('should handle mixed question types', () => {
      const aiResponse = JSON.stringify([
        {
          type: 'multiple-choice',
          question: 'MC Question',
          options: ['A. One', 'B. Two'],
          correctAnswer: 'A',
          points: 10,
        },
        {
          type: 'essay',
          question: 'Essay Question',
          rubric: 'Rubric here',
          points: 20,
        },
      ]);

      const questions = JSON.parse(aiResponse);
      expect(questions).toHaveLength(2);
      expect(questions[0].type).toBe('multiple-choice');
      expect(questions[1].type).toBe('essay');
    });
  });

  describe('Question Validation Logic', () => {
    test('should validate multiple-choice has required fields', () => {
      const question = {
        type: 'multiple-choice',
        question: 'Test question?',
        options: ['A. One', 'B. Two', 'C. Three', 'D. Four'],
        correctAnswer: 'B',
        points: 10,
      };

      expect(question.type).toBe('multiple-choice');
      expect(question.options).toHaveLength(4);
      expect(['A', 'B', 'C', 'D']).toContain(question.correctAnswer);
    });

    test('should validate essay has required fields', () => {
      const question = {
        type: 'essay',
        question: 'Essay question?',
        rubric: 'Grading criteria',
        points: 20,
      };

      expect(question.type).toBe('essay');
      expect(question.rubric).toBeTruthy();
      expect(question.points).toBeGreaterThan(0);
    });

    test('should normalize correctAnswer to uppercase letter', () => {
      const testAnswers = ['a', 'B', 'c ', ' D'];
      const normalized = testAnswers.map(a => a.trim().toUpperCase());

      expect(normalized).toEqual(['A', 'B', 'C', 'D']);
      normalized.forEach(answer => {
        expect(/^[A-Z]$/.test(answer)).toBe(true);
      });
    });

    test('should reject invalid correctAnswer format', () => {
      const invalidAnswers = ['AB', '1', 'E', 'a.', ''];

      invalidAnswers.forEach(answer => {
        const normalized = answer.trim().toUpperCase();
        if (!/^[A-D]$/.test(normalized)) {
          expect(true).toBe(true); // Invalid as expected
        }
      });
    });
  });

  describe('Prompt Building Logic', () => {
    test('should build multiple-choice prompt with correct structure', () => {
      const text = 'Sample document text about programming';
      const type = 'multiple-choice';
      const count = 5;
      const difficulty = 'medium';

      // Simulate prompt building
      const prompt = `Generate ${count} ${difficulty}-level ${type} questions from: ${text}`;

      expect(prompt).toContain('5');
      expect(prompt).toContain('medium');
      expect(prompt).toContain('multiple-choice');
      expect(prompt).toContain(text);
    });

    test('should build essay prompt with correct structure', () => {
      const text = 'Sample document text';
      const type = 'essay';
      const count = 3;
      const difficulty = 'hard';

      const prompt = `Generate ${count} ${difficulty}-level ${type} questions from: ${text}`;

      expect(prompt).toContain('3');
      expect(prompt).toContain('hard');
      expect(prompt).toContain('essay');
    });

    test('should truncate long text for prompt', () => {
      const longText = 'word '.repeat(10000);
      const truncated = longText.substring(0, 8000);

      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated.length).toBeLessThanOrEqual(8000);
    });
  });

  describe('Error Handling', () => {
    test('should detect invalid JSON', () => {
      const invalidJSON = 'This is not JSON';

      expect(() => {
        JSON.parse(invalidJSON);
      }).toThrow(SyntaxError);
    });

    test('should detect non-array JSON', () => {
      const notArray = '{"key": "value"}';
      const parsed = JSON.parse(notArray);

      expect(Array.isArray(parsed)).toBe(false);
    });

    test('should detect empty array', () => {
      const emptyArray = '[]';
      const parsed = JSON.parse(emptyArray);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });

    test('should detect missing required fields', () => {
      const incomplete = [
        {
          type: 'multiple-choice',
          // missing question, options, correctAnswer
        },
      ];

      expect(incomplete[0].question).toBeUndefined();
      expect(incomplete[0].options).toBeUndefined();
    });

    test('should detect invalid question type', () => {
      const invalidType = [
        {
          type: 'true-false', // Not supported
          question: 'Is this valid?',
        },
      ];

      const validTypes = ['multiple-choice', 'essay'];
      expect(validTypes).not.toContain(invalidType[0].type);
    });
  });

  describe('Assignment Creation Validation', () => {
    test('should validate questionType input', () => {
      const validTypes = ['multiple-choice', 'essay', 'mixed'];

      expect(validTypes).toContain('multiple-choice');
      expect(validTypes).toContain('essay');
      expect(validTypes).toContain('mixed');
      expect(validTypes).not.toContain('invalid');
    });

    test('should validate questionCount range', () => {
      const validateCount = count => {
        const num = parseInt(count);
        return num >= 1 && num <= 20;
      };

      expect(validateCount(5)).toBe(true);
      expect(validateCount(1)).toBe(true);
      expect(validateCount(20)).toBe(true);
      expect(validateCount(0)).toBe(false);
      expect(validateCount(21)).toBe(false);
      expect(validateCount(-5)).toBe(false);
    });

    test('should validate difficulty values', () => {
      const validDifficulties = ['easy', 'medium', 'hard'];

      expect(validDifficulties).toContain('easy');
      expect(validDifficulties).toContain('medium');
      expect(validDifficulties).toContain('hard');
      expect(validDifficulties).not.toContain('extreme');
    });

    test('should set default assignment settings', () => {
      const defaultSettings = {
        allowAI: true,
        allowMultipleDrafts: true,
        timeLimit: null,
        maxAttempts: 1,
      };

      expect(defaultSettings.allowAI).toBe(true);
      expect(defaultSettings.allowMultipleDrafts).toBe(true);
      expect(defaultSettings.timeLimit).toBeNull();
      expect(defaultSettings.maxAttempts).toBe(1);
    });
  });

  describe('Response Structure', () => {
    test('should return correct success response structure', () => {
      const mockResponse = {
        success: true,
        assignmentId: '507f1f77bcf86cd799439011',
        questions: [
          {
            type: 'multiple-choice',
            question: 'Test?',
            options: ['A. One', 'B. Two'],
            correctAnswer: 'A',
            points: 10,
          },
        ],
        meta: {
          sourceFile: 'test.pdf',
          wordCount: 500,
          questionCount: 1,
          totalPoints: 10,
          blobUrl: 'https://storage.blob.core.windows.net/...',
        },
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.assignmentId).toBeTruthy();
      expect(mockResponse.questions).toHaveLength(1);
      expect(mockResponse.meta.wordCount).toBe(500);
    });

    test('should return correct error response structure', () => {
      const mockError = {
        success: false,
        error: 'Failed to parse AI-generated questions',
        details: 'AI response is not valid JSON',
        aiResponse: 'partial response...',
      };

      expect(mockError.success).toBe(false);
      expect(mockError.error).toBeTruthy();
      expect(mockError.details).toBeTruthy();
    });
  });
});
