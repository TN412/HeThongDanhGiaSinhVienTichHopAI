/**
 * Prompt Scoring Service (ML Pipeline Skeleton)
 *
 * CURRENT STATE: Heuristic-based scoring
 * FUTURE STATE: ML model trained on instructor-labeled dataset
 *
 * This service provides:
 * 1. Real-time prompt quality scoring (0-100)
 * 2. Actionable feedback suggestions for students
 * 3. Feature extraction for future ML model training
 */

/**
 * Heuristic-based prompt quality scoring
 * Returns score (0-100) and feedback suggestions
 *
 * @param {string} prompt - Student's prompt text
 * @param {object} context - Context information (questionId, questionText, previousPrompts, etc.)
 * @returns {object} { score: number, feedback: string[], features: object }
 */
function scorePromptHeuristic(prompt, context = {}) {
  let score = 0;
  const feedback = [];
  const features = extractFeatures(prompt, context);

  // ====== SCORING FACTORS (Heuristic Rules) ======

  // Factor 1: Length (20 points max)
  // Too short = vague, too long = unfocused
  const promptLen = prompt.trim().length;
  if (promptLen < 10) {
    score += 0;
    feedback.push('❌ Prompt quá ngắn. Hãy mô tả cụ thể vấn đề bạn gặp phải.');
  } else if (promptLen >= 20 && promptLen <= 200) {
    score += 20;
  } else if (promptLen > 200 && promptLen <= 500) {
    score += 15;
    feedback.push('⚠️ Prompt hơi dài. Hãy tập trung vào 1-2 khía cạnh chính.');
  } else if (promptLen > 500) {
    score += 10;
    feedback.push('⚠️ Prompt quá dài. AI có thể bị phân tâm. Hãy chia nhỏ câu hỏi.');
  } else {
    score += 5;
  }

  // Factor 2: Specificity (30 points max)
  // Check for specific details, question marks, technical terms
  const wordCount = prompt.split(/\s+/).length;
  const hasQuestionMark = /\?/.test(prompt);
  const hasTechnicalTerms =
    /\b(thuật toán|algorithm|function|class|variable|error|exception|syntax|logic|database|query|API|endpoint|authentication|authorization|validation|schema|model|controller|route|middleware)\b/i.test(
      prompt
    );
  const hasCodeContext = /`[^`]+`|```[\s\S]+```/.test(prompt);

  if (wordCount < 3) {
    score += 0;
    feedback.push('❌ Prompt quá chung chung. Hãy thêm chi tiết về vấn đề bạn cần giải quyết.');
  } else if (wordCount >= 5 && (hasQuestionMark || hasTechnicalTerms || hasCodeContext)) {
    score += 30;
  } else if (wordCount >= 5) {
    score += 20;
    if (!hasQuestionMark) {
      feedback.push('💡 Thêm dấu "?" để làm rõ câu hỏi của bạn.');
    }
  } else {
    score += 10;
    feedback.push('⚠️ Hãy cụ thể hơn về vấn đề. Ví dụ: "Làm thế nào để...?" hoặc "Tại sao...?"');
  }

  // Factor 3: Context provided (25 points max)
  if (context.hasQuestionContext) {
    score += 15;
  } else {
    feedback.push('💡 AI sẽ hiểu rõ hơn nếu bạn đề cập đến câu hỏi đang làm.');
  }

  if (context.hasPreviousAttempt) {
    score += 10;
    // Good: student tried first, then asked
  } else {
    feedback.push('💡 Hãy thử suy nghĩ trước, sau đó hỏi AI về phần bạn chưa hiểu.');
  }

  // Factor 4: Question quality (15 points max)
  if (hasQuestionMark) {
    if (/^(what|how|why|when|where|which|gì|làm sao|tại sao|khi nào)/i.test(prompt)) {
      score += 15; // Open-ended questions are good
    } else if (/^(is|are|can|could|should|có phải|có thể)/i.test(prompt)) {
      score += 10; // Yes/no questions are okay but less effective
      feedback.push('💡 Câu hỏi mở (How, Why, What) giúp bạn học sâu hơn câu hỏi đóng (Yes/No).');
    } else {
      score += 5;
    }
  }

  // Factor 5: Avoidance of common anti-patterns (10 points max)
  const hasAntiPattern = detectAntiPatterns(prompt);
  if (hasAntiPattern.length === 0) {
    score += 10;
  } else {
    score += 0;
    hasAntiPattern.forEach(pattern => feedback.push(pattern));
  }

  // ====== NORMALIZE SCORE ======
  score = Math.min(100, Math.max(0, score));

  // ====== POSITIVE FEEDBACK FOR HIGH SCORES ======
  if (score >= 80) {
    feedback.unshift('✅ Prompt chất lượng cao! Câu hỏi rõ ràng và có ngữ cảnh.');
  } else if (score >= 60) {
    feedback.unshift('✅ Prompt khá tốt. Một vài cải thiện nhỏ sẽ giúp AI hỗ trợ chính xác hơn.');
  }

  return {
    score: Math.round(score),
    feedback,
    features, // For ML training later
    level: getQualityLevel(score),
  };
}

/**
 * Extract features from prompt for ML model training
 * These features will be used to train a classifier later
 *
 * @param {string} prompt - Student's prompt
 * @param {object} context - Context information
 * @returns {object} Feature vector
 */
function extractFeatures(prompt, context = {}) {
  const trimmedPrompt = prompt.trim();
  const words = trimmedPrompt.split(/\s+/);
  const sentences = trimmedPrompt.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    // Length features
    charCount: trimmedPrompt.length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length || 0,

    // Structural features
    hasQuestionMark: /\?/.test(trimmedPrompt) ? 1 : 0,
    hasExclamation: /!/.test(trimmedPrompt) ? 1 : 0,
    hasCodeBlock: /```[\s\S]+```/.test(trimmedPrompt) ? 1 : 0,
    hasInlineCode: /`[^`]+`/.test(trimmedPrompt) ? 1 : 0,
    hasNumbering: /^\d+\./.test(trimmedPrompt) ? 1 : 0,

    // Question type features
    isOpenQuestion: /^(what|how|why|when|where|which|gì|làm sao|tại sao|khi nào)/i.test(
      trimmedPrompt
    )
      ? 1
      : 0,
    isClosedQuestion: /^(is|are|can|could|should|có phải|có thể)/i.test(trimmedPrompt) ? 1 : 0,
    isDirectRequest: /^(give|show|tell|explain|cho tôi|giải thích|hãy)/i.test(trimmedPrompt)
      ? 1
      : 0,

    // Semantic features
    hasTechnicalTerms:
      /\b(thuật toán|algorithm|function|class|variable|error|exception|syntax|logic|database|query|API|endpoint|authentication|authorization|validation|schema|model|controller|route|middleware)\b/i.test(
        trimmedPrompt
      )
        ? 1
        : 0,
    hasProblemDescription:
      /\b(problem|issue|error|bug|not working|doesn't work|vấn đề|lỗi|không hoạt động)\b/i.test(
        trimmedPrompt
      )
        ? 1
        : 0,
    hasAttemptDescription:
      /\b(tried|attempt|I think|my approach|tôi đã thử|tôi nghĩ|cách làm của tôi)\b/i.test(
        trimmedPrompt
      )
        ? 1
        : 0,

    // Context features
    hasQuestionContext: context.hasQuestionContext ? 1 : 0,
    hasPreviousAttempt: context.hasPreviousAttempt ? 1 : 0,
    previousPromptCount: context.previousPromptCount || 0,

    // Anti-pattern features
    isTooShort: trimmedPrompt.length < 10 ? 1 : 0,
    isTooLong: trimmedPrompt.length > 500 ? 1 : 0,
    isDirectAnswer: /^(answer|đáp án|câu trả lời|tell me the answer|cho tôi đáp án)/i.test(
      trimmedPrompt
    )
      ? 1
      : 0,
    isGreeting: /^(hello|hi|hey|xin chào|chào)/i.test(trimmedPrompt) ? 1 : 0,
  };
}

