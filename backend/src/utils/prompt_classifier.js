/**
 * Prompt Classifier
 * Phân loại và đánh giá chất lượng prompt theo framework nâng cao
 *
 * Features:
 * - Phân loại 6 loại prompt (Clarifying, Expanding, Debugging, Code-gen, Design, Theory)
 * - Đánh giá chất lượng prompt theo rubric 5 mức
 * - Phát hiện dependency patterns
 * - Tính diversification score
 * - Phát hiện prompt mutations (iterations)
 */

/**
 * Phân loại loại prompt
 * @param {string} prompt - Prompt text
 * @returns {string} - Loại: clarifying, expanding, debugging, code_generation, design_support, theoretical_explanation
 */
function classifyPromptType(prompt) {
  const lower = prompt.toLowerCase();

  // 1. Debugging
  if (
    /error|lỗi|bug|fail|không chạy|không hoạt động|crash|exception|undefined|null|syntax/i.test(
      prompt
    )
  ) {
    return 'debugging';
  }

  // 2. Code Generation
  if (
    /viết code|write code|tạo hàm|create function|generate|implement|code for|làm giúp|viết cho|code hộ/i.test(
      prompt
    )
  ) {
    return 'code_generation';
  }

  // 3. Design Support
  if (
    /design pattern|kiến trúc|architecture|uml|thiết kế|class diagram|database schema|mô hình|structure/i.test(
      prompt
    )
  ) {
    return 'design_support';
  }

  // 4. Theoretical Explanation
  if (
    /giải thích|explain|what is|là gì|define|khái niệm|concept|tại sao|why|how does|cách hoạt động/i.test(
      prompt
    )
  ) {
    return 'theoretical_explanation';
  }

  // 5. Clarifying
  if (
    /như thế nào|how to|làm sao|cách nào|should i|nên|có thể|can i|phải không|right/i.test(prompt)
  ) {
    return 'clarifying';
  }

  // 6. Expanding
  if (
    /thêm|more|other|khác|alternative|ngoài ra|cũng có thể|else|additionally|further/i.test(prompt)
  ) {
    return 'expanding';
  }

  return 'general';
}

/**
 * Calculate text similarity using Jaccard similarity (word overlap)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score 0-1
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Normalize: lowercase, remove punctuation, split into words
  const normalize = text =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore short words

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Jaccard similarity: intersection / union
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Đánh giá chất lượng prompt theo rubric 5 mức
 * @param {string} prompt - Prompt text
 * @param {Object} context - Context về prompt (isRefinement, previousPrompts, questionText, etc.)
 * @returns {Object} - {score: 1-5, level: string, factors: Object, details: string}
 */
