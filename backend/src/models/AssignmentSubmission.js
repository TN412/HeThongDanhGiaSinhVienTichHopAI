const mongoose = require('mongoose');

/**
 * AssignmentSubmission Model
 * Represents a student's submission for an assignment with AI interaction tracking
 */
const assignmentSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required'],
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Attempt number must be at least 1'],
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Question ID is required'],
        },
        answer: {
          type: String,
          trim: true,
        },
        // For multiple-choice questions
        isCorrect: {
          type: Boolean,
          default: null, // null until graded
        },
        pointsEarned: {
          type: Number,
          default: 0,
          min: [0, 'Points earned cannot be negative'],
        },
        // AI interaction tracking
        aiInteractionCount: {
          type: Number,
          default: 0,
          min: [0, 'AI interaction count cannot be negative'],
        },
        // Essay grading metadata
        instructorFeedback: {
          type: String,
          trim: true,
        },
        gradedAt: {
          type: Date,
        },
        gradedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['draft', 'submitted', 'pending_grading', 'graded'],
        message: '{VALUE} is not a valid submission status',
      },
      required: [true, 'Status is required'],
      default: 'draft',
    },
    // Scoring
    totalScore: {
      type: Number,
      default: 0,
      min: [0, 'Total score cannot be negative'],
    },
    aiSkillScore: {
      type: Number,
      default: 0,
      min: [0, 'AI skill score cannot be negative'],
      max: [10, 'AI skill score cannot exceed 10'],
    },
    contentScore: {
      type: Number,
      default: 0,
      min: [0, 'Content score cannot be negative'],
      max: [10, 'Content score cannot exceed 10'],
    },
    finalScore: {
      type: Number,
      default: 0,
      min: [0, 'Final score cannot be negative'],
      max: [10, 'Final score cannot exceed 10'],
    },
    // Instructor feedback (overall comment for the whole submission)
    feedback: {
      type: String,
      trim: true,
    },
    feedbackAt: {
      type: Date,
    },
    feedbackBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Timestamps
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    // AI interaction summary
    aiInteractionSummary: {
      totalPrompts: {
        type: Number,
        default: 0,
        min: 0,
      },
      avgPromptLength: {
        type: Number,
        default: 0,
        min: 0,
      },
      contextProvidedRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      independenceLevel: {
        type: Number,
        default: 1, // 1 = fully independent (no AI usage)
        min: 0,
        max: 1,
      },
      promptQuality: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      iterationEfficiency: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    // Behavioral tracking
    behaviorMetrics: {
      tabSwitchCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTimeSpent: {
        type: Number, // milliseconds
        default: 0,
        min: 0,
      },
      lastActivityAt: {
        type: Date,
      },
    },
    // Instructor feedback
    instructorComments: {
      type: String,
      trim: true,
    },
    feedbackProvidedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'assignment_submissions',
  }
);

// Compound indexes as per documentation
assignmentSubmissionSchema.index({ studentId: 1, assignmentId: 1, attemptNumber: 1 });
assignmentSubmissionSchema.index({ status: 1 });
assignmentSubmissionSchema.index({ submittedAt: 1 });
assignmentSubmissionSchema.index({ assignmentId: 1, status: 1 });
assignmentSubmissionSchema.index({ studentId: 1, status: 1 });

// Virtual for time taken
assignmentSubmissionSchema.virtual('timeTaken').get(function () {
  if (!this.submittedAt) return null;
  return this.submittedAt - this.startedAt; // milliseconds
});

// Virtual for completion percentage
assignmentSubmissionSchema.virtual('completionPercentage').get(function () {
  if (!this.answers || this.answers.length === 0) return 0;
  const answeredCount = this.answers.filter(a => a.answer && a.answer.trim()).length;
  return Math.round((answeredCount / this.answers.length) * 100);
});

// Instance method to submit the assignment
assignmentSubmissionSchema.methods.submit = function () {
  if (this.status === 'submitted') {
    throw new Error('Assignment already submitted');
  }
  this.status = 'submitted';
  this.submittedAt = new Date();
  return this.save();
};

// Instance method to calculate final score
assignmentSubmissionSchema.methods.calculateFinalScore = function (
  contentWeight = 0.7,
  aiSkillWeight = 0.3
) {
  // Assuming assignment has totalPoints virtual
  const contentScore = this.totalScore; // Raw score
  const maxScore = 100; // Normalize to 100

  // Get content percentage
  const contentPercentage = contentScore; // Should be normalized by caller

  // Final score = 70% content + 30% AI skill
  this.finalScore = contentPercentage * contentWeight + this.aiSkillScore * aiSkillWeight;

  return this.finalScore;
};

// Instance method to update AI interaction summary
assignmentSubmissionSchema.methods.updateAIInteractionSummary = async function () {
  const AI_Log = mongoose.model('AI_Log');
  const logs = await AI_Log.find({ submissionId: this._id });

  if (logs.length === 0) {
    this.aiInteractionSummary = {
      totalPrompts: 0,
      avgPromptLength: 0,
      contextProvidedRate: 0,
      independenceLevel: 1, // Fully independent
      promptQuality: 100,
      iterationEfficiency: 100,
    };
    return;
  }

  // Calculate summary metrics
  const totalPrompts = logs.length;
  const avgPromptLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / totalPrompts;
  const contextProvidedRate = logs.filter(log => log.contextProvided).length / totalPrompts;

  // Calculate independence level (inverse of AI usage rate)
  const aiUsageRate = totalPrompts / this.answers.length;
  const independenceLevel = Math.max(0, 1 - aiUsageRate * 0.3);

  // Calculate prompt quality (based on length and context)
  const promptQuality = Math.min(100, (avgPromptLength / 50) * 50 + contextProvidedRate * 50);

  // Calculate iteration efficiency (unique prompts / total prompts)
  const uniquePrompts = new Set(logs.map(l => l.prompt.toLowerCase().trim())).size;
  const iterationEfficiency = (uniquePrompts / totalPrompts) * 100;

  this.aiInteractionSummary = {
    totalPrompts,
    avgPromptLength,
    contextProvidedRate,
    independenceLevel,
    promptQuality,
    iterationEfficiency,
  };
};

// Static method to find submissions by student
assignmentSubmissionSchema.statics.findByStudent = function (studentId, status = null) {
  const query = { studentId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('assignmentId').sort({ createdAt: -1 });
};

// Static method to find submissions by assignment
assignmentSubmissionSchema.statics.findByAssignment = function (assignmentId, status = null) {
  const query = { assignmentId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('studentId').sort({ submittedAt: -1 });
};

// Pre-save hook to update behavioral metrics
assignmentSubmissionSchema.pre('save', function (next) {
  if (this.isModified('answers')) {
    this.behaviorMetrics.lastActivityAt = new Date();
  }
  next();
});

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

module.exports = AssignmentSubmission;
