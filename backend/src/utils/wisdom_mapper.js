/**
 * WISDOM Mapper
 * Đo 3 yếu tố: Inquiry, Disruptive Thinking, Mindfulness
 *
 * WISDOM Framework:
 * - Inquiry: Phân tích, kiểm chứng, phản biện
 * - Disruptive Thinking: Sáng tạo, thử nghiệm, đổi mới
 * - Mindfulness: Đạo đức, minh bạch, trách nhiệm
 */

const { classifyPromptType } = require('./prompt_classifier');

/**
 * Calculate overall WISDOM Score
 * @param {Array} logs - AI interaction logs
 * @returns {Object} - {inquiry, disruptiveThinking, mindfulness, overall, details, interpretation}
 */
function calculateWisdomScore(logs) {
  if (!logs || logs.length === 0) {
    return {
      inquiry: 0,
      disruptiveThinking: 0,
      mindfulness: 0,
      overall: 0,
      details: {},
      interpretation: 'Chưa có dữ liệu để đánh giá',
    };
  }

  const inquiry = calculateInquiryScore(logs);
  const disruptiveThinking = calculateDisruptiveThinkingScore(logs);
  const mindfulness = calculateMindfulnessScore(logs);

  const overall =
    Math.round(((inquiry.score + disruptiveThinking.score + mindfulness.score) / 3) * 10) / 10;

  const interpretation = generateWisdomInterpretation({
    inquiry: inquiry.score,
    disruptiveThinking: disruptiveThinking.score,
    mindfulness: mindfulness.score,
    overall,
  });

  return {
    inquiry: inquiry.score,
    disruptiveThinking: disruptiveThinking.score,
    mindfulness: mindfulness.score,
    overall,
    details: {
      inquiry: inquiry.details,
      disruptiveThinking: disruptiveThinking.details,
      mindfulness: mindfulness.details,
    },
    interpretation,
  };
}

/**
 * 1. INQUIRY Score (Phân tích - Kiểm chứng)
 *
 * Criteria:
 * - Hỏi lại AI (follow-up questions)
 * - Kiểm chứng sai (verification)
 * - So sánh phương án (comparison)
 * - Tư duy phản biện (critical thinking)
 *
 * @param {Array} logs
 * @returns {Object} - {score: 0-10, details}
 */
function calculateInquiryScore(logs) {
  const metrics = {
    followUpQuestions: 0, // Hỏi lại AI
    verificationAttempts: 0, // Kiểm chứng
    comparisonQuestions: 0, // So sánh phương án
    criticalThinking: 0, // Tư duy phản biện
  };

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const prompt = log.prompt.toLowerCase();

    // 1. Follow-up questions (reference to previous answers)
    if (i > 0) {
      const hasReference =
        /nhưng|but|however|còn|what about|thế còn|nếu|if that/i.test(prompt) ||
        /bạn vừa nói|you said|you mentioned|như bạn đã|as you/i.test(prompt) ||
        /câu trả lời|answer|response|kết quả|result.*trước|previous/i.test(prompt);

      if (hasReference) {
        metrics.followUpQuestions++;
      }
    }

    // 2. Verification attempts
    if (
      /có đúng|is.*correct|chắc chắn|sure|verify|kiểm tra|check|double check|có chắc/i.test(prompt)
    ) {
      metrics.verificationAttempts++;
    }

    // 3. Comparison questions
    if (
      /so sánh|compare|khác nhau|difference|vs|versus|better|tốt hơn|which.*better|giữa.*và/i.test(
        prompt
      )
    ) {
      metrics.comparisonQuestions++;
    }

    // 4. Critical thinking indicators
    if (
      /tại sao lại|why not|vì sao không|nhược điểm|drawback|limitation|giới hạn|vấn đề|problem with|trường hợp|edge case/i.test(
        prompt
      )
    ) {
      metrics.criticalThinking++;
    }
  }

  // Calculate score (0-10)
  const totalLogs = logs.length;
  const followUpRate = metrics.followUpQuestions / totalLogs;
  const verificationRate = metrics.verificationAttempts / totalLogs;
  const comparisonRate = metrics.comparisonQuestions / totalLogs;
  const criticalRate = metrics.criticalThinking / totalLogs;

  // Weighted scoring
  let score =
    followUpRate * 30 + // 30%: Follow-up is very important
    verificationRate * 30 + // 30%: Verification shows responsibility
    comparisonRate * 20 + // 20%: Comparison shows analytical thinking
    criticalRate * 20; // 20%: Critical thinking

  score = Math.min(10, Math.round(score * 10) / 10);

  return {
    score,
    details: {
      ...metrics,
      totalLogs,
      followUpRate: Math.round(followUpRate * 100) + '%',
      verificationRate: Math.round(verificationRate * 100) + '%',
      comparisonRate: Math.round(comparisonRate * 100) + '%',
      criticalRate: Math.round(criticalRate * 100) + '%',
      assessment: getInquiryAssessment(score),
    },
  };
}