function assessPromptQuality(prompt, context = {}) {
  let score = 3; // Baseline: Đạt
  const factors = {
    hasGoal: false, // Có mục tiêu rõ ràng
    hasConstraints: false, // Có ràng buộc/yêu cầu cụ thể
    hasContext: false, // Có ngữ cảnh/background
    hasIteration: false, // Có cải tiến từ lần trước
    showsThinking: false, // Thể hiện tư duy phân tích
    isSpecific: false, // Cụ thể vs. chung chung
  };

  const lower = prompt.toLowerCase();
  const length = prompt.trim().length;

  // CRITICAL: Check if prompt is copy-pasted from question
  if (context.questionText) {
    const similarity = calculateTextSimilarity(prompt, context.questionText);
    if (similarity > 0.7) {
      // 70%+ overlap = likely copy-paste
      console.log(`⚠️ HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(1)}% with question`);
      score -= 2.0; // Heavy penalty for direct copy-paste
      factors.isCopiedFromQuestion = true;
    } else if (similarity > 0.5) {
      // 50-70% overlap = partial copy
      console.log(`⚠️ MODERATE SIMILARITY: ${(similarity * 100).toFixed(1)}% with question`);
      score -= 1.0;
      factors.hasPartialCopy = true;
    }
  }

  // 1. Có mục tiêu rõ ràng? (+0.5)
  if (/mục đích|goal|purpose|để|to|cần|need|muốn|want|yêu cầu|requirement/i.test(prompt)) {
    factors.hasGoal = true;
    score += 0.4;
  }

  // 2. Có constraints/requirements cụ thể? (+0.5)
  if (
    /phải|must|should|không được|không thể|cần|require|constraint|điều kiện|giới hạn|limit/i.test(
      prompt
    )
  ) {
    factors.hasConstraints = true;
    score += 0.4;
  }

  // 3. Có ngữ cảnh/background? (+0.5)
  if (
    length > 100 ||
    /trong bài này|đang làm|context|background|hiện tại|currently|đã|already/i.test(prompt)
  ) {
    factors.hasContext = true;
    score += 0.4;
  }

  // 4. Có iteration/refinement? (+0.5)
  if (
    context.isRefinement ||
    /cải thiện|better|improve|refine|thay vì|instead|khác với|different from/i.test(prompt)
  ) {
    factors.hasIteration = true;
    score += 0.4;
  }

  // 5. Thể hiện tư duy phân tích? (+0.5)
  if (
    /tôi nghĩ|i think|có thể|maybe|vì|because|nếu|if|so sánh|compare|ưu nhược điểm|pros cons/i.test(
      prompt
    )
  ) {
    factors.showsThinking = true;
    score += 0.4;
  }

  // 6. Specific vs. vague? (+0.3)
  const hasNumbers = /\d+/.test(prompt);
  const hasCode = /```|`[^`]+`/.test(prompt);
  const hasSpecificWords = /cụ thể|specific|chính xác|exact|precise|detailed/i.test(prompt);

  if (hasNumbers || hasCode || hasSpecificWords) {
    factors.isSpecific = true;
    score += 0.3;
  }

  // PENALTIES

  // Penalty 1: "Làm hộ" prompts (-2)
  if (
    /làm hộ|làm giúp|write for me|do.*for me|code hộ|viết giúp|làm thay|help me write/i.test(prompt)
  ) {
    score -= 2;
  }

  // Penalty 2: Quá ngắn (<20 chars) (-1)
  if (length < 20) {
    score -= 1;
  }

  // Penalty 3: Chỉ là keywords (code, fix, help...) (-1.5)
  if (/^(code|fix|help|giúp|sửa|viết|write|tạo|create)$/i.test(prompt.trim())) {
    score -= 1.5;
  }

  // Penalty 4: Lặp lại prompt trước đó (-0.5)
  if (context.isDuplicate) {
    score -= 0.5;
  }

  // NEW Penalty 5: Copy-paste câu hỏi dài KHÔNG có context cá nhân (-1.5)
  const isLikelyCopiedQuestion =
    length > 200 &&
    !/tôi|mình|em|theo|trong trường hợp|với bài|đối với|hiện tại đang/i.test(lower) &&
    (prompt.match(/\?/g) || []).length === 1; // Đúng 1 dấu ?
  if (isLikelyCopiedQuestion) {
    score -= 1.5;
    factors.hasContext = false; // Override hasContext
  }

  // NEW Penalty 6: Lệnh trực tiếp ngắn không có tư duy (-1.2)
  const isDirectShortCommand =
    /^(viết|tạo|làm|code|build|create|write|make|implement|solve|answer)\s/i.test(prompt) &&
    prompt.split(/\s+/).length < 15 && // < 15 từ
    !/tại sao|vì sao|như thế nào|so sánh|phân tích|giải thích|why|how|compare|analyze|explain/i.test(
      lower
    );
  if (isDirectShortCommand) {
    score -= 1.2;
    factors.showsThinking = false; // Override showsThinking
  }

  // NEW Penalty 7: Copy-paste pattern (nhiều prompts dài giống nhau) (-1)
  if (context.isCopyPastePattern) {
    score -= 1;
  }

  // Cap score between 1-5
  score = Math.max(1, Math.min(5, Math.round(score)));

  return {
    score,
    level: getLevelLabel(score),
    factors,
    details: generateQualityDetails(score, factors),
  };
}

/**
 * Map score to rubric level
 */
function getLevelLabel(score) {
  if (score === 5) return 'Xuất sắc';
  if (score === 4) return 'Tốt';
  if (score === 3) return 'Đạt';
  if (score === 2) return 'Yếu';
  return 'Kém';
}

/**
 * Generate quality details text
 */
function generateQualityDetails(score, factors) {
  const details = [];

  if (score === 5) {
    details.push('✅ Prompt rõ mục tiêu, nhiều ràng buộc, có ngữ cảnh, có iteration cải tiến');
  } else if (score === 4) {
    details.push('✅ Có cải tiến prompt, đặt yêu cầu logic');
  } else if (score === 3) {
    details.push('⚠️ Prompt đúng nhưng chung chung');
  } else if (score === 2) {
    details.push('❌ Prompt lặp lại, mơ hồ');
  } else {
    details.push('❌ Copy-request, gần như để AI tự làm hết');
  }

  // Add factor details
  if (factors.hasGoal) details.push('+ Có mục tiêu rõ ràng');
  if (factors.hasConstraints) details.push('+ Có ràng buộc cụ thể');
  if (factors.hasContext) details.push('+ Có ngữ cảnh đầy đủ');
  if (factors.hasIteration) details.push('+ Có cải tiến từ lần trước');
  if (factors.showsThinking) details.push('+ Thể hiện tư duy phân tích');
  if (factors.isSpecific) details.push('+ Cụ thể, có chi tiết');

  return details.join('\n');
}

/**
 * Phát hiện dependency patterns (patterns lệ thuộc AI)
 * @param {Array} logs - Array of AI logs
 * @returns {Object} - Dependency metrics
 */
function detectDependencyPatterns(logs) {
  const patterns = {
    writeForMeCount: 0, // Số lượng "làm hộ" prompts
    tooFastCount: 0, // Prompts gửi quá nhanh (<30s)
    noIterationCount: 0, // Không có refinement (duplicate prompts)
    copyPasteIndicators: 0, // Có dấu hiệu copy-paste (prompts quá ngắn)
    lackOfInquiryCount: 0, // Thiếu câu hỏi phản biện
  };

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const prompt = log.prompt.trim();
    const lowerPrompt = prompt.toLowerCase();

    // 1. Write-for-me pattern - ENHANCED
    // Detect direct "do it for me" requests
    const writeForMeKeywords =
      /làm hộ|làm giúp|write for me|code hộ|viết giúp|giải hộ|trả lời hộ|làm giùm|answer this|solve this|complete this|do this for me/i;

    // Detect copy-paste of full question (very long prompts without context)
    const isLikelyCopiedQuestion =
      prompt.length > 200 &&
      !/tôi|mình|em|context|bối cảnh|hiện tại|đang/i.test(lowerPrompt) &&
      /^[^?]*\?$/.test(prompt); // Ends with single question mark

    // Detect imperative commands without reasoning
    const isDirectCommand =
      /^(viết|tạo|làm|code|build|create|write|make|generate|implement)\s/i.test(prompt) &&
      prompt.split(/\s+/).length < 20 && // Short command
      !/vì sao|tại sao|như thế nào|nên|có thể|giải thích|why|how|explain/i.test(lowerPrompt);

    if (writeForMeKeywords.test(lowerPrompt) || isLikelyCopiedQuestion || isDirectCommand) {
      patterns.writeForMeCount++;
    }

    // 2. Too fast pattern (check time between prompts)
    if (i > 0) {
      const prevLog = logs[i - 1];
      const timeDiff = new Date(log.timestamp) - new Date(prevLog.timestamp);
      if (timeDiff < 30000) {
        // < 30 seconds
        patterns.tooFastCount++;
      }
    }

    // 3. No iteration (duplicate prompts)
    if (i > 0) {
      const prevPrompt = logs[i - 1].prompt.toLowerCase().trim();
      const currPrompt = prompt.toLowerCase().trim();
      if (prevPrompt === currPrompt) {
        patterns.noIterationCount++;
      }
    }

    // 4. Copy-paste indicators - ENHANCED
    // Very short prompts (lazy)
    const isTooShort = prompt.length < 15;

    // Single word commands
    const isSingleWord = /^(code|fix|help|giúp|sửa|làm|viết|tạo|answer|solve)$/i.test(prompt);

    // Copy-paste full question WITHOUT adding personal context
    const isQuestionCopy =
      prompt.length > 150 &&
      !/tôi|mình|em|theo|trong bài|câu này|vấn đề này/i.test(lowerPrompt) &&
      (prompt.match(/\?/g) || []).length === 1; // Exactly one question mark (copied question)

    // Sequential identical prompts to multiple questions (copy-paste pattern)
    if (i > 0 && i < logs.length - 1) {
      const prevPrompt = logs[i - 1].prompt.trim();
      const nextPrompt = logs[i + 1].prompt.trim();
      const allSimilar =
        prevPrompt.length > 100 &&
        prompt.length > 100 &&
        nextPrompt.length > 100 &&
        Math.abs(prevPrompt.length - prompt.length) < 50 &&
        Math.abs(nextPrompt.length - prompt.length) < 50;
      if (allSimilar) {
        patterns.copyPasteIndicators++;
      }
    }

    if (isTooShort || isSingleWord || isQuestionCopy) {
      patterns.copyPasteIndicators++;
    }

    // 5. Lack of inquiry (no follow-up questions)
    const hasInquiry = /tại sao|why|how|như thế nào|giải thích|explain|có đúng|verify/i.test(
      prompt
    );
    if (!hasInquiry) {
      patterns.lackOfInquiryCount++;
    }
  }

  return patterns;
}

