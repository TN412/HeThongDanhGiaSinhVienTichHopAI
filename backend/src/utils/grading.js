/**
 * Grading Utility - AI Skill Score Calculation
 * Đánh giá cách sinh viên HỎI (prompt quality), KHÔNG đánh giá nội dung trả lời AI
 */

/**
 * Calculate AI Skill Score
 * Chỉ đánh giá prompt của sinh viên, không đánh giá response của AI
 *
 * @param {Array} logs - AI_Log documents
 * @param {Object} submission - AssignmentSubmission document
 * @returns {number} AI Skill Score (0-100)
 */
function calculateAISkillScore(logs, submission) {
  // No AI usage = perfect independence
  if (!logs || logs.length === 0) {
    return 100;
  }

  // Filter out trivial prompts (< 8 chars)
  const validLogs = logs.filter(log => log.prompt && log.prompt.trim().length >= 8);

  if (validLogs.length === 0) {
    return 100; // All prompts were trivial
  }

  // Factor 1: Prompt Quality (40%)
  const promptQuality = calculatePromptQuality(validLogs);

  // Factor 2: Independence (30%)
  const independence = calculateIndependence(validLogs, submission);

  // Factor 3: Iteration Efficiency (20%)
  const iterationEfficiency = calculateIterationEfficiency(validLogs);

  // Factor 4: Ethics/Policy (10%)
  const ethics = calculateEthicsScore(validLogs);

  // Weighted score
  const score = promptQuality * 0.4 + independence * 0.3 + iterationEfficiency * 0.2 + ethics * 0.1;

  return Math.round(score);
}

/**
 * Prompt Quality (40%)
 * Đánh giá chất lượng prompt: độ dài, có dấu hỏi, có context
 */
function calculatePromptQuality(logs) {
  let totalScore = 0;

  logs.forEach(log => {
    const prompt = log.prompt.trim();
    let score = 0;

    // Length score (normalize 30-200 chars as optimal)
    const len = prompt.length;
    let lengthScore;
    if (len >= 30 && len <= 200) {
      lengthScore = 1.0; // Optimal
    } else if (len < 30) {
      lengthScore = len / 30; // Too short
    } else {
      // Too long (> 200)
      lengthScore = Math.max(0.5, 1.0 - (len - 200) / 300);
    }
    score += lengthScore * 50; // 50 points max for length

    // Question mark score (has '?')
    if (prompt.includes('?')) {
      score += 25; // 25 points for having question mark
    }

    // Context provided score
    if (log.contextProvided) {
      score += 25; // 25 points for providing context
    }

    totalScore += Math.min(100, score);
  });

  return totalScore / logs.length;
}

/**
 * Independence (30%)
 * Ít prompts/câu hỏi = độc lập cao
 */
function calculateIndependence(logs, submission) {
  const questionCount = submission.answers?.length || 1;
  const promptsPerQuestion = logs.length / questionCount;

  // Scoring scale
  if (promptsPerQuestion <= 0.5) return 100; // Very independent
  if (promptsPerQuestion <= 1.0) return 90; // Good
  if (promptsPerQuestion <= 2.0) return 70; // Moderate
  if (promptsPerQuestion <= 3.0) return 50; // Dependent

  // > 3 prompts/question = heavily dependent
  return Math.max(0, 50 - (promptsPerQuestion - 3) * 10);
}

/**
 * Iteration Efficiency (20%)
 * Unique prompts / total prompts (tránh lặp lại)
 */
function calculateIterationEfficiency(logs) {
  const uniquePrompts = new Set();

  logs.forEach(log => {
    const normalized = log.prompt.toLowerCase().trim();
    uniquePrompts.add(normalized);
  });

  const uniqueRate = uniquePrompts.size / logs.length;
  return uniqueRate * 100;
}

/**
 * Ethics/Policy Score (10%)
 * Phát hiện prompt yêu cầu đáp án trực tiếp
 */
function calculateEthicsScore(logs) {
  const bannedPatterns = [
    'đáp án',
    'answer',
    'give me the answer',
    'chọn đáp án',
    'what is the answer',
    'tell me the answer',
    'câu trả lời là gì',
    'cho tôi đáp án',
    'đáp án nào đúng',
    'which answer is correct',
  ];

  let violationCount = 0;

  logs.forEach(log => {
    const promptLower = log.prompt.toLowerCase();

    for (const pattern of bannedPatterns) {
      if (promptLower.includes(pattern)) {
        violationCount++;
        break; // Count once per prompt
      }
    }
  });

  if (violationCount === 0) return 100;

  // Penalize: each violation reduces score
  const violationRate = violationCount / logs.length;

  if (violationRate >= 0.5) return 60; // Half or more violations
  if (violationRate >= 0.3) return 70; // 30%+ violations
  if (violationRate >= 0.1) return 85; // 10%+ violations

  return 95; // Few violations
}

