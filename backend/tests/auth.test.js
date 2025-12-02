/**
 * Authentication Routes Test
 * Tests for student/instructor registration, login, and profile endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Authentication Routes', () => {
  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Close MongoDB connection after all tests
    await mongoose.connection.close();
  });

  // =============================================
  // STUDENT REGISTRATION TESTS
  // =============================================

  describe('POST /api/student/register', () => {
    const validStudentData = {
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      studentId: 'ST001',
      department: 'Computer Science',
    };

    it('should register a new student successfully', async () => {
      const res = await request(app)
        .post('/api/student/register')
        .send(validStudentData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Student account created successfully');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toMatchObject({
        name: validStudentData.name,
        email: validStudentData.email.toLowerCase(),
        role: 'student',
        studentId: validStudentData.studentId,
        department: validStudentData.department,
      });

      // Check if refresh token cookie is set
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');

      // Verify user was created in database
      const user = await User.findOne({ email: validStudentData.email.toLowerCase() });
      expect(user).toBeDefined();
      expect(user.role).toBe('student');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/student/register')
        .send({ name: 'Test Student' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/student/register')
        .send({
          name: 'Test Student',
          email: 'student@test.com',
          password: '12345', // Only 5 characters
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('at least 6 characters');
    });

    it('should return 400 if email is already registered', async () => {
      // First registration
      await request(app).post('/api/student/register').send(validStudentData).expect(201);

      // Attempt duplicate registration
      const res = await request(app)
        .post('/api/student/register')
        .send(validStudentData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Email already registered');
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app)
        .post('/api/student/register')
        .send({
          ...validStudentData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('valid email');
    });

    it('should hash password before saving', async () => {
      await request(app).post('/api/student/register').send(validStudentData).expect(201);

      const user = await User.findOne({ email: validStudentData.email.toLowerCase() }).select(
        '+passwordHash'
      );
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(validStudentData.password); // Should be hashed
      expect(user.passwordHash.startsWith('$2a$')).toBe(true); // Bcrypt hash format
    });
  });

  // =============================================
  // STUDENT LOGIN TESTS
  // =============================================

  describe('POST /api/student/login', () => {
    const studentData = {
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      studentId: 'ST001',
    };

    beforeEach(async () => {
      // Create a test student
      await request(app).post('/api/student/register').send(studentData);
    });

    it('should login student successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/student/login')
        .send({
          email: studentData.email,
          password: studentData.password,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(studentData.email.toLowerCase());
      expect(res.body.user.role).toBe('student');

      // Check if refresh token cookie is set
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/student/login')
        .send({ email: studentData.email })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });

    it('should return 401 if email does not exist', async () => {
      const res = await request(app)
        .post('/api/student/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 if password is incorrect', async () => {
      const res = await request(app)
        .post('/api/student/login')
        .send({
          email: studentData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 403 if trying to login as instructor', async () => {
      // Create an instructor
      const instructor = new User({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        passwordHash: 'password123',
        role: 'instructor',
      });
      await instructor.save();

      const res = await request(app)
        .post('/api/student/login')
        .send({
          email: 'instructor@test.com',
          password: 'password123',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('instructor login endpoint');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const beforeLogin = await User.findOne({ email: studentData.email.toLowerCase() });
      expect(beforeLogin.lastLogin).toBeUndefined();

      await request(app)
        .post('/api/student/login')
        .send({
          email: studentData.email,
          password: studentData.password,
        })
        .expect(200);

      const afterLogin = await User.findOne({ email: studentData.email.toLowerCase() });
      expect(afterLogin.lastLogin).toBeDefined();
      expect(afterLogin.lastLogin).toBeInstanceOf(Date);
    });
  });

  // =============================================
  // STUDENT PROFILE TESTS
  // =============================================

  describe('GET /api/student/profile', () => {
    let accessToken;
    const studentData = {
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      studentId: 'ST001',
      department: 'Computer Science',
    };

    beforeEach(async () => {
      // Register and login to get access token
      const res = await request(app).post('/api/student/register').send(studentData);
      accessToken = res.body.accessToken;
    });

    it('should get student profile with valid token', async () => {
      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        name: studentData.name,
        email: studentData.email.toLowerCase(),
        role: 'student',
        studentId: studentData.studentId,
        department: studentData.department,
      });
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.createdAt).toBeDefined();
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/student/profile').expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('token');
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 403 if instructor tries to access student profile', async () => {
      // Create and login as instructor
      const instructor = new User({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        passwordHash: 'password123',
        role: 'instructor',
      });
      await instructor.save();

      const loginRes = await request(app)
        .post('/api/instructor/login')
        .send({ email: 'instructor@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Student role required');
    });
  });

  // =============================================
  // INSTRUCTOR LOGIN TESTS
  // =============================================

  describe('POST /api/instructor/login', () => {
    beforeEach(async () => {
      // Create a test instructor
      const instructor = new User({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        passwordHash: 'password123',
        role: 'instructor',
        department: 'Computer Science',
      });
      await instructor.save();
    });

    it('should login instructor successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/instructor/login')
        .send({
          email: 'instructor@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('instructor@test.com');
      expect(res.body.user.role).toBe('instructor');
    });

    it('should return 403 if student tries to use instructor login', async () => {
      // Create a student
      await request(app).post('/api/student/register').send({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
      });

      const res = await request(app)
        .post('/api/instructor/login')
        .send({
          email: 'student@test.com',
          password: 'password123',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('student login endpoint');
    });
  });

  // =============================================
  // INSTRUCTOR DASHBOARD TESTS
  // =============================================

  describe('GET /api/instructor/dashboard', () => {
    let accessToken;

    beforeEach(async () => {
      // Create and login as instructor
      const instructor = new User({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        passwordHash: 'password123',
        role: 'instructor',
        department: 'Computer Science',
      });
      await instructor.save();

      const res = await request(app)
        .post('/api/instructor/login')
        .send({ email: 'instructor@test.com', password: 'password123' });

      accessToken = res.body.accessToken;
    });

    it('should get instructor dashboard with valid token', async () => {
      const res = await request(app)
        .get('/api/instructor/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.dashboard).toBeDefined();
      expect(res.body.dashboard.instructor).toBeDefined();
      expect(res.body.dashboard.stats).toBeDefined();
      expect(res.body.dashboard.stats).toMatchObject({
        totalAssignments: 0,
        totalSubmissions: 0,
        pendingGrading: 0,
        avgAISkillScore: 0,
      });
    });

    it('should return 403 if student tries to access dashboard', async () => {
      // Register and login as student
      const studentRes = await request(app).post('/api/student/register').send({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
      });

      const res = await request(app)
        .get('/api/instructor/dashboard')
        .set('Authorization', `Bearer ${studentRes.body.accessToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Instructor role required');
    });
  });

  // =============================================
  // TOKEN REFRESH TESTS
  // =============================================

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Register student and extract refresh token from cookie
      const res = await request(app).post('/api/student/register').send({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
      });

      // Extract refresh token from Set-Cookie header
      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      refreshToken = refreshCookie.split(';')[0].split('=')[1];
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.message).toBe('Access token refreshed successfully');
    });

    it('should return 401 if refresh token is missing', async () => {
      const res = await request(app).post('/api/auth/refresh').expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Refresh token not found');
    });

    it('should return 401 if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid refresh token');
    });
  });

  // =============================================
  // LOGOUT TESTS
  // =============================================

  describe('POST /api/auth/logout', () => {
    it('should clear refresh token cookie on logout', async () => {
      const res = await request(app).post('/api/auth/logout').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');

      // Check if cookie is cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      expect(refreshCookie).toContain('Max-Age=0'); // Cookie should be expired
    });
  });
});
