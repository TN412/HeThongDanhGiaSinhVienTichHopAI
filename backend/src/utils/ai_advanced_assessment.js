/**
 * AI Advanced Assessment
 * Core module tích hợp tất cả tiêu chí đánh giá AI usage
 *
 * Features:
 * 1. AI Dependency Score (0-100)
 * 2. Risk Level (Low/Medium/High/Critical)
 * 3. Rubric 5 mức cho 3 tiêu chí (Prompt Engineering, Tự tư duy, Sáng tạo)
 * 4. WISDOM Mapping
 * 5. Timeline Analysis (phát hiện đỉnh bất thường)
 * 6. Top 5 Prompts (tốt nhất/tệ nhất)
 * 7. Cảnh báo & Khuyến nghị
 * 8. Log phân loại chi tiết
 */

const {
  classifyPromptType,
  assessPromptQuality,
  detectDependencyPatterns,
  calculateDiversificationScore,
  detectPromptMutations,
  analyzeRefinementDepth,
} = require('./prompt_classifier');

const { calculateWisdomScore } = require('./wisdom_mapper');

/**
 * Main function: Generate comprehensive AI assessment
 * @param {Array} logs - All AI interaction logs for a submission
 * @param {Object} submission - Submission object
 * @returns {Object} - Complete assessment report
 */
async function generateComprehensiveAssessment(logs, submission) {
  if (!logs || logs.length === 0) {
    return generateEmptyAssessment();
  }

  // 1. Basic statistics
  const basicStats = calculateBasicStats(logs);

  // 2. AI Dependency Score (0-100)
  const dependencyScore = calculateDependencyScore(logs);

  // 3. Risk Level
  const riskLevel = calculateRiskLevel(dependencyScore, logs);

  // 4. Rubric 5 mức cho 3 tiêu chí
  const rubricScores = calculateRubricScores(logs);
  console.log(`📊 [Assessment] Rubric Scores:`, {
    promptEngineering: rubricScores.promptEngineering.score,
    independence: rubricScores.independence.score,
    creativity: rubricScores.creativity.score,
  });

  // 5. WISDOM Mapping
  const wisdomScore = calculateWisdomScore(logs);
  console.log(`🧠 [Assessment] WISDOM Scores:`, {
    inquiry: wisdomScore.inquiry,
    disruptiveThinking: wisdomScore.disruptiveThinking,
    mindfulness: wisdomScore.mindfulness,
    overall: wisdomScore.overall,
  });

  // 6. Timeline Analysis
  const timeline = analyzeTimeline(logs);

  // 7. Top 5 Prompts
  const topPrompts = findTopPrompts(logs);

  // 8. Warnings & Recommendations
  const warningsAndRecommendations = generateWarningsAndRecommendations({
    dependencyScore,
    riskLevel,
    rubricScores,
    wisdomScore,
    timeline,
  });

  // 9. Classified logs
  const classifiedLogs = classifyAllLogs(logs);

  return {
    // Summary metrics
    summary: {
      totalPrompts: logs.length,
      dependencyScore,
      riskLevel,
      overallQuality: calculateOverallQuality(rubricScores, wisdomScore),
    },

    // Detailed scores
    dependencyAnalysis: {
      score: dependencyScore,
      independenceScore: 100 - dependencyScore, // Inverse for clarity
      level: riskLevel,
      patterns: detectDependencyPatterns(logs),
      explanation: `Điểm phụ thuộc ${dependencyScore}/100 (càng cao càng lệ thuộc). Độc lập = ${100 - dependencyScore}/100`,
    },

    rubricScores,
    wisdomScore,

    // Visualizations data
    timeline,
    topPrompts,

    // Recommendations
    warningsAndRecommendations,

    // Raw data
    classifiedLogs,
    basicStats,

    // Generated at
    generatedAt: new Date(),
  };
}

/**
 * 1. Calculate basic statistics
 */
