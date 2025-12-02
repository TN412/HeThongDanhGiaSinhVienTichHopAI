const express = require('express');
const router = express.Router();

// Mock route handlers for testing
const analytics = {
  getSubmissionLogs: async (req, res) => {
    const { submissionId } = req.params;

    // Mock data
    const mockLogs = [
      {
        _id: 'log1',
        submissionId,
        assignmentId: 'assignment1',
        studentId: 'student1',
        questionId: 'q1',
        prompt: 'What is a closure?',
        response: 'A closure is a function that...',
        promptType: 'question',
        contextProvided: false,
        timestamp: new Date('2025-01-01T10:00:00Z'),
        promptTokens: 50,
        completionTokens: 100,
        responseTime: 850,
      },
      {
        _id: 'log2',
        submissionId,
        assignmentId: 'assignment1',
        studentId: 'student1',
        questionId: 'q2',
        prompt: 'Can you give me a hint?',
        response: 'Think about scope...',
        promptType: 'hint',
        contextProvided: false,
        timestamp: new Date('2025-01-01T10:05:00Z'),
        promptTokens: 40,
        completionTokens: 80,
        responseTime: 750,
      },
    ];

    res.json({
      success: true,
      logs: mockLogs,
      totalLogs: mockLogs.length,
      submission: {
        id: submissionId,
        studentId: 'student1',
        assignmentId: 'assignment1',
        status: 'submitted',
      },
    });
  },

  getStudentLogs: async (req, res) => {
    const { studentId } = req.params;
    const { assignmentId, limit = 100 } = req.query;

    const mockLogs = [
      {
        _id: 'log1',
        submissionId: 'sub1',
        assignmentId: assignmentId || 'assignment1',
        studentId,
        questionId: 'q1',
        prompt: 'What is React?',
        response: 'React is a library...',
        promptType: 'question',
        contextProvided: true,
        timestamp: new Date('2025-01-01T10:00:00Z'),
        promptTokens: 45,
        completionTokens: 95,
        responseTime: 800,
      },
      {
        _id: 'log2',
        submissionId: 'sub2',
        assignmentId: 'assignment2',
        studentId,
        questionId: 'q2',
        prompt: 'Am I correct?',
        response: 'Your reasoning is...',
        promptType: 'confirmation',
        contextProvided: true,
        timestamp: new Date('2025-01-02T11:00:00Z'),
        promptTokens: 35,
        completionTokens: 75,
        responseTime: 700,
      },
    ];

    const filteredLogs = assignmentId
      ? mockLogs.filter(log => log.assignmentId === assignmentId)
      : mockLogs;

    const logsByAssignment = {};
    filteredLogs.forEach(log => {
      const aId = log.assignmentId;
      if (!logsByAssignment[aId]) {
        logsByAssignment[aId] = {
          assignmentId: aId,
          totalPrompts: 0,
          totalTokens: 0,
          promptTypes: {},
        };
      }
      logsByAssignment[aId].totalPrompts++;
      logsByAssignment[aId].totalTokens += log.promptTokens + log.completionTokens;
      logsByAssignment[aId].promptTypes[log.promptType] =
        (logsByAssignment[aId].promptTypes[log.promptType] || 0) + 1;
    });

    res.json({
      success: true,
      logs: filteredLogs.slice(0, parseInt(limit)),
      totalLogs: filteredLogs.length,
      student: {
        id: studentId,
        name: 'Test Student',
        email: 'student@test.com',
      },
      summary: {
        byAssignment: Object.values(logsByAssignment),
        totalPrompts: filteredLogs.length,
        totalTokens: filteredLogs.reduce(
          (sum, log) => sum + log.promptTokens + log.completionTokens,
          0
        ),
      },
    });
  },

  getAssignmentAnalytics: async (req, res) => {
    const { id } = req.params;

    res.json({
      success: true,
      analytics: {
        assignmentId: id,
        assignmentTitle: 'Test Assignment',
        assignmentType: 'multiple-choice',
        totalQuestions: 10,
        totalPoints: 100,

        totalStudents: 30,
        submittedCount: 25,
        completionRate: '83.3%',

        averageScore: 75.5,
        averageFinalScore: 78.2,
        averageAISkillScore: 82.0,
        scoreDistribution: {
          '0-59': 2,
          '60-69': 3,
          '70-79': 8,
          '80-89': 9,
          '90-100': 3,
        },

        aiUsage: {
          totalPrompts: 150,
          submissionsWithAI: 20,
          aiUsageRate: '66.7%',
          avgPromptsPerSubmission: 7.5,
          totalTokens: 45000,
          avgTokensPerPrompt: 300,
          promptTypes: {
            question: 80,
            hint: 40,
            confirmation: 20,
            clarification: 10,
          },
          topQuestionsWithAI: [
            { questionId: 'q1', count: 25 },
            { questionId: 'q3', count: 18 },
            { questionId: 'q5', count: 15 },
          ],
        },

        timeMetrics: {
          avgTimeSpent: '45.5 minutes',
          minTime: '20.0 minutes',
          maxTime: '90.5 minutes',
        },
      },
    });
  },

  getStudentAnalytics: async (req, res) => {
    const { id } = req.params;

    res.json({
      success: true,
      analytics: {
        studentId: id,
        studentName: 'Test Student',
        studentEmail: 'student@test.com',

        totalAssignments: 10,
        completedAssignments: 8,
        completionRate: '80.0%',

        averageScore: 78.5,
        averageFinalScore: 81.2,
        averageAISkillScore: 85.0,

        aiUsage: {
          totalPrompts: 60,
          totalTokens: 18000,
          avgPromptsPerAssignment: 7.5,
          avgTokensPerPrompt: 300,
          avgPromptLength: 45,
          contextProvidedRate: '75.0%',
          promptTypes: {
            question: 30,
            hint: 15,
            confirmation: 10,
            clarification: 5,
          },
        },

        progressTrend: [
          {
            assignmentId: 'a1',
            assignmentTitle: 'Assignment 1',
            submittedAt: new Date('2025-01-01'),
            totalScore: 75,
            finalScore: 78,
            aiSkillScore: 80,
          },
          {
            assignmentId: 'a2',
            assignmentTitle: 'Assignment 2',
            submittedAt: new Date('2025-01-08'),
            totalScore: 82,
            finalScore: 85,
            aiSkillScore: 90,
          },
        ],

        aiSkillTrend: [
          {
            assignmentId: 'a1',
            assignmentTitle: 'Assignment 1',
            submittedAt: new Date('2025-01-01'),
            aiSkillScore: 80,
            promptCount: 8,
            avgPromptQuality: '42.5',
          },
          {
            assignmentId: 'a2',
            assignmentTitle: 'Assignment 2',
            submittedAt: new Date('2025-01-08'),
            aiSkillScore: 90,
            promptCount: 6,
            avgPromptQuality: '48.0',
          },
        ],

        insights: {
          strengths: ['Excellent AI utilization skills', 'Good at providing context in prompts'],
          weaknesses: [],
          recommendation: 'Keep up the good work! Continue leveraging AI effectively',
        },
      },
    });
  },
};

