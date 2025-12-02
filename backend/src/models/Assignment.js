const mongoose = require('mongoose');

/**
 * Assignment Model
 * Represents assignments created by instructors with AI-generated or manual questions
 */
const assignmentSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    sourceDocument: {
      filename: {
        type: String,
        trim: true,
      },
      blobUrl: {
        type: String,
        trim: true,
      },
      extractedText: {
        type: String,
      },
    },
    questionType: {
      type: String,
      enum: {
        values: ['multiple-choice', 'essay', 'mixed'],
        message: '{VALUE} is not a valid question type',
      },
      required: [true, 'Question type is required'],
      default: 'multiple-choice',
    },
    questions: [
      {
        type: {
          type: String,
          enum: {
            values: ['multiple-choice', 'essay'],
            message: '{VALUE} is not a valid question type',
          },
          required: [true, 'Question type is required'],
        },
        question: {
          type: String,
          required: [true, 'Question text is required'],
          trim: true,
        },
        // For multiple-choice questions only
        options: {
          type: [String],
          validate: {
            validator: function (options) {
              // Options required only for multiple-choice
              if (this.type === 'multiple-choice') {
                return options && options.length >= 2 && options.length <= 6;
              }
              return true;
            },
            message: 'Multiple-choice questions must have 2-6 options',
          },
        },
        correctAnswer: {
          type: String,
          validate: {
            validator: function (answer) {
              // Correct answer required only for multiple-choice
              if (this.type === 'multiple-choice') {
                return answer && answer.trim().length > 0;
              }
              return true;
            },
            message: 'Multiple-choice questions must have a correct answer',
          },
        },
        explanation: {
          type: String,
          trim: true,
        },
        // For essay questions only
        rubric: {
          type: String,
          trim: true,
          validate: {
            validator: function (rubric) {
              // Rubric recommended for essay questions
              if (this.type === 'essay' && !rubric) {
                console.warn('Essay question missing rubric');
              }
              return true;
            },
          },
        },
        points: {
          type: Number,
          required: [true, 'Points are required for each question'],
          min: [0, 'Points cannot be negative'],
          default: 1,
        },
        // Question metadata
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
        },
        estimatedTime: {
          type: Number, // minutes
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid status',
      },
      required: [true, 'Status is required'],
      default: 'draft',
    },
    settings: {
      timeLimit: {
        type: Number, // minutes
        min: [0, 'Time limit cannot be negative'],
        default: null, // null means no time limit
      },
      allowAI: {
        type: Boolean,
        default: true, // Default: allow AI usage
      },
      allowMultipleDrafts: {
        type: Boolean,
        default: true,
      },
      maxAttempts: {
        type: Number,
        min: [1, 'Must allow at least 1 attempt'],
        default: 1,
      },
      shuffleQuestions: {
        type: Boolean,
        default: false,
      },
      shuffleOptions: {
        type: Boolean,
        default: false,
      },
      showResultsImmediately: {
        type: Boolean,
        default: true,
      },
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deadline: {
      type: Date,
    },
    // Computed field (virtual)
    // totalPoints is calculated from questions
  },
  {
    timestamps: true,
    collection: 'assignments',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes as per documentation
assignmentSchema.index({ instructorId: 1, status: 1 });
assignmentSchema.index({ deadline: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ createdAt: -1 });

// Virtual for totalPoints (computed from questions)
assignmentSchema.virtual('totalPoints').get(function () {
  if (!this.questions || this.questions.length === 0) {
    return 0;
  }
  return this.questions.reduce((sum, question) => sum + (question.points || 0), 0);
});

// Virtual for question count
assignmentSchema.virtual('questionCount').get(function () {
  return this.questions ? this.questions.length : 0;
});

// Virtual to check if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function () {
  if (!this.deadline) return false;
  return new Date() > this.deadline;
});

// Instance method to publish assignment
assignmentSchema.methods.publish = function () {
  if (this.questions.length === 0) {
    throw new Error('Cannot publish assignment without questions');
  }
  this.status = 'published';
  return this.save();
};

// Instance method to archive assignment
assignmentSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

// Static method to find published assignments
assignmentSchema.statics.findPublished = function (filter = {}) {
  return this.find({ ...filter, status: 'published' }).sort({ deadline: 1 });
};

// Static method to find assignments by instructor
assignmentSchema.statics.findByInstructor = function (instructorId, status = null) {
  const query = { instructorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Pre-validate hook to ensure question consistency
assignmentSchema.pre('validate', function (next) {
  // Validate that questionType matches actual question types
  if (this.questions && this.questions.length > 0) {
    const types = new Set(this.questions.map(q => q.type));

    if (types.size === 1 && this.questionType === 'mixed') {
      // All questions are same type but assignment type is mixed
      const singleType = Array.from(types)[0];
      console.warn(`Assignment questionType is 'mixed' but all questions are '${singleType}'`);
    } else if (types.size > 1 && this.questionType !== 'mixed') {
      // Multiple question types but assignment type is not mixed
      this.questionType = 'mixed';
    }
  }
  next();
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
