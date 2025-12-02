/**
 * Tests for Assignment Routes
 * Location: backend/tests/routes/assignment.test.js
 */

const request = require('supertest');
const app = require('../../src/app');
const { Assignment, User } = require('../../src/models');
const {
  connectDB,
  disconnectDB,
  clearDB,
  generateToken,
  createMockInstructor,
  createMockFile,
  mockOpenAI,
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
                content: JSON.stringify([
                  {
                    type: 'multiple-choice',
                    question: 'What is Node.js?',
                    options: ['A. Runtime', 'B. Framework', 'C. Language', 'D. Database'],
                    correctAnswer: 'A',
                    explanation: 'Node.js is a JavaScript runtime',
                    points: 10,
                    difficulty: 'easy',
                  },
                  {
                    type: 'multiple-choice',
                    question: 'What is Express?',
                    options: ['A. Runtime', 'B. Framework', 'C. Language', 'D. Database'],
                    correctAnswer: 'B',
                    explanation: 'Express is a web framework',
                    points: 10,
                    difficulty: 'medium',
                  },
                ]),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 250,
            total_tokens: 400,
          },
        }),
      },
    },
  }));
});

// Mock Azure Blob Storage
jest.mock('../../src/utils/blob', () => ({
  uploadToBlob: jest.fn().mockResolvedValue('https://blob.azure.com/test-file.pdf'),
  isBlobStorageConfigured: jest.fn().mockReturnValue(true),
}));

// Mock document parser
jest.mock('../../src/utils/documentParser', () => ({
  extractText: jest.fn().mockResolvedValue('This is extracted text from the document.'),
  validateExtractedText: jest.fn().mockReturnValue(true),
  truncateForAI: jest.fn().mockImplementation(text => text.substring(0, 5000)),
}));

describe('Assignment Routes', () => {
  let instructorToken;
  let instructorId;
  let studentToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Create instructor
    const instructor = await User.create(createMockInstructor());
    instructorId = instructor._id;
    instructorToken = generateToken(instructorId, 'instructor');

    // Create student
    const student = await User.create({
      ...createMockInstructor(),
      email: 'student@test.com',
      role: 'student',
    });
    studentToken = generateToken(student._id, 'student');
  });

  describe('POST /api/assignment/generate', () => {
    test('Nên generate assignment thành công với OpenAI mock', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .field('questionType', 'multiple-choice')
        .field('questionCount', '2')
        .field('difficulty', 'medium')
        .attach('document', Buffer.from('fake pdf content'), 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.assignmentId).toBeDefined();
      expect(response.body.questions).toHaveLength(2);
      expect(response.body.questions[0].type).toBe('multiple-choice');
      expect(response.body.questions[0].correctAnswer).toBeDefined();
      expect(response.body.meta.sourceFile).toBe('test.pdf');
    });

    test('Nên reject khi không có file', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .field('questionType', 'multiple-choice')
        .field('questionCount', '2');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Nên reject khi questionType invalid', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .field('questionType', 'invalid-type')
        .field('questionCount', '2')
        .attach('document', Buffer.from('fake content'), 'test.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('questionType');
    });

    test('Nên reject khi questionCount ngoài giới hạn', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .field('questionType', 'multiple-choice')
        .field('questionCount', '50')
        .attach('document', Buffer.from('fake content'), 'test.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('questionCount');
    });

    test('Nên reject khi không phải instructor', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('questionType', 'multiple-choice')
        .field('questionCount', '2')
        .attach('document', Buffer.from('fake content'), 'test.pdf');

      expect(response.status).toBe(403);
    });

    test('Nên reject khi không có token', async () => {
      const response = await request(app)
        .post('/api/assignment/generate')
        .field('questionType', 'multiple-choice')
        .field('questionCount', '2')
        .attach('document', Buffer.from('fake content'), 'test.pdf');

      expect(response.status).toBe(401);
    });

    test('Nên lưu assignment vào database', async () => {
      await request(app)
        .post('/api/assignment/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .field('questionType', 'multiple-choice')
        .field('questionCount', '2')
        .attach('document', Buffer.from('fake content'), 'test.pdf');

      const assignments = await Assignment.find({ instructorId });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].questions).toHaveLength(2);
      expect(assignments[0].totalPoints).toBe(20);
      expect(assignments[0].status).toBe('draft');
    });
  });

  describe('GET /api/assignment/list', () => {
    beforeEach(async () => {
      // Create some assignments
      await Assignment.create({
        instructorId,
        title: 'Assignment 1',
        questionType: 'multiple-choice',
        questions: [
          {
            type: 'multiple-choice',
            question: 'Test?',
            options: ['A', 'B'],
            correctAnswer: 'A',
            points: 10,
          },
        ],
        totalPoints: 10,
        status: 'published',
      });

      await Assignment.create({
        instructorId,
        title: 'Assignment 2',
        questionType: 'essay',
        questions: [
          {
            type: 'essay',
            question: 'Explain...',
            rubric: 'Check for...',
            points: 20,
          },
        ],
        totalPoints: 20,
        status: 'draft',
      });
    });

    test('Nên trả về danh sách assignments của instructor', async () => {
      const response = await request(app)
        .get('/api/assignment/list')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.assignments).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('Nên filter theo status', async () => {
      const response = await request(app)
        .get('/api/assignment/list?status=published')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignments).toHaveLength(1);
      expect(response.body.assignments[0].status).toBe('published');
    });

    test('Nên reject khi không phải instructor', async () => {
      const response = await request(app)
        .get('/api/assignment/list')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    test('Nên chỉ trả về assignments của instructor đó', async () => {
      // Create another instructor
      const otherInstructor = await User.create({
        ...createMockInstructor(),
        email: 'other@test.com',
      });

      await Assignment.create({
        instructorId: otherInstructor._id,
        title: 'Other Assignment',
        questionType: 'multiple-choice',
        questions: [],
        totalPoints: 10,
        status: 'published',
      });

      const response = await request(app)
        .get('/api/assignment/list')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.body.assignments).toHaveLength(2); // Không bao gồm assignment của instructor khác
    });
  });
});