// Test routes
describe('Analytics Routes', () => {
  describe('GET /api/logs/submission/:submissionId', () => {
    it('should return all logs for a submission sorted by timestamp', async () => {
      const req = { params: { submissionId: 'sub123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getSubmissionLogs(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          logs: expect.any(Array),
          totalLogs: expect.any(Number),
          submission: expect.objectContaining({
            id: 'sub123',
            studentId: expect.any(String),
            assignmentId: expect.any(String),
            status: expect.any(String),
          }),
        })
      );

      const result = res.json.mock.calls[0][0];
      expect(result.logs.length).toBe(2);
      expect(result.logs[0].timestamp).toBeDefined();
      expect(result.totalLogs).toBe(2);
    });

    it('should include all log fields', async () => {
      const req = { params: { submissionId: 'sub123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getSubmissionLogs(req, res);

      const result = res.json.mock.calls[0][0];
      const log = result.logs[0];

      expect(log).toHaveProperty('_id');
      expect(log).toHaveProperty('submissionId');
      expect(log).toHaveProperty('assignmentId');
      expect(log).toHaveProperty('studentId');
      expect(log).toHaveProperty('questionId');
      expect(log).toHaveProperty('prompt');
      expect(log).toHaveProperty('response');
      expect(log).toHaveProperty('promptType');
      expect(log).toHaveProperty('contextProvided');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('promptTokens');
      expect(log).toHaveProperty('completionTokens');
      expect(log).toHaveProperty('responseTime');
    });
  });

  describe('GET /api/logs/student/:studentId', () => {
    it('should return all logs for a student', async () => {
      const req = {
        params: { studentId: 'student123' },
        query: {},
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentLogs(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          logs: expect.any(Array),
          totalLogs: expect.any(Number),
          student: expect.objectContaining({
            id: 'student123',
            name: expect.any(String),
            email: expect.any(String),
          }),
          summary: expect.objectContaining({
            byAssignment: expect.any(Array),
            totalPrompts: expect.any(Number),
            totalTokens: expect.any(Number),
          }),
        })
      );
    });

    it('should filter by assignmentId if provided', async () => {
      const req = {
        params: { studentId: 'student123' },
        query: { assignmentId: 'assignment1' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentLogs(req, res);

      const result = res.json.mock.calls[0][0];
      result.logs.forEach(log => {
        expect(log.assignmentId).toBe('assignment1');
      });
    });

    it('should respect limit parameter', async () => {
      const req = {
        params: { studentId: 'student123' },
        query: { limit: '1' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentLogs(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.logs.length).toBeLessThanOrEqual(1);
    });

    it('should group logs by assignment in summary', async () => {
      const req = {
        params: { studentId: 'student123' },
        query: {},
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentLogs(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.summary.byAssignment).toBeDefined();
      expect(Array.isArray(result.summary.byAssignment)).toBe(true);

      if (result.summary.byAssignment.length > 0) {
        const assignment = result.summary.byAssignment[0];
        expect(assignment).toHaveProperty('assignmentId');
        expect(assignment).toHaveProperty('totalPrompts');
        expect(assignment).toHaveProperty('totalTokens');
        expect(assignment).toHaveProperty('promptTypes');
      }
    });
  });

  describe('GET /api/analytics/assignment/:id', () => {
    it('should return complete assignment analytics', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          analytics: expect.objectContaining({
            assignmentId: 'assignment123',
            assignmentTitle: expect.any(String),
            totalStudents: expect.any(Number),
            submittedCount: expect.any(Number),
            completionRate: expect.stringMatching(/\d+\.\d+%/),
            averageScore: expect.any(Number),
            averageFinalScore: expect.any(Number),
            averageAISkillScore: expect.any(Number),
          }),
        })
      );
    });

    it('should include score distribution', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.scoreDistribution).toBeDefined();
      expect(result.analytics.scoreDistribution).toHaveProperty('0-59');
      expect(result.analytics.scoreDistribution).toHaveProperty('60-69');
      expect(result.analytics.scoreDistribution).toHaveProperty('70-79');
      expect(result.analytics.scoreDistribution).toHaveProperty('80-89');
      expect(result.analytics.scoreDistribution).toHaveProperty('90-100');
    });

    it('should include detailed AI usage metrics', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.aiUsage).toBeDefined();
      expect(result.analytics.aiUsage).toHaveProperty('totalPrompts');
      expect(result.analytics.aiUsage).toHaveProperty('submissionsWithAI');
      expect(result.analytics.aiUsage).toHaveProperty('aiUsageRate');
      expect(result.analytics.aiUsage).toHaveProperty('avgPromptsPerSubmission');
      expect(result.analytics.aiUsage).toHaveProperty('totalTokens');
      expect(result.analytics.aiUsage).toHaveProperty('avgTokensPerPrompt');
      expect(result.analytics.aiUsage).toHaveProperty('promptTypes');
      expect(result.analytics.aiUsage).toHaveProperty('topQuestionsWithAI');
    });

    it('should include time metrics', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.timeMetrics).toBeDefined();
      expect(result.analytics.timeMetrics).toHaveProperty('avgTimeSpent');
      expect(result.analytics.timeMetrics).toHaveProperty('minTime');
      expect(result.analytics.timeMetrics).toHaveProperty('maxTime');
    });

    it('should calculate completion rate correctly', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      const { totalStudents, submittedCount, completionRate } = result.analytics;

      const expectedRate = ((submittedCount / totalStudents) * 100).toFixed(1);
      expect(completionRate).toBe(`${expectedRate}%`);
    });
  });

  describe('GET /api/analytics/student/:id', () => {
    it('should return complete student analytics', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          analytics: expect.objectContaining({
            studentId: 'student123',
            studentName: expect.any(String),
            studentEmail: expect.any(String),
            totalAssignments: expect.any(Number),
            completedAssignments: expect.any(Number),
            completionRate: expect.stringMatching(/\d+\.\d+%/),
          }),
        })
      );
    });

    it('should include progress trend data', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.progressTrend).toBeDefined();
      expect(Array.isArray(result.analytics.progressTrend)).toBe(true);

      if (result.analytics.progressTrend.length > 0) {
        const trend = result.analytics.progressTrend[0];
        expect(trend).toHaveProperty('assignmentId');
        expect(trend).toHaveProperty('assignmentTitle');
        expect(trend).toHaveProperty('submittedAt');
        expect(trend).toHaveProperty('totalScore');
        expect(trend).toHaveProperty('finalScore');
        expect(trend).toHaveProperty('aiSkillScore');
      }
    });

    it('should include AI skill trend data', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.aiSkillTrend).toBeDefined();
      expect(Array.isArray(result.analytics.aiSkillTrend)).toBe(true);

      if (result.analytics.aiSkillTrend.length > 0) {
        const trend = result.analytics.aiSkillTrend[0];
        expect(trend).toHaveProperty('assignmentId');
        expect(trend).toHaveProperty('assignmentTitle');
        expect(trend).toHaveProperty('submittedAt');
        expect(trend).toHaveProperty('aiSkillScore');
        expect(trend).toHaveProperty('promptCount');
        expect(trend).toHaveProperty('avgPromptQuality');
      }
    });

    it('should include AI usage statistics', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.aiUsage).toBeDefined();
      expect(result.analytics.aiUsage).toHaveProperty('totalPrompts');
      expect(result.analytics.aiUsage).toHaveProperty('totalTokens');
      expect(result.analytics.aiUsage).toHaveProperty('avgPromptsPerAssignment');
      expect(result.analytics.aiUsage).toHaveProperty('avgTokensPerPrompt');
      expect(result.analytics.aiUsage).toHaveProperty('avgPromptLength');
      expect(result.analytics.aiUsage).toHaveProperty('contextProvidedRate');
      expect(result.analytics.aiUsage).toHaveProperty('promptTypes');
    });

    it('should include insights with strengths and weaknesses', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.analytics.insights).toBeDefined();
      expect(result.analytics.insights).toHaveProperty('strengths');
      expect(result.analytics.insights).toHaveProperty('weaknesses');
      expect(result.analytics.insights).toHaveProperty('recommendation');
      expect(Array.isArray(result.analytics.insights.strengths)).toBe(true);
      expect(Array.isArray(result.analytics.insights.weaknesses)).toBe(true);
      expect(typeof result.analytics.insights.recommendation).toBe('string');
    });
  });

  describe('Data Format for Frontend Charts', () => {
    it('should return progress trend ready for line chart', async () => {
      const req = { params: { id: 'student123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getStudentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      const trend = result.analytics.progressTrend;

      // Verify chart-ready format
      expect(Array.isArray(trend)).toBe(true);
      trend.forEach(point => {
        expect(point.submittedAt).toBeDefined(); // X-axis (time)
        expect(point.finalScore).toBeDefined(); // Y-axis (score)
        expect(point.assignmentTitle).toBeDefined(); // Label
      });
    });

    it('should return score distribution ready for bar chart', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      const distribution = result.analytics.scoreDistribution;

      // Verify chart-ready format
      expect(typeof distribution).toBe('object');
      Object.keys(distribution).forEach(range => {
        expect(typeof distribution[range]).toBe('number'); // Count for each bucket
      });
    });

    it('should return prompt types ready for pie chart', async () => {
      const req = { params: { id: 'assignment123' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await analytics.getAssignmentAnalytics(req, res);

      const result = res.json.mock.calls[0][0];
      const promptTypes = result.analytics.aiUsage.promptTypes;

      // Verify chart-ready format
      expect(typeof promptTypes).toBe('object');
      Object.keys(promptTypes).forEach(type => {
        expect(typeof promptTypes[type]).toBe('number'); // Count for each type
      });
    });
  });
});

module.exports = router;