function calculateBasicStats(logs) {
  const types = {};
  let totalTokens = 0;
  let totalResponseTime = 0;
  const uniquePrompts = new Set();

  logs.forEach(log => {
    const type = log.promptType || classifyPromptType(log.prompt);
    types[type] = (types[type] || 0) + 1;
    totalTokens += (log.promptTokens || 0) + (log.completionTokens || 0);
    totalResponseTime += log.responseTime || 0;
    uniquePrompts.add(log.prompt.toLowerCase().trim());
  });

  // Calculate working time (first to last prompt)
  const startTime = logs[0]?.timestamp ? new Date(logs[0].timestamp).getTime() : 0;
  const endTime = logs[logs.length - 1]?.timestamp
    ? new Date(logs[logs.length - 1].timestamp).getTime()
    : 0;
  const totalWorkingTime = endTime - startTime;

  // Count refinements (prompts that are modifications of previous ones)
  const refinementCount = logs.filter(log => log.mutationMetadata?.isRefinement).length;

  // Calculate diversification score
  const diversificationScore = Math.round((uniquePrompts.size / logs.length) * 100);

  return {
    totalPrompts: logs.length,
    uniquePrompts: uniquePrompts.size,
    totalLogs: logs.length,
    typeDistribution: types,
    totalTokens,
    avgTokensPerPrompt: Math.round(totalTokens / logs.length),
    avgResponseTime: Math.round(totalResponseTime / logs.length),
    totalWorkingTime, // in milliseconds
    refinementCount,
    diversificationScore,
    timeRange: {
      start: logs[0]?.timestamp,
      end: logs[logs.length - 1]?.timestamp,
      durationMinutes: Math.round(totalWorkingTime / 60000),
    },
  };
}

/**
 * 2. Calculate AI Dependency Score (0-100)
 *
 * Lower score = better (less dependent)
 * Higher score = worse (more dependent)
 */
function calculateDependencyScore(logs) {
  const patterns = detectDependencyPatterns(logs);
  const totalLogs = logs.length;

  // Factors (weights)
  const writeForMeRate = (patterns.writeForMeCount / totalLogs) * 30;
  const tooFastRate = (patterns.tooFastCount / totalLogs) * 25;
  const copyPasteRate = (patterns.copyPasteIndicators / totalLogs) * 20;
  const noInquiryRate = (patterns.lackOfInquiryCount / totalLogs) * 15;
  const noIterationRate = (patterns.noIterationCount / totalLogs) * 10;

  // Dependency score (0-100, higher = more dependent)
  let score = writeForMeRate + tooFastRate + copyPasteRate + noInquiryRate + noIterationRate;

  return Math.min(100, Math.round(score));
}

/**
 * 3. Calculate Risk Level based on dependency score
 * @returns {Object} - {level: string, color: string, description: string}
 */
function calculateRiskLevel(dependencyScore, logs) {
  const patterns = detectDependencyPatterns(logs);

  let level, color, description;

  if (dependencyScore >= 70) {
    level = 'Critical';
    color = '#dc2626'; // red-600
    description = '🚨 Lệ thuộc AI nghiêm trọng - Cần can thiệp ngay';
  } else if (dependencyScore >= 50) {
    level = 'High';
    color = '#f97316'; // orange-500
    description = '⚠️ Lệ thuộc AI cao - Cần cải thiện';
  } else if (dependencyScore >= 30) {
    level = 'Medium';
    color = '#eab308'; // yellow-500
    description = '⚡ Lệ thuộc AI trung bình - Có thể cải thiện';
  } else {
    level = 'Low';
    color = '#22c55e'; // green-500
    description = '✅ Sử dụng AI hợp lý';
  }

  // Additional flags
  const flags = [];
  if (patterns.writeForMeCount > logs.length * 0.3) {
    flags.push('Nhiều prompts "làm hộ"');
  }
  if (patterns.tooFastCount > logs.length * 0.4) {
    flags.push('Copy-paste quá nhanh');
  }
  if (patterns.lackOfInquiryCount > logs.length * 0.7) {
    flags.push('Không kiểm chứng thông tin');
  }

  return {
    level,
    color,
    description,
    flags,
  };
}

/**
 * 4. Calculate Rubric Scores (5-level) cho 3 tiêu chí
 * Use pre-classified quality scores from AI_Log
 */
