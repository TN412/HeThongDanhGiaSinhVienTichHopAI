/**
 * Tests for AI Chat Routes
 * Location: backend/tests/routes/ai.test.js
 */

const request = require('supertest');
const app = require('../../src/app');
const { Assignment, AssignmentSubmission, User, AI_Log } = require('../../src/models');
const {
  connectDB,
  disconnectDB,
  clearDB,
  generateToken,
  createMockStudent,
  createMockInstructor,
  createMockAssignment,
} = require('../setup');

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a helpful AI response to guide the student.',
              },
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
        }),
      },
    },
  }));
});

describe('AI Chat Routes', () => {
  let studentToken;
  let studentId;
  let instructorId;
  let assignmentId;
  let submissionId;
  let questionId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Create users
    const student = await User.create(createMockStudent());
    studentId = student._id;
    studentToken = generateToken(studentId, 'student');

    const instructor = await User.create(createMockInstructor());
    instructorId = instructor._id;

    // Create assignment
    const assignment = await Assignment.create(createMockAssignment(instructorId));
    assignmentId = assignment._id;
    questionId = assignment.questions[0]._id;

    // Create submission
    const submission = await AssignmentSubmission.create({
      studentId,
      assignmentId,
      attemptNumber: 1,
      status: 'draft',
      answers: assignment.questions.map(q => ({
        questionId: q._id,
        answer: null,
        aiInteractionCount: 0,
      })),
      startedAt: new Date(),
    });
    submissionId = submission._id;
  });

  describe('POST /api/ai/chat', () => {
    test('Nên trả về AI response thành công', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          questionId: questionId.toString(),
          prompt: 'Can you help me understand this question?',
          context: 'I am working on question 1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('helpful AI response');
      expect(response.body.tokensUsed).toBe(150);
    });

    test('Nên log interaction vào database', async () => {
      await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${studentToken}`).send({
        submissionId: submissionId.toString(),
        questionId: questionId.toString(),
        prompt: 'Help me with this',
        context: 'Question context',
      });

      const logs = await AI_Log.find({ submissionId });
      expect(logs).toHaveLength(1);
      expect(logs[0].prompt).toBe('Help me with this');
      expect(logs[0].response).toContain('helpful AI response');
      expect(logs[0].contextProvided).toBe(true);
      expect(logs[0].studentId.toString()).toBe(studentId.toString());
      expect(logs[0].assignmentId.toString()).toBe(assignmentId.toString());
    });

    test('Nên tăng aiInteractionCount trong submission', async () => {
      await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${studentToken}`).send({
        submissionId: submissionId.toString(),
        questionId: questionId.toString(),
        prompt: 'Help me',
      });

      const submission = await AssignmentSubmission.findById(submissionId);
      const answer = submission.answers.find(
        a => a.questionId.toString() === questionId.toString()
      );
      expect(answer.aiInteractionCount).toBe(1);
    });

    test('Nên reject khi submission không tồn tại', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: fakeId,
          prompt: 'Help',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('Nên reject khi submission đã submitted', async () => {
      await AssignmentSubmission.updateOne({ _id: submissionId }, { status: 'submitted' });

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          prompt: 'Help',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('after submission');
    });

    test('Nên reject khi assignment không allow AI', async () => {
      await Assignment.updateOne({ _id: assignmentId }, { 'settings.allowAI': false });

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          prompt: 'Help',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not allowed');
    });

    test('Nên classify promptType đúng', async () => {
      // Test với prompt là câu hỏi
      await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${studentToken}`).send({
        submissionId: submissionId.toString(),
        prompt: 'What does this mean?',
      });

      const logs = await AI_Log.find({ submissionId });
      expect(logs[0].promptType).toBe('question');
    });

    test('Nên xử lý prompt dài', async () => {
      const longPrompt = 'a'.repeat(5000);
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          prompt: longPrompt,
        });

      expect(response.status).toBe(200);
      const logs = await AI_Log.find({ submissionId });
      expect(logs[0].prompt).toHaveLength(5000);
    });

    test('Nên track response time', async () => {
      await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${studentToken}`).send({
        submissionId: submissionId.toString(),
        prompt: 'Help',
      });

      const logs = await AI_Log.find({ submissionId });
      expect(logs[0].responseTime).toBeGreaterThan(0);
      expect(logs[0].responseTime).toBeLessThan(5000); // Should be fast with mock
    });

    test('Nên reject khi thiếu prompt', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
        });

      expect(response.status).toBe(400);
    });

    test('Nên xử lý context optional', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          prompt: 'Help',
          // No context
        });

      expect(response.status).toBe(200);
      const logs = await AI_Log.find({ submissionId });
      expect(logs[0].contextProvided).toBe(false);
    });
  });

  describe('OpenAI Error Handling', () => {
    beforeEach(() => {
      // Override mock to throw errors
      const OpenAI = require('openai');
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API Error')),
          },
        },
      }));
    });

    test('Nên xử lý OpenAI errors gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionId: submissionId.toString(),
          prompt: 'Help',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });
});