/**
 * Tính Diversification Score (độ đa dạng prompt)
 * @param {Array} logs - Array of AI logs
 * @returns {number} - Score 0-100
 */
function calculateDiversificationScore(logs) {
  if (logs.length === 0) return 0;

  // 1. Unique prompts (normalized)
  const uniquePrompts = new Set(
    logs.map(log => log.prompt.toLowerCase().trim().replace(/\s+/g, ' '))
  );

  // 2. Unique types
  const uniqueTypes = new Set(logs.map(log => classifyPromptType(log.prompt)));

  // 3. Diversity metrics
  const promptDiversity = uniquePrompts.size / logs.length;
  const typeDiversity = uniqueTypes.size / 6; // 6 main types

  return Math.round((promptDiversity * 0.6 + typeDiversity * 0.4) * 100);
}

/**
 * Phát hiện prompt mutations (iteration/refinement patterns)
 * @param {Array} logs - Array of AI logs
 * @returns {Object} - {count, mutations, refinementRate}
 */
function detectPromptMutations(logs) {
  const mutations = [];

  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1].prompt.toLowerCase();
    const curr = logs[i].prompt.toLowerCase();

    // Check similarity (simple Jaccard similarity)
    const similarity = calculateJaccardSimilarity(prev, curr);

    // If similar but not identical (50-95% similar), it's a mutation
    if (similarity > 0.5 && similarity < 0.95) {
      mutations.push({
        index: i,
        fromPrompt: logs[i - 1].prompt.substring(0, 100) + '...',
        toPrompt: logs[i].prompt.substring(0, 100) + '...',
        similarity: Math.round(similarity * 100) + '%',
        type: detectMutationType(prev, curr),
        timestamp: logs[i].timestamp,
      });
    }
  }

  return {
    count: mutations.length,
    mutations,
    refinementRate: mutations.length / Math.max(1, logs.length - 1),
  };
}