/**
 * Detect common anti-patterns in prompts
 *
 * @param {string} prompt - Student's prompt
 * @returns {string[]} Array of warning messages
 */
function detectAntiPatterns(prompt) {
  const warnings = [];
  const lowerPrompt = prompt.toLowerCase().trim();

  // Anti-pattern 1: Direct answer request
  if (
    /^(answer|đáp án|câu trả lời|tell me the answer|cho tôi đáp án|what is the answer)/i.test(
      prompt
    )
  ) {
    warnings.push('❌ Tránh hỏi trực tiếp đáp án. Hãy hỏi về cách tiếp cận hoặc khái niệm.');
  }

  // Anti-pattern 2: Greeting only
  if (/^(hello|hi|hey|xin chào|chào)$/i.test(prompt)) {
    warnings.push('❌ Đừng chỉ chào hỏi. Hãy nêu câu hỏi cụ thể ngay.');
  }

  // Anti-pattern 3: One-word prompt
  if (prompt.split(/\s+/).length === 1 && prompt.length < 15) {
    warnings.push('❌ Prompt 1 từ quá chung chung. Hãy đặt câu hỏi đầy đủ.');
  }

  // Anti-pattern 4: "Do it for me"
  if (
    /^(do it for me|làm giúp tôi|làm hộ|write code for|viết code cho|solve this|giải giúp)/i.test(
      prompt
    )
  ) {
    warnings.push('❌ Đừng yêu cầu AI làm thay bạn. Hãy hỏi gợi ý hoặc hướng giải quyết.');
  }

  // Anti-pattern 5: Too vague
  if (/^(help|help me|giúp tôi|I don\'t understand|tôi không hiểu)$/i.test(prompt)) {
    warnings.push('❌ "Giúp tôi" quá mơ hồ. Hãy nói cụ thể bạn không hiểu phần nào.');
  }

  // Anti-pattern 6: Asking for multiple unrelated things
  if ((prompt.match(/\?/g) || []).length >= 3) {
    warnings.push('⚠️ Quá nhiều câu hỏi cùng lúc. Hãy tách ra từng câu hỏi để AI trả lời tốt hơn.');
  }

  return warnings;
}

/**
 * Get quality level label from score
 *
 * @param {number} score - Prompt quality score (0-100)
 * @returns {string} Quality level
 */
function getQualityLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Analyze a batch of prompts for ML training
 * Used for CSV export and model training
 *
 * @param {Array} logs - Array of AI_Log documents
 * @returns {Array} Analyzed logs with features and heuristic scores
 */
function analyzeBatchForTraining(logs) {
  return logs.map(log => {
    const context = {
      hasQuestionContext: !!log.questionId,
      hasPreviousAttempt: false, // Would need to check previous logs
      previousPromptCount: 0, // Would need to count
    };

    const analysis = scorePromptHeuristic(log.prompt, context);

    return {
      logId: log._id,
      prompt: log.prompt,
      promptLength: log.prompt.length,
      response: log.response,
      studentId: log.studentId,
      assignmentId: log.assignmentId,
      submissionId: log.submissionId,
      questionId: log.questionId,
      timestamp: log.timestamp,

      // Heuristic analysis
      heuristicScore: analysis.score,
      qualityLevel: analysis.level,

      // Instructor label (if exists)
      instructorLabel: log.instructorLabel?.quality || null,
      labeledBy: log.instructorLabel?.labeledBy || null,
      labeledAt: log.instructorLabel?.labeledAt || null,

      // Features for ML
      features: analysis.features,

      // Performance metrics
      responseTime: log.responseTime,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      totalTokens: log.totalTokens,
    };
  });
}

/**
 * Generate CSV export for ML training
 *
 * @param {Array} analyzedLogs - Output from analyzeBatchForTraining
 * @returns {string} CSV content
 */
function generateTrainingCSV(analyzedLogs) {
  const headers = [
    'logId',
    'prompt',
    'promptLength',
    'heuristicScore',
    'qualityLevel',
    'instructorLabel',
    'labeledAt',
    // Feature columns
    'charCount',
    'wordCount',
    'sentenceCount',
    'hasQuestionMark',
    'hasCodeBlock',
    'isOpenQuestion',
    'isClosedQuestion',
    'hasTechnicalTerms',
    'hasProblemDescription',
    'hasAttemptDescription',
    'hasQuestionContext',
    'isTooShort',
    'isTooLong',
    'isDirectAnswer',
    // Outcome metrics
    'responseTime',
    'totalTokens',
  ];

  const rows = [headers.join(',')];

  analyzedLogs.forEach(log => {
    const row = [
      log.logId,
      `"${log.prompt.replace(/"/g, '""')}"`, // Escape quotes
      log.promptLength,
      log.heuristicScore,
      log.qualityLevel,
      log.instructorLabel || '',
      log.labeledAt ? new Date(log.labeledAt).toISOString() : '',
      // Features
      log.features.charCount,
      log.features.wordCount,
      log.features.sentenceCount,
      log.features.hasQuestionMark,
      log.features.hasCodeBlock,
      log.features.isOpenQuestion,
      log.features.isClosedQuestion,
      log.features.hasTechnicalTerms,
      log.features.hasProblemDescription,
      log.features.hasAttemptDescription,
      log.features.hasQuestionContext,
      log.features.isTooShort,
      log.features.isTooLong,
      log.features.isDirectAnswer,
      // Metrics
      log.responseTime,
      log.totalTokens,
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * TODO: Future ML model integration
 *
 * When you have enough labeled data (100+ samples):
 *
 * 1. Export training data: GET /api/logs/export-training-data
 * 2. Train model (Python scikit-learn or TensorFlow):
 *    - Features: extractFeatures output (24 features)
 *    - Target: instructorLabel.quality ('good' = 1, 'bad' = 0)
 *    - Algorithm: Random Forest, Logistic Regression, or Neural Net
 * 3. Save model weights and deploy as microservice or ONNX
 * 4. Replace scorePromptHeuristic with scorePromptML(features)
 * 5. Update feedback generation based on model confidence
 *
 * Example Python training script:
 *
 * ```python
 * import pandas as pd
 * from sklearn.ensemble import RandomForestClassifier
 * from sklearn.model_selection import train_test_split
 *
 * df = pd.read_csv('training_data.csv')
 * X = df[[feature columns]]
 * y = df['instructorLabel'].map({'good': 1, 'bad': 0})
 *
 * X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
 * model = RandomForestClassifier(n_estimators=100)
 * model.fit(X_train, y_train)
 *
 * accuracy = model.score(X_test, y_test)
 * print(f'Accuracy: {accuracy}')
 *
 * # Save model
 * import joblib
 * joblib.dump(model, 'prompt_quality_model.pkl')
 * ```
 */

module.exports = {
  scorePromptHeuristic,
  extractFeatures,
  detectAntiPatterns,
  getQualityLevel,
  analyzeBatchForTraining,
  generateTrainingCSV,
};