function calculateRubricScores(logs) {
  // 4.1 Prompt Engineering Score (1-5) - Use pre-classified scores
  const promptScores = logs.map(log => {
    if (log.advancedQualityAssessment) {
      return {
        score: log.advancedQualityAssessment.score,
        level: log.advancedQualityAssessment.level,
        factors: log.advancedQualityAssessment.factors,
      };
    }
    // Fallback to real-time assessment
    return assessPromptQuality(log.prompt, {
      questionText: log.questionText,
      hasContext: log.contextProvided,
      hasIteration: log.mutationMetadata?.isRefinement || false,
    });
  });

  const avgPromptScore = promptScores.reduce((sum, p) => sum + p.score, 0) / logs.length;

  // 4.2 Tự tư duy vs. Lệ thuộc (1-5)
  const independenceScore = calculateIndependenceScore(logs);

  // 4.3 Sáng tạo (Disruptive Thinking) (1-5)
  const creativityScore = calculateCreativityScore(logs);

  return {
    promptEngineering: {
      score: Math.round(avgPromptScore * 10) / 10, // Keep 1 decimal
      label: getLevelLabel(Math.round(avgPromptScore)),
      details: analyzePromptEngineering(promptScores),
    },
    independence: {
      score: Math.round(independenceScore * 10) / 10,
      label: getLevelLabel(Math.round(independenceScore)),
      details: analyzeIndependence(logs),
    },
    creativity: {
      score: Math.round(creativityScore * 10) / 10,
      label: getLevelLabel(Math.round(creativityScore)),
      details: analyzeCreativity(logs),
    },
  };
}

function getLevelLabel(score) {
  if (score === 5) return 'Xuất sắc';
  if (score === 4) return 'Tốt';
  if (score === 3) return 'Đạt';
  if (score === 2) return 'Yếu';
  return 'Kém';
}

/**
 * Calculate Independence Score (1-5)
 * 5 = Tự phân tích trước khi hỏi, phản biện kết quả AI
 * 1 = AI làm gần như toàn bộ
 */
function calculateIndependenceScore(logs) {
  const patterns = detectDependencyPatterns(logs);
  const totalLogs = logs.length;

  // Calculate metrics
  const writeForMeRate = patterns.writeForMeCount / totalLogs;
  const inquiryRate = 1 - patterns.lackOfInquiryCount / totalLogs;
  const iterationRate = 1 - patterns.noIterationCount / totalLogs;

  // Score calculation (inverse of dependency)
  let score = 5;
  score -= writeForMeRate * 3; // Heavy penalty for "làm hộ"
  score -= (1 - inquiryRate) * 1.5;
  score -= (1 - iterationRate) * 0.5;

  return Math.max(1, Math.min(5, Math.round(score)));
}

/**
 * Calculate Creativity Score (1-5)
 * 5 = Sử dụng thử nghiệm nhiều loại prompt, có cải tiến liên tục
 * 1 = Chỉ hỏi những câu tối thiểu
 */
function calculateCreativityScore(logs) {
  const diversification = calculateDiversificationScore(logs);
  const mutations = detectPromptMutations(logs);
  const refinement = analyzeRefinementDepth(mutations);

  // Score based on:
  // - Diversification (0-100)
  // - Mutation count
  // - Refinement quality
  let score = 1;

  if (diversification >= 70) score += 1.5;
  else if (diversification >= 50) score += 1;
  else if (diversification >= 30) score += 0.5;

  if (mutations.count >= 5) score += 1.5;
  else if (mutations.count >= 3) score += 1;
  else if (mutations.count >= 1) score += 0.5;

  if (refinement.quality === 'deep') score += 1;
  else if (refinement.quality === 'moderate') score += 0.5;

  return Math.max(1, Math.min(5, Math.round(score)));
}

function analyzePromptEngineering(promptScores) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  promptScores.forEach(p => distribution[p.score]++);

  return {
    distribution,
    avgScore: (promptScores.reduce((sum, p) => sum + p.score, 0) / promptScores.length).toFixed(2),
    excellentRate: Math.round((distribution[5] / promptScores.length) * 100) + '%',
    poorRate: Math.round(((distribution[1] + distribution[2]) / promptScores.length) * 100) + '%',
  };
}

function analyzeIndependence(logs) {
  const patterns = detectDependencyPatterns(logs);
  return {
    writeForMeRate: Math.round((patterns.writeForMeCount / logs.length) * 100) + '%',
    inquiryRate: Math.round((1 - patterns.lackOfInquiryCount / logs.length) * 100) + '%',
    iterationRate: Math.round((1 - patterns.noIterationCount / logs.length) * 100) + '%',
  };
}

function analyzeCreativity(logs) {
  const diversification = calculateDiversificationScore(logs);
  const mutations = detectPromptMutations(logs);

  return {
    diversificationScore: diversification + '%',
    mutationCount: mutations.count,
    refinementRate: Math.round(mutations.refinementRate * 100) + '%',
  };
}

/**
 * 6. Analyze Timeline (phát hiện đỉnh bất thường)
 */