/**
 * Calculate AI Interaction Summary
 * Metadata for dashboard display
 */
function calculateInteractionSummary(logs, submission) {
  if (!logs || logs.length === 0) {
    return {
      totalPrompts: 0,
      uniquePromptRate: 0,
      independenceLevel: 1.0,
      promptQualityBand: 'N/A',
      avgPromptLength: 0,
    };
  }

  // Filter valid prompts
  const validLogs = logs.filter(log => log.prompt && log.prompt.trim().length >= 8);

  if (validLogs.length === 0) {
    return {
      totalPrompts: logs.length,
      uniquePromptRate: 0,
      independenceLevel: 1.0,
      promptQualityBand: 'low',
      avgPromptLength: 0,
    };
  }

  // Unique prompts
  const uniquePrompts = new Set(validLogs.map(l => l.prompt.toLowerCase().trim()));
  const uniquePromptRate = uniquePrompts.size / validLogs.length;

  // Independence level (1 - prompts per question / 3, clamped 0-1)
  const questionCount = submission.answers?.length || 1;
  const promptsPerQuestion = validLogs.length / questionCount;
  const independenceLevel = Math.max(0, Math.min(1, 1 - promptsPerQuestion / 3));

  // Prompt quality band
  const avgPromptLength = validLogs.reduce((sum, l) => sum + l.prompt.length, 0) / validLogs.length;
  let promptQualityBand;
  if (avgPromptLength >= 50 && uniquePromptRate >= 0.7) {
    promptQualityBand = 'high';
  } else if (avgPromptLength >= 25 && uniquePromptRate >= 0.4) {
    promptQualityBand = 'medium';
  } else {
    promptQualityBand = 'low';
  }

  return {
    totalPrompts: validLogs.length,
    uniquePromptRate: Math.round(uniquePromptRate * 100) / 100,
    independenceLevel: Math.round(independenceLevel * 100) / 100,
    promptQualityBand,
    avgPromptLength: Math.round(avgPromptLength),
  };
}

/**
 * Generate Auto Feedback
 * Feedback dựa trên điểm số và AI usage
 */
function generateAutoFeedback(submission, logs, assignment, totalPossiblePoints) {
  let feedback = [];

  // Content score feedback (convert to percentage for comparison)
  const contentPercentage = (submission.totalScore / totalPossiblePoints) * 100;
  if (contentPercentage >= 90) {
    feedback.push('✅ Xuất sắc! Bạn đã nắm vững nội dung bài học.');
  } else if (contentPercentage >= 70) {
    feedback.push('👍 Tốt! Bạn đã hiểu phần lớn nội dung.');
  } else if (contentPercentage >= 50) {
    feedback.push('📖 Khá! Nhưng bạn cần ôn lại một số khái niệm.');
  } else {
    feedback.push('📚 Bạn cần học kỹ hơn. Hãy xem lại tài liệu.');
  }

  // AI skill feedback (aiSkillScore is stored as 0-100, displayed as /10)
  if (!logs || logs.length === 0) {
    feedback.push('🌟 AI Skill Score: 10/10 - Bạn hoàn toàn độc lập!');
  } else {
    const aiSkillScore = submission.aiSkillScore || 0;

    if (aiSkillScore >= 80) {
      feedback.push('🌟 AI Skill Score: Xuất sắc! Bạn sử dụng AI rất hiệu quả.');
    } else if (aiSkillScore >= 60) {
      feedback.push('💡 AI Skill Score: Tốt! Hãy cố gắng đặt câu hỏi cụ thể hơn cho AI.');
    } else if (aiSkillScore >= 40) {
      feedback.push('⚠️ AI Skill Score: Trung bình. Hãy học cách sử dụng AI hiệu quả hơn.');
      feedback.push('Mẹo: Hỏi "Giải thích khái niệm X" thay vì "Đáp án là gì?"');
    } else {
      feedback.push('❌ AI Skill Score: Cần cải thiện. Bạn phụ thuộc quá nhiều vào AI.');
      feedback.push('Hãy thử tự suy nghĩ trước, sau đó dùng AI để kiểm tra ý tưởng.');
    }

    // Specific feedback
    const summary = submission.aiInteractionSummary;
    if (summary) {
      if (summary.avgPromptLength < 20) {
        feedback.push('💬 Gợi ý: Prompt của bạn quá ngắn. Hãy mô tả rõ hơn những gì bạn cần.');
      }

      if (summary.independenceLevel < 0.5) {
        feedback.push('🔁 Bạn hỏi AI quá nhiều. Hãy thử tự giải quyết trước.');
      }

      if (summary.uniquePromptRate < 0.5) {
        feedback.push('🔄 Bạn đang lặp lại câu hỏi tương tự. Hãy thử cách tiếp cận khác.');
      }
    }
  }

  return feedback.join('\n');
}

module.exports = {
  calculateAISkillScore,
  calculateInteractionSummary,
  generateAutoFeedback,
};
