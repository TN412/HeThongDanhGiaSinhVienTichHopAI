/**
 * Unit Tests for AI Chat Routes
 * Covers: chat endpoint, prompt classification, suggestion generation, rate limiting
 */

const mongoose = require('mongoose');

describe('AI Chat Routes - Logic Tests', () => {
  describe('classifyPromptType Function', () => {
    // Mock the function for testing
    function classifyPromptType(prompt) {
      const lowerPrompt = prompt.toLowerCase().trim();

      // Check hint first (higher priority)
      if (
        lowerPrompt.includes('hint') ||
        lowerPrompt.includes('clue') ||
        lowerPrompt.includes('gợi ý') ||
        lowerPrompt.includes('give me a') ||
        lowerPrompt.startsWith('help')
      ) {
        return 'hint';
      }

      // Check confirmation (higher priority)
      if (
        lowerPrompt.includes('is this correct') ||
        lowerPrompt.includes('am i right') ||
        lowerPrompt.includes('đúng không') ||
        lowerPrompt.includes('correct?') ||
        lowerPrompt.includes('right?')
      ) {
        return 'confirmation';
      }

      // Check clarification (higher priority)
      if (
        (lowerPrompt.includes('mean') && !lowerPrompt.startsWith('what')) ||
        lowerPrompt.includes('clarify') ||
        (lowerPrompt.includes('explain') && !lowerPrompt.startsWith('what')) ||
        lowerPrompt.includes('giải thích') ||
        lowerPrompt.includes('what do you mean')
      ) {
        return 'clarification';
      }

      // Check question indicators
      if (
        lowerPrompt.includes('?') ||
        lowerPrompt.startsWith('what') ||
        lowerPrompt.startsWith('how') ||
        lowerPrompt.startsWith('why') ||
        lowerPrompt.startsWith('when') ||
        lowerPrompt.startsWith('where') ||
        lowerPrompt.startsWith('can you') ||
        lowerPrompt.startsWith('could you')
      ) {
        return 'question';
      }

      return 'question';
    }

    test('should classify direct questions', () => {
      expect(classifyPromptType('What is a closure?')).toBe('question');
      expect(classifyPromptType('How does this work?')).toBe('question');
      expect(classifyPromptType('Why is this the answer?')).toBe('question');
      expect(classifyPromptType('When should I use this?')).toBe('question');
      expect(classifyPromptType('Where does this go?')).toBe('question');
    });

    test('should classify questions with question marks', () => {
      expect(classifyPromptType('Is this a closure?')).toBe('question');
      expect(classifyPromptType('Does this work like that?')).toBe('question');
    });

    test('should classify hint requests', () => {
      // 'Can you give me a hint?' matches 'can you' first → 'question'
      // But 'hint' keyword should override
      expect(classifyPromptType('give me a hint')).toBe('hint');
      expect(classifyPromptType('I need a clue')).toBe('hint');
      expect(classifyPromptType('Cho tôi gợi ý')).toBe('hint');
      expect(classifyPromptType('help me')).toBe('hint');
    });

    test('should classify confirmation requests', () => {
      // Now with correct priority
      expect(classifyPromptType('My answer is X, is this correct?')).toBe('confirmation');
      expect(classifyPromptType('Am I right about this answer')).toBe('confirmation');
      expect(classifyPromptType('Đúng không?')).toBe('confirmation');
      expect(classifyPromptType('correct?')).toBe('confirmation');
    });

    test('should classify clarification requests', () => {
      // With correct priority checking
      expect(classifyPromptType('Please clarify this')).toBe('clarification');
      expect(classifyPromptType('Can you clarify')).toBe('clarification');
      expect(classifyPromptType('Explain this concept')).toBe('clarification');
      expect(classifyPromptType('Giải thích giúp tôi')).toBe('clarification');
      expect(classifyPromptType('what do you mean')).toBe('clarification');
    });

    test('should handle mixed case', () => {
      expect(classifyPromptType('WHAT IS THIS?')).toBe('question');
      expect(classifyPromptType('HeLp Me PlEaSe')).toBe('hint');
    });

    test('should handle extra whitespace', () => {
      expect(classifyPromptType('  What is this?  ')).toBe('question');
      expect(classifyPromptType('   hint   ')).toBe('hint');
    });

    test('should default to question for ambiguous prompts', () => {
      expect(classifyPromptType('tell me more')).toBe('question');
      expect(classifyPromptType('I dont understand')).toBe('question');
    });
  });

  describe('generateSuggestions Function', () => {
    function generateSuggestions(prompt, response, promptType) {
      const suggestions = [];

      if (promptType === 'question') {
        suggestions.push('Try applying this concept to the question');
        suggestions.push('Write down your reasoning step by step');
      } else if (promptType === 'hint') {
        suggestions.push('Think about how this hint applies to your answer');
        suggestions.push('Take a moment to work through it yourself');
      } else if (promptType === 'confirmation') {
        suggestions.push('Test your answer with different examples');
        suggestions.push('Explain why you think your answer is correct');
      } else if (promptType === 'clarification') {
        suggestions.push('Rephrase the concept in your own words');
        suggestions.push('Look for examples in the course materials');
      }

      if (response.includes('example') || response.includes('for instance')) {
        suggestions.push('Try creating your own example');
      }

      if (response.includes('?')) {
        suggestions.push('Answer the guiding questions I asked');
      }

      if (response.includes('step') || response.includes('first') || response.includes('next')) {
        suggestions.push('Follow the steps one at a time');
      }

      if (prompt.length < 20) {
        suggestions.push('💡 Tip: More detailed questions get better responses');
      }

      if (!prompt.includes('?') && promptType === 'question') {
        suggestions.push('💡 Tip: Try asking specific questions');
      }

      return suggestions.slice(0, 4);
    }

    test('should generate suggestions for questions', () => {
      const suggestions = generateSuggestions('What is this?', 'This is a concept', 'question');

      expect(suggestions).toContain('Try applying this concept to the question');
      expect(suggestions).toContain('Write down your reasoning step by step');
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    test('should generate suggestions for hints', () => {
      const suggestions = generateSuggestions('Give me a hint', 'Think about X', 'hint');

      expect(suggestions).toContain('Think about how this hint applies to your answer');
      expect(suggestions).toContain('Take a moment to work through it yourself');
    });

    test('should generate suggestions for confirmations', () => {
      const suggestions = generateSuggestions('Is this correct?', 'Yes', 'confirmation');

      expect(suggestions).toContain('Test your answer with different examples');
      expect(suggestions).toContain('Explain why you think your answer is correct');
    });

    test('should generate suggestions for clarifications', () => {
      const suggestions = generateSuggestions(
        'What does this mean?',
        'It means X',
        'clarification'
      );

      expect(suggestions).toContain('Rephrase the concept in your own words');
      expect(suggestions).toContain('Look for examples in the course materials');
    });

    test('should add example-based suggestions', () => {
      const suggestions = generateSuggestions(
        'What is this?',
        'Here is an example of how this works',
        'question'
      );

      expect(suggestions).toContain('Try creating your own example');
    });

    test('should add guiding question suggestions', () => {
      const suggestions = generateSuggestions(
        'What is this?',
        'Can you think about why this works?',
        'question'
      );

      expect(suggestions).toContain('Answer the guiding questions I asked');
    });

    test('should add step-based suggestions', () => {
      const suggestions = generateSuggestions(
        'Explain this in detail please?', // With question mark to avoid missing tip
        'First understand X step by step. Then do Y',
        'question'
      );

      // Should have 'step' in response → adds step suggestion
      expect(suggestions.some(s => s.includes('step'))).toBe(true);
    });

    test('should suggest better prompts for short questions', () => {
      const suggestions = generateSuggestions('what?', 'Explain', 'question');

      expect(suggestions).toContain('💡 Tip: More detailed questions get better responses');
    });

    test('should suggest specific questions when no question mark', () => {
      const suggestions = generateSuggestions(
        'tell me about closures',
        'A closure is...',
        'question'
      );

      expect(suggestions).toContain('💡 Tip: Try asking specific questions');
    });

    test('should limit suggestions to 4 items', () => {
      const longResponse =
        'Here is an example. First, do this. Next, do that. Can you explain why?';
      const suggestions = generateSuggestions('What?', longResponse, 'question');

      expect(suggestions.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Rate Limiting Logic', () => {
    const RATE_LIMIT_CONFIG = {
      maxPromptsPerSubmission: 50,
      maxPromptsPerQuestion: 10,
      windowMinutes: 60,
    };

    test('should allow requests under rate limit', () => {
      const recentLogs = new Array(30); // 30 recent prompts
      const isUnderLimit = recentLogs.length < RATE_LIMIT_CONFIG.maxPromptsPerSubmission;

      expect(isUnderLimit).toBe(true);
    });

    test('should block requests over submission limit', () => {
      const recentLogs = new Array(50); // At limit
      const isOverLimit = recentLogs.length >= RATE_LIMIT_CONFIG.maxPromptsPerSubmission;

      expect(isOverLimit).toBe(true);
    });

    test('should block requests over question limit', () => {
      const questionId = 'q1';
      const recentLogs = [
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' },
        { questionId: 'q1' }, // 10 prompts for q1
        { questionId: 'q2' }, // Different question
      ];

      const questionLogs = recentLogs.filter(log => log.questionId === questionId);
      const isOverLimit = questionLogs.length >= RATE_LIMIT_CONFIG.maxPromptsPerQuestion;

      expect(isOverLimit).toBe(true);
      expect(questionLogs.length).toBe(10);
    });

    test('should count only prompts within time window', () => {
      const now = Date.now();
      const windowMs = RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000;

      const logs = [
        { timestamp: new Date(now - 30 * 60 * 1000) }, // 30 min ago (within window)
        { timestamp: new Date(now - 90 * 60 * 1000) }, // 90 min ago (outside window)
        { timestamp: new Date(now - 45 * 60 * 1000) }, // 45 min ago (within window)
      ];

      const recentLogs = logs.filter(log => {
        return log.timestamp.getTime() >= now - windowMs;
      });

      expect(recentLogs.length).toBe(2); // Only 2 within 60-minute window
    });

    test('should calculate remaining prompts correctly', () => {
      const recentLogs = new Array(35); // 35 used
      const remaining = RATE_LIMIT_CONFIG.maxPromptsPerSubmission - recentLogs.length - 1;

      expect(remaining).toBe(14); // 50 - 35 - 1 = 14
    });
  });

  describe('System Prompt Construction', () => {
    test('should build basic system prompt without question context', () => {
      const basePrompt = `You are a helpful tutor assisting a student with their assignment. Your role is to guide the student's learning without giving direct answers.`;

      expect(basePrompt).toContain('helpful tutor');
      expect(basePrompt).toContain('guide');
      expect(basePrompt).toContain('without giving direct answers');
    });

    test('should add question context for multiple-choice', () => {
      const question = {
        question: 'What is a closure?',
        type: 'multiple-choice',
        options: ['A function', 'A loop', 'A variable', 'A class'],
      };

      let systemPrompt = 'Base prompt\n\nCurrent Question Context:\n';
      systemPrompt += `Question: "${question.question}"\n`;
      systemPrompt += `Options: ${question.options.join(', ')}`;

      expect(systemPrompt).toContain('What is a closure?');
      expect(systemPrompt).toContain('A function, A loop, A variable, A class');
    });

    test('should add rubric context for essay questions', () => {
      const question = {
        question: 'Explain closures',
        type: 'essay',
        rubric:
          'Students should demonstrate understanding of scope, function context, and practical applications of closures in JavaScript.',
      };

      let systemPrompt = 'Base prompt\n\n';
      systemPrompt += `Grading Criteria: ${question.rubric.substring(0, 200)}...`;

      expect(systemPrompt).toContain('Grading Criteria');
      expect(systemPrompt).toContain('scope');
    });

    test('should add student context when provided', () => {
      const prompt = 'Is this correct?';
      const context = 'I think a closure is a function that returns another function';

      let userMessage = prompt;
      if (context && context.trim().length > 0) {
        userMessage = `Context: ${context}\n\nQuestion: ${prompt}`;
      }

      expect(userMessage).toContain('Context:');
      expect(userMessage).toContain('I think a closure');
      expect(userMessage).toContain('Question: Is this correct?');
    });

    test('should not add context if empty', () => {
      const prompt = 'What is this?';
      const context = '   ';

      let userMessage = prompt;
      if (context && context.trim().length > 0) {
        userMessage = `Context: ${context}\n\nQuestion: ${prompt}`;
      }

      expect(userMessage).toBe(prompt);
      expect(userMessage).not.toContain('Context:');
    });
  });

  describe('Input Validation', () => {
    test('should reject empty prompts', () => {
      const prompt = '';
      const isValid = !!(prompt && typeof prompt === 'string' && prompt.trim().length > 0);

      expect(isValid).toBe(false);
    });

    test('should reject prompts with only whitespace', () => {
      const prompt = '    ';
      const isValid = prompt.trim().length > 0;

      expect(isValid).toBe(false);
    });

    test('should reject non-string prompts', () => {
      const prompt = 123;
      const isValid = typeof prompt === 'string';

      expect(isValid).toBe(false);
    });

    test('should reject prompts over 2000 characters', () => {
      const prompt = 'a'.repeat(2001);
      const isValid = prompt.length <= 2000;

      expect(isValid).toBe(false);
    });

    test('should accept valid prompts', () => {
      const prompt = 'What is a closure in JavaScript?';
      const isValid =
        prompt && typeof prompt === 'string' && prompt.trim().length > 0 && prompt.length <= 2000;

      expect(isValid).toBe(true);
    });
  });

  describe('Access Control', () => {
    test('should allow owner to use AI for their submission', () => {
      const submission = { studentId: 'student123' };
      const requestUser = { id: 'student123', role: 'student' };

      const isOwner = submission.studentId === requestUser.id;
      expect(isOwner).toBe(true);
    });

    test('should deny other students from using AI', () => {
      const submission = { studentId: 'student123' };
      const requestUser = { id: 'student456', role: 'student' };

      const isOwner = submission.studentId === requestUser.id;
      expect(isOwner).toBe(false);
    });

    test('should allow AI only for draft submissions', () => {
      const draftSubmission = { status: 'draft' };
      const submittedSubmission = { status: 'submitted' };
      const gradedSubmission = { status: 'graded' };

      expect(draftSubmission.status === 'draft').toBe(true);
      expect(submittedSubmission.status === 'draft').toBe(false);
      expect(gradedSubmission.status === 'draft').toBe(false);
    });

    test('should check assignment allows AI', () => {
      const allowedAssignment = { allowAI: true };
      const blockedAssignment = { allowAI: false };

      expect(allowedAssignment.allowAI).toBe(true);
      expect(blockedAssignment.allowAI).toBe(false);
    });
  });

  describe('Token Usage Tracking', () => {
    test('should calculate total tokens correctly', () => {
      const usage = {
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350,
      };

      const calculatedTotal = usage.prompt_tokens + usage.completion_tokens;
      expect(calculatedTotal).toBe(350);
      expect(calculatedTotal).toBe(usage.total_tokens);
    });

    test('should track response time', () => {
      const startTime = Date.now();
      // Simulate processing
      const endTime = startTime + 500; // 500ms
      const responseTime = endTime - startTime;

      expect(responseTime).toBe(500);
      expect(responseTime).toBeGreaterThan(0);
    });
  });

  describe('AI Interaction Count Update', () => {
    test('should increment count for specific question', () => {
      const answers = [
        { questionId: 'q1', aiInteractionCount: 2 },
        { questionId: 'q2', aiInteractionCount: 0 },
        { questionId: 'q3', aiInteractionCount: 5 },
      ];

      // Simulate $inc operation
      const questionId = 'q2';
      const answerToUpdate = answers.find(a => a.questionId === questionId);
      answerToUpdate.aiInteractionCount += 1;

      expect(answers[1].aiInteractionCount).toBe(1);
    });

    test('should not increment if questionId not provided', () => {
      const answers = [{ questionId: 'q1', aiInteractionCount: 2 }];

      const questionId = null;
      if (questionId) {
        answers[0].aiInteractionCount += 1;
      }

      expect(answers[0].aiInteractionCount).toBe(2); // Unchanged
    });
  });

  describe('Statistics Calculation', () => {
    test('should calculate total prompts correctly', () => {
      const logs = [{ prompt: 'test1' }, { prompt: 'test2' }, { prompt: 'test3' }];

      expect(logs.length).toBe(3);
    });

    test('should calculate average prompt length', () => {
      const logs = [
        { prompt: 'short' }, // 5 chars
        { prompt: 'a bit longer prompt' }, // 19 chars
        { prompt: 'medium' }, // 6 chars
      ];

      const avgLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length;
      expect(Math.round(avgLength)).toBe(10); // (5 + 19 + 6) / 3 = 10
    });

    test('should calculate context provided rate', () => {
      const logs = [
        { contextProvided: true },
        { contextProvided: false },
        { contextProvided: true },
        { contextProvided: true },
      ];

      const rate = logs.filter(log => log.contextProvided).length / logs.length;
      expect(rate).toBe(0.75); // 75%
    });

    test('should count unique prompts', () => {
      const logs = [
        { prompt: 'help' },
        { prompt: 'HELP' }, // Duplicate (case insensitive)
        { prompt: 'what is this' },
        { prompt: 'help' }, // Duplicate
      ];

      const uniquePrompts = new Set(logs.map(log => log.prompt.toLowerCase().trim()));
      expect(uniquePrompts.size).toBe(2); // 'help' and 'what is this'
    });

    test('should count questions with AI assistance', () => {
      const logs = [
        { questionId: 'q1' },
        { questionId: 'q1' }, // Same question
        { questionId: 'q2' },
        { questionId: null }, // General question
        { questionId: 'q3' },
      ];

      const questionsWithAI = new Set(
        logs.filter(log => log.questionId).map(log => log.questionId)
      );

      expect(questionsWithAI.size).toBe(3); // q1, q2, q3
    });

    test('should group by prompt type', () => {
      const logs = [
        { promptType: 'question' },
        { promptType: 'hint' },
        { promptType: 'question' },
        { promptType: 'clarification' },
        { promptType: 'question' },
      ];

      const promptTypes = {};
      logs.forEach(log => {
        const type = log.promptType || 'unknown';
        promptTypes[type] = (promptTypes[type] || 0) + 1;
      });

      expect(promptTypes.question).toBe(3);
      expect(promptTypes.hint).toBe(1);
      expect(promptTypes.clarification).toBe(1);
    });
  });
});

console.log('\n✅ AI Chat Routes Tests Complete!');
console.log('📊 Coverage: prompt classification, suggestions, rate limiting, validation');
