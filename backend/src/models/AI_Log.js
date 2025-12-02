const mongoose = require('mongoose');

/**
 * AI_Log Model
 * Tracks all AI interactions during assignment completion for analysis and scoring
 */
const aiLogSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignmentSubmission',
      required: [true, 'Submission ID is required'],
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional - may be general question not tied to specific question
    },
    prompt: {
      type: String,
      required: [true, 'Prompt is required'],
      trim: true,
      maxlength: [5000, 'Prompt cannot exceed 5000 characters'],
    },
    response: {
      type: String,
      required: [true, 'Response is required'],
      maxlength: [10000, 'Response cannot exceed 10000 characters'],
    },
    promptType: {
      type: String,
      enum: {
        values: ['question', 'clarification', 'hint', 'explanation', 'other'],
        message: '{VALUE} is not a valid prompt type',
      },
      required: [true, 'Prompt type is required'],
      default: 'question',
    },
    contextProvided: {
      type: Boolean,
      default: false,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Token usage tracking
    promptTokens: {
      type: Number,
      required: [true, 'Prompt tokens are required'],
      min: [0, 'Prompt tokens cannot be negative'],
      default: 0,
    },
    completionTokens: {
      type: Number,
      required: [true, 'Completion tokens are required'],
      min: [0, 'Completion tokens cannot be negative'],
      default: 0,
    },
    totalTokens: {
      type: Number,
      min: [0, 'Total tokens cannot be negative'],
    },
    // Performance metrics
    responseTime: {
      type: Number, // milliseconds
      required: [true, 'Response time is required'],
      min: [0, 'Response time cannot be negative'],
    },
    // Model information
    model: {
      type: String,
      default: 'gpt-4',
      trim: true,
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
    },
    // Quality scoring (can be computed later by ML model)
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null, // null until analyzed
    },
    isHelpful: {
      type: Boolean,
      default: null, // null until student feedback
    },
    // Instructor labeling for ML training dataset
    instructorLabel: {
      quality: {
        type: String,
        enum: {
          values: ['good', 'bad', null],
          message: '{VALUE} is not a valid quality label',
        },
        default: null,
      },
      labeledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      labeledAt: {
        type: Date,
        default: null,
      },
      note: {
        type: String,
        trim: true,
        maxlength: [500, 'Label note cannot exceed 500 characters'],
        default: null,
      },
    },
    // Metadata for originality checking
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Structure: { questionText: String, options: [String] }
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false, // Use custom timestamp field instead
    collection: 'ai_logs',
  }
);

// Critical indexes as per documentation
aiLogSchema.index({ submissionId: 1, timestamp: 1 });
aiLogSchema.index({ studentId: 1, assignmentId: 1 });
aiLogSchema.index({ questionId: 1 });
aiLogSchema.index({ promptType: 1 });
aiLogSchema.index({ timestamp: -1 });

// Compound index for analytics queries
aiLogSchema.index({ assignmentId: 1, timestamp: 1 });
aiLogSchema.index({ studentId: 1, timestamp: 1 });

// Pre-save hook to calculate total tokens
aiLogSchema.pre('save', function (next) {
  if (this.promptTokens !== undefined && this.completionTokens !== undefined) {
    this.totalTokens = this.promptTokens + this.completionTokens;
  }
  next();
});

// Virtual for token cost (example pricing)
aiLogSchema.virtual('estimatedCost').get(function () {
  // Example: GPT-4 pricing (input: $0.03/1K tokens, output: $0.06/1K tokens)
  const inputCost = (this.promptTokens / 1000) * 0.03;
  const outputCost = (this.completionTokens / 1000) * 0.06;
  return inputCost + outputCost;
});

// Virtual for prompt length
aiLogSchema.virtual('promptLength').get(function () {
  return this.prompt ? this.prompt.length : 0;
});

// Virtual for response length
aiLogSchema.virtual('responseLength').get(function () {
  return this.response ? this.response.length : 0;
});

// Static method to classify prompt type automatically
aiLogSchema.statics.classifyPromptType = function (prompt) {
  const lowerPrompt = prompt.toLowerCase().trim();

  if (lowerPrompt.includes('?')) {
    return 'question';
  }
  if (lowerPrompt.includes('hint') || lowerPrompt.includes('gợi ý')) {
    return 'hint';
  }
  if (
    lowerPrompt.includes('explain') ||
    lowerPrompt.includes('giải thích') ||
    lowerPrompt.includes('why')
  ) {
    return 'explanation';
  }
  if (
    lowerPrompt.includes('mean') ||
    lowerPrompt.includes('nghĩa') ||
    lowerPrompt.includes('clarify')
  ) {
    return 'clarification';
  }

  return 'other';
};

// Static method to find logs by submission
aiLogSchema.statics.findBySubmission = function (submissionId) {
  return this.find({ submissionId }).sort({ timestamp: 1 });
};

// Static method to find logs by student
aiLogSchema.statics.findByStudent = function (studentId, limit = null) {
  const query = this.find({ studentId }).sort({ timestamp: -1 });
  if (limit) {
    query.limit(limit);
  }
  return query;
};

// Static method to find logs by assignment
aiLogSchema.statics.findByAssignment = function (assignmentId) {
  return this.find({ assignmentId }).sort({ timestamp: -1 });
};

// Static method to calculate AI usage stats
aiLogSchema.statics.getUsageStats = async function (filter = {}) {
  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalInteractions: { $sum: 1 },
        totalPromptTokens: { $sum: '$promptTokens' },
        totalCompletionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
        avgResponseTime: { $avg: '$responseTime' },
        avgPromptLength: { $avg: { $strLenCP: '$prompt' } },
        avgResponseLength: { $avg: { $strLenCP: '$response' } },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : null;
};

// Static method to get prompt type distribution
aiLogSchema.statics.getPromptTypeDistribution = async function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$promptType',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Instance method to analyze prompt quality
aiLogSchema.methods.analyzeQuality = function () {
  let score = 0;

  // Factor 1: Prompt length (longer = more detailed, but not too long)
  const promptLen = this.prompt.length;
  if (promptLen >= 20 && promptLen <= 200) {
    score += 30;
  } else if (promptLen > 200) {
    score += 20;
  } else {
    score += 10;
  }

  // Factor 2: Context provided
  if (this.contextProvided) {
    score += 30;
  }

  // Factor 3: Question marks indicate specific questions
  if (this.prompt.includes('?')) {
    score += 20;
  }

  // Factor 4: Avoid one-word prompts
  const wordCount = this.prompt.split(/\s+/).length;
  if (wordCount >= 5) {
    score += 20;
  } else if (wordCount >= 3) {
    score += 10;
  }

  this.qualityScore = Math.min(100, score);
  return this.qualityScore;
};

const AI_Log = mongoose.model('AI_Log', aiLogSchema);

module.exports = AI_Log;