function analyzeTimeline(logs) {
  if (logs.length === 0) return { segments: [], anomalies: [] };

  // Group by time segments (30-minute intervals)
  const segments = [];
  const segmentSize = 30 * 60 * 1000; // 30 minutes in ms

  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const firstTime = new Date(sortedLogs[0].timestamp).getTime();
  const lastTime = new Date(sortedLogs[sortedLogs.length - 1].timestamp).getTime();

  for (let time = firstTime; time <= lastTime; time += segmentSize) {
    const segmentLogs = sortedLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= time && logTime < time + segmentSize;
    });

    if (segmentLogs.length > 0) {
      segments.push({
        startTime: new Date(time),
        endTime: new Date(time + segmentSize),
        count: segmentLogs.length,
        types: segmentLogs.reduce((acc, log) => {
          const type = classifyPromptType(log.prompt);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
      });
    }
  }

  // Detect anomalies (đỉnh bất thường)
  const avgCount = segments.reduce((sum, s) => sum + s.count, 0) / segments.length;
  const anomalies = segments
    .filter(s => s.count > avgCount * 2) // Đỉnh > 2x trung bình
    .map(s => ({
      ...s,
      severity: s.count > avgCount * 3 ? 'high' : 'medium',
      description: `🚨 ${s.count} prompts trong 30 phút (trung bình: ${Math.round(avgCount)})`,
    }));

  return {
    segments,
    anomalies,
    avgPromptsPerSegment: Math.round(avgCount * 10) / 10,
  };
}

/**
 * 7. Find Top 5 Prompts (best & worst)
 * Use pre-classified quality scores from AI_Log
 */
function findTopPrompts(logs) {
  const scoredPrompts = logs.map(log => {
    // Use advancedQualityAssessment if available (from AI_Log.createWithClassification)
    const qualityAssessment = log.advancedQualityAssessment
      ? {
          score: log.advancedQualityAssessment.score,
          level: log.advancedQualityAssessment.level,
          factors: log.advancedQualityAssessment.factors,
          details: log.advancedQualityAssessment.details,
        }
      : assessPromptQuality(log.prompt, {
          questionText: log.questionText,
          hasContext: log.contextProvided,
        });

    return {
      ...log,
      qualityAssessment,
    };
  });

  // Sort by score
  const sorted = [...scoredPrompts].sort(
    (a, b) => b.qualityAssessment.score - a.qualityAssessment.score
  );

  return {
    best: sorted.slice(0, 5).map(p => ({
      prompt: p.prompt,
      score: p.qualityAssessment.score,
      level: p.qualityAssessment.level,
      factors: p.qualityAssessment.factors,
      timestamp: p.timestamp,
      promptType: p.promptType,
    })),
    worst: sorted
      .slice(-5)
      .reverse()
      .map(p => ({
        prompt: p.prompt,
        score: p.qualityAssessment.score,
        level: p.qualityAssessment.level,
        factors: p.qualityAssessment.factors,
        timestamp: p.timestamp,
        promptType: p.promptType,
      })),
  };
}

/**
 * 8. Generate Warnings & Recommendations
 */