function getInquiryAssessment(score) {
  if (score >= 8) return '🔍 Xuất sắc - Phân tích và kiểm chứng rất tốt';
  if (score >= 6) return '✅ Tốt - Có tư duy phản biện';
  if (score >= 4) return '⚠️ Đạt - Cần cải thiện khả năng kiểm chứng';
  if (score >= 2) return '❌ Yếu - Thiếu tư duy phản biện';
  return '❌ Kém - Chấp nhận AI output không kiểm tra';
}

/**
 * 2. DISRUPTIVE THINKING Score (Sáng tạo)
 *
 * Criteria:
 * - Tạo prompt mới (unique prompts)
 * - Kết hợp nhiều công cụ (tool combinations)
 * - Chuyển đổi góc nhìn (perspective shifts)
 * - Thử nghiệm (experimentation)
 *
 * @param {Array} logs
 * @returns {Object} - {score: 0-10, details}
 */
function calculateDisruptiveThinkingScore(logs) {
  const metrics = {
    uniquePrompts: 0, // Số prompt độc đáo
    uniqueTypes: 0, // Số loại prompt khác nhau
    toolCombinations: 0, // Kết hợp công cụ
    perspectiveShifts: 0, // Chuyển góc nhìn
    experimentalPrompts: 0, // Thử nghiệm
    innovativeIdeas: 0, // Ý tưởng đổi mới
  };

  // Track unique items
  const promptSet = new Set();
  const typeSet = new Set();

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const prompt = log.prompt;
    const normalized = prompt.toLowerCase().trim().replace(/\s+/g, ' ');

    // 1. Unique prompts
    if (!promptSet.has(normalized)) {
      promptSet.add(normalized);
      metrics.uniquePrompts++;
    }

    // 2. Track types diversity
    const type = classifyPromptType(prompt);
    typeSet.add(type);

    // 3. Tool combination indicators
    if (/kết hợp|combine|with|cùng với|và cả|both|together|multiple|nhiều công cụ/i.test(prompt)) {
      metrics.toolCombinations++;
    }

    // 4. Perspective shifts
    if (
      /góc độ|perspective|approach|cách khác|another way|thay vì|instead|alternative|khác với/i.test(
        prompt
      )
    ) {
      metrics.perspectiveShifts++;
    }

    // 5. Experimental prompts
    if (
      /thử|try|experiment|test|xem sao|what if|nếu thử|giả sử|suppose|có thể.*không/i.test(prompt)
    ) {
      metrics.experimentalPrompts++;
    }

    // 6. Innovation indicators
    if (
      /sáng tạo|creative|innovative|độc đáo|unique|khác biệt|different|mới|novel|breakthrough/i.test(
        prompt
      )
    ) {
      metrics.innovativeIdeas++;
    }
  }

  metrics.uniqueTypes = typeSet.size;

  // Calculate score (0-10)
  const totalLogs = logs.length;
  const uniqueRate = metrics.uniquePrompts / totalLogs;
  const typesDiversity = metrics.uniqueTypes / 6; // Max 6 main types
  const experimentRate = metrics.experimentalPrompts / totalLogs;
  const shiftRate = metrics.perspectiveShifts / totalLogs;
  const innovationRate = metrics.innovativeIdeas / totalLogs;
  const toolRate = metrics.toolCombinations / totalLogs;

  // Weighted scoring
  let score =
    uniqueRate * 25 + // 25%: Uniqueness
    typesDiversity * 20 + // 20%: Diversity
    experimentRate * 20 + // 20%: Experimentation
    shiftRate * 15 + // 15%: Perspective shifts
    innovationRate * 15 + // 15%: Innovation
    toolRate * 5; // 5%: Tool combinations

  score = Math.min(10, Math.round(score * 10) / 10);

  return {
    score,
    details: {
      ...metrics,
      totalLogs,
      uniqueRate: Math.round(uniqueRate * 100) + '%',
      typesDiversity: `${metrics.uniqueTypes}/6 types`,
      experimentRate: Math.round(experimentRate * 100) + '%',
      shiftRate: Math.round(shiftRate * 100) + '%',
      innovationRate: Math.round(innovationRate * 100) + '%',
      assessment: getDisruptiveThinkingAssessment(score),
    },
  };
}

