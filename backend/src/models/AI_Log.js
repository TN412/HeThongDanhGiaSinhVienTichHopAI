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
    questionText: {
      type: String,
      required: false, // Original question text for copy-paste detection
      trim: true,
      maxlength: [2000, 'Question text cannot exceed 2000 characters'],
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
    // 🆕 ADVANCED CLASSIFICATION
    promptType: {
      type: String,
      enum: {
        values: [
          'clarifying',
          'expanding',
          'debugging',
          'code_generation',
          'design_support',
          'theoretical_explanation',
          'general',
          // Legacy support
          'question',
          'clarification',
          'hint',
          'explanation',
          'other',
        ],
        message: '{VALUE} is not a valid prompt type',
      },
      required: [true, 'Prompt type is required'],
      default: 'general',
    },
    contextProvided: {
      type: Boolean,
      default: false,
      required: true,
    },
    // 🆕 ADVANCED QUALITY ASSESSMENT
    advancedQualityAssessment: {
      score: {
        type: Number,
        min: 1,
        max: 5,
        default: null, // Will be computed by prompt_classifier
      },
      level: {
        type: String,
        enum: ['Xuất sắc', 'Tốt', 'Đạt', 'Yếu', 'Kém', null],
        default: null,
      },
      factors: {
        hasGoal: { type: Boolean, default: false },
        hasConstraints: { type: Boolean, default: false },
        hasContext: { type: Boolean, default: false },
        hasIteration: { type: Boolean, default: false },
        showsThinking: { type: Boolean, default: false },
        isSpecific: { type: Boolean, default: false },
      },
      details: {
        type: String,
        default: null,
      },
    },
    // 🆕 WORKFLOW STAGE (for project-based assignments)
    workflowStage: {
      type: String,
      enum: [
        'requirements_analysis',
        'system_design',
        'implementation',
        'algorithm_optimization',
        'documentation_research',
        'reflection',
        'general',
      ],
      default: 'general',
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
    // 🆕 MUTATION TRACKING (for iteration detection)
    mutationMetadata: {
      isRefinement: { type: Boolean, default: false },
      isDuplicate: { type: Boolean, default: false },
      previousPromptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AI_Log',
        default: null,
      },
      similarity: { type: Number, default: null }, // 0-1
      mutationType: {
        type: String,
        enum: ['expansion', 'clarification', 'constraint_addition', 'refinement', null],
        default: null,
      },
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

// Indexes for advanced assessment features
aiLogSchema.index({ workflowStage: 1 });
aiLogSchema.index({ 'advancedQualityAssessment.level': 1 });
aiLogSchema.index({ 'mutationMetadata.isRefinement': 1 });
aiLogSchema.index({ 'mutationMetadata.previousPromptId': 1 });

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

// Import prompt classifier for advanced analysis
const promptClassifier = require('../utils/prompt_classifier');

// Static method to classify prompt type automatically (legacy - kept for backward compatibility)
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

// Static method to create and save log with advanced classification
aiLogSchema.statics.createWithClassification = async function (logData) {
  try {
    // Classify prompt type using advanced classifier
    const classifiedType = promptClassifier.classifyPromptType(logData.prompt);

    // Check for copy-paste pattern by analyzing previous logs
    let isCopyPastePattern = false;
    if (logData.submissionId) {
      const recentLogs = await this.find({
        submissionId: logData.submissionId,
        _id: { $ne: logData._id },
      })
        .sort({ timestamp: -1 })
        .limit(3)
        .select('prompt');

      // Detect if current and previous prompts are all long and similar length (copy-paste pattern)
      if (recentLogs.length >= 2) {
        const currentLength = logData.prompt.length;
        const lengths = recentLogs.map(log => log.prompt.length);
        const allLong = currentLength > 100 && lengths.every(len => len > 100);
        const similarLengths = lengths.every(len => Math.abs(len - currentLength) < 50);
        isCopyPastePattern = allLong && similarLengths;
      }
    }

    // Assess prompt quality (include questionText for similarity detection)
    const qualityAssessment = promptClassifier.assessPromptQuality(logData.prompt, {
      hasContext: logData.contextProvided || false,
      hasIteration: false, // Will be updated by mutation detection
      isCopyPastePattern: isCopyPastePattern,
      questionText: logData.questionText, // CRITICAL: Compare with original question
    });

    // Check for mutations (refinements of previous prompts)
    let mutationData = {
      isRefinement: false,
      isDuplicate: false,
      previousPromptId: null,
      similarity: null,
      mutationType: null,
    };

    if (logData.submissionId) {
      // Find previous logs from same submission
      const previousLogs = await this.find({
        submissionId: logData.submissionId,
        questionId: logData.questionId,
        _id: { $ne: logData._id },
      })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('prompt _id');

      if (previousLogs.length > 0) {
        // Detect mutations
        const mutations = promptClassifier.detectPromptMutations(
          logData.prompt,
          previousLogs.map(log => ({ id: log._id.toString(), prompt: log.prompt }))
        );

        if (mutations.length > 0) {
          const latestMutation = mutations[0];
          mutationData = {
            isRefinement: latestMutation.mutationType !== 'duplicate',
            isDuplicate: latestMutation.mutationType === 'duplicate',
            previousPromptId: latestMutation.previousId,
            similarity: latestMutation.similarity,
            mutationType: latestMutation.mutationType,
          };

          // Update quality assessment to include iteration
          if (mutationData.isRefinement) {
            qualityAssessment.factors.hasIteration = true;
            qualityAssessment.score = Math.min(5, qualityAssessment.score + 0.5); // Bonus for iteration
          }
        }
      }
    }

    // Create log with enhanced fields
    const log = new this({
      ...logData,
      promptType: classifiedType,
      advancedQualityAssessment: {
        score: qualityAssessment.score,
        level: qualityAssessment.level,
        factors: qualityAssessment.factors,
        details: qualityAssessment.details,
      },
      mutationMetadata: mutationData,
      // Keep legacy qualityScore for backward compatibility
      qualityScore: qualityAssessment.score * 20, // Convert 1-5 to 0-100
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating log with classification:', error);
    // Fallback to basic save if classification fails
    const log = new this(logData);
    await log.save();
    return log;
  }
};

// Static method to get assessment data for a submission
aiLogSchema.statics.getAssessmentData = async function (submissionId) {
  try {
    const logs = await this.find({ submissionId }).sort({ timestamp: 1 }).lean();

    if (!logs || logs.length === 0) {
      return null;
    }

    // Return structured data for assessment
    return {
      logs,
      totalCount: logs.length,
      timeRange: {
        start: logs[0].timestamp,
        end: logs[logs.length - 1].timestamp,
      },
      promptTypes: logs.map(log => log.promptType),
      qualityScores: logs.map(log => log.advancedQualityAssessment?.score || 0),
      workflowStages: logs.map(log => log.workflowStage),
      refinements: logs.filter(log => log.mutationMetadata?.isRefinement).length,
      duplicates: logs.filter(log => log.mutationMetadata?.isDuplicate).length,
      avgTokens: logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0) / logs.length,
      avgResponseTime: logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logs.length,
    };
  } catch (error) {
    console.error('Error getting assessment data:', error);
    return null;
  }
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