function generateWarningsAndRecommendations(data) {
  const warnings = [];
  const recommendations = [];

  // Dependency warnings
  if (data.riskLevel.level === 'Critical' || data.riskLevel.level === 'High') {
    warnings.push({
      type: 'dependency',
      severity: data.riskLevel.level.toLowerCase(),
      title: '🚨 Lệ thuộc AI quá mức',
      description: data.riskLevel.description,
    });

    recommendations.push({
      category: 'Giảm lệ thuộc AI',
      suggestions: [
        'Tự phân tích vấn đề trước khi hỏi AI',
        'Chỉ sử dụng AI để HỌI, không để "LÀM HỘ"',
        'Kiểm chứng lại kết quả AI trả về',
        'Tự viết code trước, sau đó mới hỏi AI review',
      ],
    });
  }

  // Prompt quality warnings
  if (data.rubricScores.promptEngineering.score <= 2) {
    warnings.push({
      type: 'prompt_quality',
      severity: 'medium',
      title: '⚠️ Chất lượng prompt thấp',
      description: 'Prompts chung chung, thiếu context và ràng buộc',
    });

    recommendations.push({
      category: 'Cải thiện Prompt Engineering',
      suggestions: [
        'Nêu rõ mục tiêu và context',
        'Thêm ràng buộc cụ thể (phải/không được/yêu cầu)',
        'Cung cấp ví dụ hoặc code snippet',
        'Cải tiến prompt nếu kết quả không tốt',
      ],
    });
  }

  // Creativity warnings
  if (data.rubricScores.creativity.score <= 2) {
    warnings.push({
      type: 'creativity',
      severity: 'low',
      title: '💡 Thiếu sáng tạo',
      description: 'Prompts đơn điệu, ít đa dạng',
    });

    recommendations.push({
      category: 'Tăng tính sáng tạo',
      suggestions: [
        'Thử nghiệm nhiều cách hỏi khác nhau',
        'Chuyển đổi góc nhìn (user, developer, tester...)',
        'Đặt câu hỏi "what if" để khám phá',
        'Kết hợp nhiều loại prompt',
      ],
    });
  }

  // Timeline anomalies
  if (data.timeline.anomalies.length > 0) {
    warnings.push({
      type: 'timeline',
      severity: 'medium',
      title: '📊 Phát hiện đỉnh bất thường',
      description: `Có ${data.timeline.anomalies.length} khoảng thời gian sử dụng AI quá nhiều`,
      anomalies: data.timeline.anomalies,
    });

    recommendations.push({
      category: 'Phân bổ thời gian',
      suggestions: [
        'Đừng tập trung hỏi AI quá nhiều trong thời gian ngắn',
        'Dành thời gian suy nghĩ giữa các lần hỏi',
        'Thử tự giải quyết trước khi hỏi tiếp',
      ],
    });
  }

  // WISDOM-based recommendations
  if (data.wisdomScore.inquiry < 6) {
    recommendations.push({
      category: 'Cải thiện Inquiry',
      suggestions:
        data.wisdomScore.interpretation.recommendations.find(r => r.category === 'Inquiry')
          ?.suggestions || [],
    });
  }

  if (data.wisdomScore.mindfulness < 6) {
    recommendations.push({
      category: 'Cải thiện Mindfulness',
      suggestions:
        data.wisdomScore.interpretation.recommendations.find(r => r.category === 'Mindfulness')
          ?.suggestions || [],
    });
  }

  // Common thinking errors
  const thinkingErrors = detectCommonThinkingErrors(data);

  return {
    warnings,
    recommendations,
    thinkingErrors,
  };
}

/**
 * Detect common thinking errors
 */
function detectCommonThinkingErrors(data) {
  const errors = [];

  // Error 1: Copy-paste mentality
  if (data.dependencyScore > 60) {
    errors.push({
      error: 'Copy-Paste Mentality',
      description: 'Có xu hướng copy-paste AI output mà không suy nghĩ',
      impact: 'Không học được gì, chỉ phụ thuộc vào AI',
    });
  }

  // Error 2: No verification
  if (data.wisdomScore.inquiry < 5) {
    errors.push({
      error: 'Lack of Verification',
      description: 'Chấp nhận AI output mà không kiểm chứng',
      impact: 'Có thể dẫn đến lỗi nghiêm trọng',
    });
  }

  // Error 3: Single-path thinking
  if (data.rubricScores.creativity.score <= 2) {
    errors.push({
      error: 'Single-Path Thinking',
      description: 'Chỉ suy nghĩ theo một hướng, không khám phá alternatives',
      impact: 'Bỏ lỡ giải pháp tốt hơn',
    });
  }

  return errors;
}

/**
 * 9. Classify all logs with details
 */
function classifyAllLogs(logs) {
  return logs.map(log => ({
    ...log,
    classification: {
      type: classifyPromptType(log.prompt),
      quality: assessPromptQuality(log.prompt),
    },
  }));
}

/**
 * Calculate overall quality score
 */
function calculateOverallQuality(rubricScores, wisdomScore) {
  const avgRubric =
    (rubricScores.promptEngineering.score +
      rubricScores.independence.score +
      rubricScores.creativity.score) /
    3;

  const avgWisdom = wisdomScore.overall;

  // Combine (60% rubric + 40% wisdom)
  const overall = (avgRubric / 5) * 60 + (avgWisdom / 10) * 40;

  return Math.round(overall);
}

/**
 * Generate empty assessment for no logs
 */
function generateEmptyAssessment() {
  return {
    summary: {
      totalPrompts: 0,
      dependencyScore: 0,
      riskLevel: { level: 'N/A', description: 'Không có dữ liệu' },
      overallQuality: 0,
    },
    message: 'Sinh viên chưa sử dụng AI',
  };
}

module.exports = {
  generateComprehensiveAssessment,
  calculateDependencyScore,
  calculateRiskLevel,
};