function getDisruptiveThinkingAssessment(score) {
  if (score >= 8) return '💡 Xuất sắc - Rất sáng tạo và đổi mới';
  if (score >= 6) return '✅ Tốt - Có sự đa dạng trong cách tiếp cận';
  if (score >= 4) return '⚠️ Đạt - Cần thử nghiệm nhiều hơn';
  if (score >= 2) return '❌ Yếu - Ít sáng tạo, prompts đơn điệu';
  return '❌ Kém - Chỉ dùng prompts cơ bản';
}

/**
 * 3. MINDFULNESS Score (Đạo đức - Minh bạch)
 *
 * Criteria:
 * - Không để AI viết hộ
 * - Không sao chép nguyên văn
 * - Tư duy rõ ràng - không che giấu
 * - Có trách nhiệm với học tập
 *
 * @param {Array} logs
 * @returns {Object} - {score: 0-10, details}
 */
function calculateMindfulnessScore(logs) {
  const metrics = {
    writeForMeCount: 0, // Số lần "làm hộ" (NEGATIVE)
    shortCopyPaste: 0, // Prompts ngắn có dấu hiệu copy (NEGATIVE)
    lackOfContext: 0, // Thiếu context (NEGATIVE)
    ethicalAwareness: 0, // Nhận thức đạo đức (POSITIVE)
    transparency: 0, // Minh bạch (POSITIVE)
    responsibility: 0, // Trách nhiệm (POSITIVE)
  };

  for (const log of logs) {
    const prompt = log.prompt;
    const lower = prompt.toLowerCase();
    const length = prompt.trim().length;

    // NEGATIVE FACTORS

    // 1. Write-for-me patterns - ENHANCED
    const writeForMeKeywords =
      /làm hộ|làm giúp|write for me|do.*for me|code hộ|viết giúp|làm thay|help me write|làm cho tôi|giải hộ|answer this|solve this/i;

    // Detect copy-paste of full question (long prompt without personal context)
    const isLikelyCopiedQuestion =
      length > 200 &&
      !/tôi|mình|em|theo|trong trường hợp|với bài|đối với/i.test(lower) &&
      (prompt.match(/\?/g) || []).length === 1;

    // Direct imperative commands
    const isDirectCommand =
      /^(viết|tạo|làm|code|build|create|write|make|solve|answer)\s/i.test(prompt) &&
      prompt.split(/\s+/).length < 15;

    if (writeForMeKeywords.test(prompt) || isLikelyCopiedQuestion || isDirectCommand) {
      metrics.writeForMeCount++;
    }

    // 2. Short copy-paste indicators - ENHANCED
    const isTooShort = length < 20;
    const isSingleWord = /^(code|fix|help|giúp|sửa|viết|write|tạo|làm)$/i.test(prompt.trim());
    const isQuestionCopyNoContext =
      length > 150 &&
      !/tôi|mình|em|theo|trong bài/i.test(lower) &&
      (prompt.match(/\?/g) || []).length === 1;

    if (isTooShort || isSingleWord || isQuestionCopyNoContext) {
      metrics.shortCopyPaste++;
    }

    // 3. Lack of context
    if (length < 50 && !/\?/.test(prompt)) {
      metrics.lackOfContext++;
    }

    // POSITIVE FACTORS

    // 4. Ethical awareness
    if (
      /trích dẫn|cite|reference|nguồn|source|copyright|bản quyền|học hỏi|học từ|tham khảo/i.test(
        prompt
      )
    ) {
      metrics.ethicalAwareness++;
    }

    // 5. Transparency (explain what they're doing)
    if (
      /tôi đang|i am|hiện tại|currently|mục đích|purpose|để làm|to do|vì tôi cần|because i need/i.test(
        prompt
      )
    ) {
      metrics.transparency++;
    }

    // 6. Responsibility (learning intent)
    if (/học|learn|hiểu|understand|nắm|grasp|nghiên cứu|study|tìm hiểu|explore/i.test(prompt)) {
      metrics.responsibility++;
    }
  }

  // Calculate score (0-10)
  const totalLogs = logs.length;

  // NEGATIVE penalties (start from 10, subtract) - INCREASED
  const writeForMePenalty = (metrics.writeForMeCount / totalLogs) * 5; // Increased from 4 to 5
  const copyPastePenalty = (metrics.shortCopyPaste / totalLogs) * 4; // Increased from 3 to 4
  const lackContextPenalty = (metrics.lackOfContext / totalLogs) * 2;

  // POSITIVE bonuses (add to base)
  const ethicalBonus = (metrics.ethicalAwareness / totalLogs) * 2;
  const transparencyBonus = (metrics.transparency / totalLogs) * 2;
  const responsibilityBonus = (metrics.responsibility / totalLogs) * 1;

  let score = 10;
  score -= writeForMePenalty;
  score -= copyPastePenalty;
  score -= lackContextPenalty;
  score += ethicalBonus;
  score += transparencyBonus;
  score += responsibilityBonus;

  // Cap between 0-10
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  return {
    score,
    details: {
      ...metrics,
      totalLogs,
      writeForMeRate: Math.round((metrics.writeForMeCount / totalLogs) * 100) + '%',
      copyPasteRate: Math.round((metrics.shortCopyPaste / totalLogs) * 100) + '%',
      contextRate: Math.round(((totalLogs - metrics.lackOfContext) / totalLogs) * 100) + '%',
      ethicalRate: Math.round((metrics.ethicalAwareness / totalLogs) * 100) + '%',
      transparencyRate: Math.round((metrics.transparency / totalLogs) * 100) + '%',
      responsibilityRate: Math.round((metrics.responsibility / totalLogs) * 100) + '%',
      penalties: {
        writeForMe: Math.round(writeForMePenalty * 10) / 10,
        copyPaste: Math.round(copyPastePenalty * 10) / 10,
        lackContext: Math.round(lackContextPenalty * 10) / 10,
      },
      bonuses: {
        ethical: Math.round(ethicalBonus * 10) / 10,
        transparency: Math.round(transparencyBonus * 10) / 10,
        responsibility: Math.round(responsibilityBonus * 10) / 10,
      },
      assessment: getMindfulnessAssessment(score),
    },
  };
}

