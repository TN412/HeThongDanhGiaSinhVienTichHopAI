/**
 * Test setup and utilities
 * Provides MongoDB memory server, JWT tokens, and mock data
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
  console.log('✅ Connected to in-memory MongoDB');
};

/**
 * Disconnect and stop MongoDB
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('🔌 Disconnected from MongoDB');
};

/**
 * Clear all collections
 */
const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Generate JWT access token for testing
 */
const generateToken = (userId, role = 'student') => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test-secret-key', {
    expiresIn: '1h',
  });
};

/**
 * Hash password for testing
 */
const hashPassword = async password => {
  return bcrypt.hash(password, 10);
};

/**
 * Create mock user data
 */
const createMockStudent = (overrides = {}) => ({
  name: 'Test Student',
  email: 'student@test.com',
  passwordHash: 'hashedPassword123',
  role: 'student',
  studentId: 'ST001',
  department: 'Computer Science',
  isActive: true,
  ...overrides,
});

const createMockInstructor = (overrides = {}) => ({
  name: 'Test Instructor',
  email: 'instructor@test.com',
  passwordHash: 'hashedPassword123',
  role: 'instructor',
  department: 'Computer Science',
  isActive: true,
  ...overrides,
});

/**
 * Create mock assignment data
 */
const createMockAssignment = (instructorId, overrides = {}) => ({
  instructorId,
  title: 'Test Assignment',
  description: 'This is a test assignment',
  questionType: 'multiple-choice',
  questions: [
    {
      type: 'multiple-choice',
      question: 'What is 2 + 2?',
      options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'],
      correctAnswer: 'B',
      explanation: 'Basic arithmetic',
      points: 10,
      difficulty: 'easy',
    },
    {
      type: 'multiple-choice',
      question: 'What is the capital of France?',
      options: ['A. London', 'B. Berlin', 'C. Paris', 'D. Madrid'],
      correctAnswer: 'C',
      explanation: 'Geography',
      points: 10,
      difficulty: 'easy',
    },
  ],
  totalPoints: 20,
  status: 'published',
  settings: {
    allowAI: true,
    allowMultipleDrafts: true,
    timeLimit: null,
    maxAttempts: 1,
  },
  generatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock submission data
 */
const createMockSubmission = (studentId, assignmentId, overrides = {}) => ({
  studentId,
  assignmentId,
  attemptNumber: 1,
  status: 'draft',
  answers: [],
  totalScore: 0,
  aiSkillScore: 0,
  finalScore: 0,
  startedAt: new Date(),
  ...overrides,
});

/**
 * Create mock AI log data
 */
const createMockAILog = (submissionId, studentId, assignmentId, overrides = {}) => ({
  submissionId,
  studentId,
  assignmentId,
  questionId: 'q1',
  prompt: 'Can you help me understand this question?',
  response: 'Sure! Let me explain...',
  promptType: 'question',
  contextProvided: true,
  timestamp: new Date(),
  promptTokens: 50,
  completionTokens: 100,
  responseTime: 500,
  ...overrides,
});

/**
 * Mock OpenAI API
 */
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  type: 'multiple-choice',
                  question: 'What is React?',
                  options: ['A. Library', 'B. Framework', 'C. Language', 'D. Tool'],
                  correctAnswer: 'A',
                  explanation: 'React is a JavaScript library',
                  points: 10,
                  difficulty: 'easy',
                },
              ]),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      }),
    },
  },
};

/**
 * Mock file upload
 */
const createMockFile = (filename = 'test.pdf', mimetype = 'application/pdf', size = 1024) => ({
  fieldname: 'document',
  originalname: filename,
  encoding: '7bit',
  mimetype,
  buffer: Buffer.from('fake file content'),
  size,
});

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
  generateToken,
  hashPassword,
  createMockStudent,
  createMockInstructor,
  createMockAssignment,
  createMockSubmission,
  createMockAILog,
  mockOpenAI,
  createMockFile,
};
