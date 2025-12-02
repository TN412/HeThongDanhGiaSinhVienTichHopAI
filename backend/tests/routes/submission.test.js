/**
 * Tests for Submission Routes
 * Location: backend/tests/routes/submission.test.js
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

describe('Submission Routes', () => {
  let studentToken;
  let studentId;
  let instructorToken;
  let instructorId;
  let assignmentId;

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
    instructorToken = generateToken(instructorId, 'instructor');

    // Create assignment
    const assignment = await Assignment.create(createMockAssignment(instructorId));
    assignmentId = assignment._id;
  });

  describe('POST /api/submission/start', () => {
    test('Nên tạo submission mới thành công', async () => {
      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignmentId.toString() });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.submission).toBeDefined();
      expect(response.body.submission.status).toBe('draft');
      expect(response.body.submission.studentId).toBe(studentId.toString());
      expect(response.body.submission.attemptNumber).toBe(1);
    });

    test('Nên reject khi assignment không tồn tại', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: fakeId });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('Nên reject khi assignment chưa published', async () => {
      await Assignment.updateOne({ _id: assignmentId }, { status: 'draft' });

      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignmentId.toString() });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not published');
    });

    test('Nên reject khi quá deadline', async () => {
      const pastDate = new Date('2020-01-01');
      await Assignment.updateOne({ _id: assignmentId }, { deadline: pastDate });

      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignmentId.toString() });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('deadline');
    });

    test('Nên tạo answer slots cho mỗi câu hỏi', async () => {
      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignmentId.toString() });

      const assignment = await Assignment.findById(assignmentId);
      expect(response.body.submission.answers).toHaveLength(assignment.questions.length);
    });

    test('Nên reject khi không phải student', async () => {
      const response = await request(app)
        .post('/api/submission/start')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ assignmentId: assignmentId.toString() });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/submission/:id (Save draft)', () => {
    let submissionId;

    beforeEach(async () => {
      const submission = await AssignmentSubmission.create({
        studentId,
        assignmentId,
        attemptNumber: 1,
        status: 'draft',
        answers: [
          { questionId: 'q1', answer: null, aiInteractionCount: 0 },
          { questionId: 'q2', answer: null, aiInteractionCount: 0 },
        ],
        startedAt: new Date(),
      });
      submissionId = submission._id;
    });

    test('Nên update answers thành công', async () => {
      const response = await request(app)
        .put(`/api/submission/${submissionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          answers: [
            { questionId: 'q1', answer: 'B', aiInteractionCount: 1 },
            { questionId: 'q2', answer: 'C', aiInteractionCount: 0 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submission.answers[0].answer).toBe('B');
    });

    test('Nên reject khi submission đã submitted', async () => {
      await AssignmentSubmission.updateOne({ _id: submissionId }, { status: 'submitted' });

      const response = await request(app)
        .put(`/api/submission/${submissionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [] });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('already submitted');
    });

    test('Nên reject khi không phải owner', async () => {
      const otherStudent = await User.create({
        ...createMockStudent(),
        email: 'other@test.com',
      });
      const otherToken = generateToken(otherStudent._id, 'student');

      const response = await request(app)
        .put(`/api/submission/${submissionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ answers: [] });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/submission/:id/submit', () => {
    let submissionId;
    let assignment;

    beforeEach(async () => {
      assignment = await Assignment.findById(assignmentId);

      const submission = await AssignmentSubmission.create({
        studentId,
        assignmentId,
        attemptNumber: 1,
        status: 'draft',
        answers: assignment.questions.map((q, idx) => ({
          questionId: q._id,
          answer: idx === 0 ? 'B' : 'C', // First correct, second correct
          aiInteractionCount: 0,
        })),
        startedAt: new Date(),
      });
      submissionId = submission._id;
    });

    test('Nên submit và auto-grade thành công', async () => {
      const response = await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalScore).toBe(20); // Both correct
      expect(response.body.finalScore).toBeDefined();
      expect(response.body.aiSkillScore).toBeDefined();
    });

    test('Nên tính điểm đúng cho multiple-choice', async () => {
      // Update first answer to wrong
      await AssignmentSubmission.updateOne(
        { _id: submissionId },
        { $set: { 'answers.0.answer': 'A' } } // Wrong answer
      );

      const response = await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.totalScore).toBe(10); // Only second question correct
    });

    test('Nên tính AI skill score = 100 khi không dùng AI', async () => {
      const response = await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.aiSkillScore).toBe(100);
    });

    test('Nên tính AI skill score thấp hơn khi có AI logs', async () => {
      // Create AI logs
      await AI_Log.create([
        {
          submissionId,
          studentId,
          assignmentId,
          questionId: assignment.questions[0]._id,
          prompt: 'help',
          response: 'Sure',
          promptType: 'question',
          contextProvided: false,
          timestamp: new Date(),
          promptTokens: 10,
          completionTokens: 20,
          responseTime: 100,
        },
        {
          submissionId,
          studentId,
          assignmentId,
          questionId: assignment.questions[0]._id,
          prompt: 'help me',
          response: 'OK',
          promptType: 'question',
          contextProvided: false,
          timestamp: new Date(),
          promptTokens: 10,
          completionTokens: 20,
          responseTime: 100,
        },
      ]);

      const response = await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.aiSkillScore).toBeLessThan(100);
      expect(response.body.aiSkillScore).toBeGreaterThan(0);
    });

    test('Nên update status thành submitted', async () => {
      await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      const submission = await AssignmentSubmission.findById(submissionId);
      expect(submission.status).toBe('submitted');
      expect(submission.submittedAt).toBeDefined();
    });

    test('Nên reject khi đã submitted trước đó', async () => {
      await AssignmentSubmission.updateOne({ _id: submissionId }, { status: 'submitted' });

      const response = await request(app)
        .post(`/api/submission/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/submission/instructor/all', () => {
    beforeEach(async () => {
      // Create submissions
      const submission1 = await AssignmentSubmission.create({
        studentId,
        assignmentId,
        attemptNumber: 1,
        status: 'submitted',
        answers: [],
        totalScore: 15,
        aiSkillScore: 85,
        finalScore: 75,
        startedAt: new Date(),
        submittedAt: new Date(),
      });

      const submission2 = await AssignmentSubmission.create({
        studentId,
        assignmentId,
        attemptNumber: 1,
        status: 'draft',
        answers: [],
        startedAt: new Date(),
      });
    });

    test('Nên trả về danh sách submissions', async () => {
      const response = await request(app)
        .get('/api/submission/instructor/all')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submissions).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('Nên filter theo status', async () => {
      const response = await request(app)
        .get('/api/submission/instructor/all?status=submitted')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].status).toBe('submitted');
    });

    test('Nên populate student và assignment info', async () => {
      const response = await request(app)
        .get('/api/submission/instructor/all')
        .set('Authorization', `Bearer ${instructorToken}`);

      const submission = response.body.submissions[0];
      expect(submission.studentId).toBeDefined();
      expect(submission.studentId.name).toBeDefined();
      expect(submission.assignmentId).toBeDefined();
      expect(submission.assignmentId.title).toBeDefined();
    });

    test('Nên reject khi không phải instructor', async () => {
      const response = await request(app)
        .get('/api/submission/instructor/all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    test('Nên chỉ trả về submissions của assignments thuộc instructor', async () => {
      // Create another instructor with assignment
      const otherInstructor = await User.create({
        ...createMockInstructor(),
        email: 'other@test.com',
      });
      const otherAssignment = await Assignment.create(
        createMockAssignment(otherInstructor._id, { title: 'Other Assignment' })
      );
      await AssignmentSubmission.create({
        studentId,
        assignmentId: otherAssignment._id,
        attemptNumber: 1,
        status: 'submitted',
        answers: [],
        startedAt: new Date(),
      });

      const response = await request(app)
        .get('/api/submission/instructor/all')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.body.submissions).toHaveLength(2); // Không bao gồm submission của instructor khác
    });
  });
});