function getMindfulnessAssessment(score) {
  if (score >= 8) return '✅ Xuất sắc - Sử dụng AI có đạo đức và trách nhiệm';
  if (score >= 6) return '✅ Tốt - Sử dụng AI hợp lý';
  if (score >= 4) return '⚠️ Đạt - Cần minh bạch hơn';
  if (score >= 2) return '❌ Yếu - Có dấu hiệu lệ thuộc AI';
  return '❌ Kém - Lệ thuộc AI nghiêm trọng';
}

/**
 * Generate overall WISDOM interpretation
 */
function generateWisdomInterpretation(wisdomScore) {
  const { inquiry, disruptiveThinking, mindfulness, overall } = wisdomScore;

  // Individual assessments
  const inquiryText = getInquiryAssessment(inquiry);
  const disruptiveText = getDisruptiveThinkingAssessment(disruptiveThinking);
  const mindfulnessText = getMindfulnessAssessment(mindfulness);

  // Overall assessment
  let overallAssessment = '';
  if (overall >= 8) {
    overallAssessment = '🌟 Xuất sắc - Sử dụng AI rất hiệu quả, có trách nhiệm và sáng tạo';
  } else if (overall >= 6) {
    overallAssessment = '✅ Tốt - Sử dụng AI hợp lý và có tư duy';
  } else if (overall >= 4) {
    overallAssessment = '⚠️ Đạt - Cần cải thiện cách sử dụng AI';
  } else if (overall >= 2) {
    overallAssessment = '❌ Yếu - Lệ thuộc AI, thiếu tự tư duy';
  } else {
    overallAssessment = '❌ Kém - Lệ thuộc AI nghiêm trọng';
  }

  return {
    // For frontend compatibility
    inquiry: inquiryText,
    disruptiveThinking: disruptiveText,
    mindfulness: mindfulnessText,
    // Also keep array format
    interpretations: [inquiryText, disruptiveText, mindfulnessText],
    overallAssessment,
    recommendations: generateRecommendations(wisdomScore),
  };
}