/**
 * Calculate Jaccard Similarity between two strings
 */
function calculateJaccardSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Detect type of mutation (expansion, clarification, constraint_addition, refinement)
 */
function detectMutationType(prev, curr) {
  // Expansion: curr much longer
  if (curr.length > prev.length * 1.5) {
    return 'expansion';
  }

  // Clarification: added specific keywords
  if (
    /cụ thể|specific|chính xác|exactly/.test(curr) &&
    !/cụ thể|specific|chính xác|exactly/.test(prev)
  ) {
    return 'clarification';
  }

  // Constraint addition: added requirements
  if (/phải|must|cần|require/.test(curr) && !/phải|must|cần|require/.test(prev)) {
    return 'constraint_addition';
  }

  // Default: general refinement
  return 'refinement';
}

/**
 * Phân tích depth of refinement
 * @param {Object} mutationsData - Output from detectPromptMutations
 * @returns {Object} - {depth, quality, avgSimilarity}
 */
function analyzeRefinementDepth(mutationsData) {
  if (mutationsData.count === 0) {
    return { depth: 0, quality: 'none', avgSimilarity: 0 };
  }

  const similarities = mutationsData.mutations.map(
    m => parseFloat(m.similarity.replace('%', '')) / 100
  );
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  let depth = mutationsData.count;
  let quality = 'shallow';

  if (depth >= 3 && avgSimilarity > 0.7) {
    quality = 'deep';
  } else if (depth >= 2) {
    quality = 'moderate';
  }

  return {
    depth,
    quality,
    avgSimilarity: Math.round(avgSimilarity * 100) + '%',
  };
}

module.exports = {
  classifyPromptType,
  assessPromptQuality,
  detectDependencyPatterns,
  calculateDiversificationScore,
  detectPromptMutations,
  analyzeRefinementDepth,
  getLevelLabel,
  calculateTextSimilarity,
};