/**
 * Generate recommendations based on WISDOM scores
 */
function generateRecommendations(wisdomScore) {
  const recommendations = [];

  // Inquiry recommendations
  if (wisdomScore.inquiry < 6) {
    recommendations.push({
      category: 'Inquiry',
      issue: 'Thiếu tư duy phản biện và kiểm chứng',
      suggestions: [
        'Hãy hỏi lại AI để xác minh thông tin',
        'So sánh nhiều phương án trước khi quyết định',
        'Đặt câu hỏi "tại sao" và "nhược điểm là gì"',
        'Không chấp nhận AI output mà không suy nghĩ',
      ],
    });
  }

  // Disruptive Thinking recommendations
  if (wisdomScore.disruptiveThinking < 6) {
    recommendations.push({
      category: 'Disruptive Thinking',
      issue: 'Thiếu sự sáng tạo và đa dạng',
      suggestions: [
        'Thử nghiệm nhiều cách đặt câu hỏi khác nhau',
        'Chuyển đổi góc nhìn (từ người dùng, developer, tester...)',
        'Kết hợp nhiều loại prompt (debug + design + optimization)',
        'Đặt câu hỏi "what if" để khám phá các khả năng mới',
      ],
    });
  }

  // Mindfulness recommendations
  if (wisdomScore.mindfulness < 6) {
    recommendations.push({
      category: 'Mindfulness',
      issue: 'Lệ thuộc AI quá mức, thiếu minh bạch',
      suggestions: [
        'KHÔNG để AI "làm hộ" - chỉ nên hỏi để học hỏi',
        'Cung cấp context đầy đủ khi hỏi AI',
        'Tự phân tích trước khi hỏi AI',
        'Minh bạch về việc sử dụng AI trong báo cáo',
      ],
    });
  }

  return recommendations;
}

module.exports = {
  calculateWisdomScore,
  generateWisdomInterpretation,
};
