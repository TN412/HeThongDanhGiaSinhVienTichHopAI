/**
 * AI_AutoGrader Module
 *
 * Module chấm điểm tự động cho bài tập trắc nghiệm và tự luận
 * với đánh giá khả năng sử dụng AI của sinh viên
 *
 * @module ai_autograder
 */

// =====================================================
// HELPER FUNCTIONS - Text Processing
// =====================================================

/**
 * Chuẩn hóa text để so sánh
 * @param {string} text - Text cần chuẩn hóa
 * @returns {string} Text đã được chuẩn hóa
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Loại bỏ dấu câu
    .replace(/\s+/g, ' '); // Chuẩn hóa khoảng trắng
}

/**
 * Tách text thành các từ duy nhất
 * @param {string} text - Text cần tokenize
 * @returns {Set<string>} Set các từ unique
 */
function tokenize(text) {
  const normalized = normalizeText(text);
  return new Set(normalized.split(' ').filter(word => word.length > 2));
}

/**
 * Tính Jaccard similarity giữa 2 đoạn text
 * @param {string} text1 - Text thứ nhất
 * @param {string} text2 - Text thứ hai
 * @returns {number} Similarity score từ 0 đến 1
 */
function jaccardSimilarity(text1, text2) {
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Tính cosine similarity giữa 2 đoạn text
 * @param {string} text1 - Text thứ nhất
 * @param {string} text2 - Text thứ hai
 * @returns {number} Similarity score từ 0 đến 1
 */
function cosineSimilarity(text1, text2) {
  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  const allWords = new Set([...words1, ...words2]);
  const vector1 = [];
  const vector2 = [];

  allWords.forEach(word => {
    vector1.push(words1.has(word) ? 1 : 0);
    vector2.push(words2.has(word) ? 1 : 0);
  });

  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

// =====================================================
// A) MCQ GRADING
// =====================================================

/**
 * Chấm điểm trắc nghiệm
 * @param {Array<{questionId: string, answer: string}>} studentMCQ - Đáp án sinh viên
 * @param {Array<{questionId: string, correctAnswer: string, topic?: string}>} correctMCQ - Đáp án đúng
 * @returns {Object} Kết quả chấm MCQ
 */
function gradeMCQ(studentMCQ, correctMCQ) {
  if (!studentMCQ || !correctMCQ || studentMCQ.length === 0) {
    return {
      score: 0,
      totalQuestions: correctMCQ?.length || 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
      incorrectByTopic: {},
      feedback: 'Không có đáp án để chấm',
    };
  }

  // Tạo map để tra cứu nhanh
  const correctMap = new Map(correctMCQ.map(q => [q.questionId.toString(), q]));

  let correctCount = 0;
  const incorrectByTopic = {};
  const incorrectQuestions = [];

  // Chấm từng câu
  studentMCQ.forEach(studentAnswer => {
    const correct = correctMap.get(studentAnswer.questionId.toString());

    if (!correct) return; // Câu hỏi không tồn tại

    const isCorrect = studentAnswer.answer === correct.correctAnswer;

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectQuestions.push({
        questionId: studentAnswer.questionId,
        studentAnswer: studentAnswer.answer,
        correctAnswer: correct.correctAnswer,
        topic: correct.topic,
      });

      // Thống kê sai theo topic
      const topic = correct.topic || 'General';
      incorrectByTopic[topic] = (incorrectByTopic[topic] || 0) + 1;
    }
  });

  const totalQuestions = correctMCQ.length;
  const incorrectCount = totalQuestions - correctCount;
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  // Sinh feedback cá nhân hóa
  let feedback = `Bạn trả lời đúng ${correctCount}/${totalQuestions} câu (${accuracy.toFixed(1)}%). `;

  if (Object.keys(incorrectByTopic).length > 0) {
    const topWeaknesses = Object.entries(incorrectByTopic)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => `${topic} (${count} câu)`)
      .join(', ');

    feedback += `\n📚 Bạn cần ôn lại các chủ đề: ${topWeaknesses}.`;
  }

  if (accuracy >= 80) {
    feedback += '\n✅ Kết quả tốt! Hãy tiếp tục duy trì.';
  } else if (accuracy >= 60) {
    feedback += '\n⚠️ Kết quả khá, nhưng bạn có thể làm tốt hơn.';
  } else {
    feedback += '\n❌ Bạn cần học thêm về các khái niệm cơ bản.';
  }

  return {
    score: (accuracy / 100) * 10, // Normalize từ 0-100% thành 0-10
    totalQuestions,
    correctCount,
    incorrectCount,
    accuracy,
    incorrectByTopic,
    incorrectQuestions,
    feedback,
  };
}

// =====================================================
// B) ESSAY RUBRIC (0-4)
// =====================================================

/**
 * Chấm điểm bài tự luận dựa trên rubric
 * @param {string} studentEssay - Bài làm của sinh viên
 * @param {string} referenceAnswer - Đáp án tham khảo (nếu có)
 * @param {Array<string>} keyPoints - Các điểm chính cần có
 * @returns {Object} Kết quả chấm essay
 */
function scoreEssay(studentEssay, referenceAnswer = '', keyPoints = []) {
  if (!studentEssay || studentEssay.trim().length === 0) {
    return {
      score: 0,
      level: 'Không có câu trả lời',
      feedback: 'Bạn chưa trả lời câu hỏi tự luận.',
      keyPointsCovered: 0,
      totalKeyPoints: keyPoints.length,
      details: {
        length: 0,
        hasStructure: false,
        hasExamples: false,
        keyPointsFound: [],
      },
    };
  }

  const essay = normalizeText(studentEssay);
  const essayLength = essay.split(' ').length;

  let score = 0;
  let level = '';
  let feedback = '';

  // Tiêu chí 1: Độ dài (10% - phải có ít nhất 50 từ)
  const hasMinLength = essayLength >= 50;

  // Tiêu chí 2: Cấu trúc (20% - có dấu câu, đoạn văn)
  const hasStructure = studentEssay.includes('.') && studentEssay.includes('\n');

  // Tiêu chí 3: Ví dụ/minh họa (20% - có từ khóa như "ví dụ", "chẳng hạn")
  const exampleKeywords = ['ví dụ', 'chẳng hạn', 'như', 'thí dụ', 'minh họa'];
  const hasExamples = exampleKeywords.some(kw => essay.includes(kw));

  // Tiêu chí 4: Key points coverage (50%)
  const keyPointsFound = [];
  if (keyPoints.length > 0) {
    keyPoints.forEach(point => {
      const normalizedPoint = normalizeText(point);
      if (essay.includes(normalizedPoint)) {
        keyPointsFound.push(point);
      }
    });
  }

  const keyPointsCoverage =
    keyPoints.length > 0 ? keyPointsFound.length / keyPoints.length : hasMinLength ? 0.5 : 0; // Nếu không có key points, chấm theo độ dài

  // Tính điểm tổng hợp (0-10)
  let totalScore = 0;

  // Key points là quan trọng nhất (5 điểm)
  totalScore += keyPointsCoverage * 5;

  // Độ dài (1.25 điểm)
  if (hasMinLength) totalScore += 1.25;

  // Cấu trúc (1.875 điểm)
  if (hasStructure) totalScore += 1.875;

  // Ví dụ (1.875 điểm)
  if (hasExamples) totalScore += 1.875;

  score = Math.min(10, Math.round(totalScore * 4) / 4); // Round to 0.25

  // Phân loại level cho thang 10
  if (score >= 8.5) {
    level = 'Xuất sắc';
    feedback = '🌟 Bài làm rất tốt! Lập luận chặt chẽ, đầy đủ key points và có ví dụ minh họa.';
  } else if (score >= 7) {
    level = 'Tốt';
    feedback = '✅ Bài làm tốt. Đúng phần lớn, có thể cải thiện thêm về ví dụ hoặc độ sâu.';
  } else if (score >= 5) {
    level = 'Đạt yêu cầu';
    feedback = '⚠️ Bài làm đạt yêu cầu cơ bản nhưng thiếu chi tiết hoặc ví dụ.';
  } else if (score >= 3) {
    level = 'Chưa đạt';
    feedback = '❌ Bài làm còn nhiều thiếu sót. Cần bổ sung thêm nội dung và key points.';
  } else {
    level = 'Không đạt';
    feedback = '❌ Bài làm chưa đủ nội dung hoặc sai hoàn toàn.';
  }

  // Gợi ý cải thiện
  const suggestions = [];
  if (!hasMinLength) suggestions.push('Cần viết dài hơn (ít nhất 50 từ)');
  if (!hasStructure) suggestions.push('Cần cải thiện cấu trúc (chia đoạn, dùng dấu câu)');
  if (!hasExamples) suggestions.push('Nên bổ sung ví dụ minh họa');
  if (keyPointsCoverage < 0.7) suggestions.push('Cần đề cập đầy đủ các key points');

  if (suggestions.length > 0) {
    feedback += `\n\n💡 Gợi ý cải thiện:\n- ${suggestions.join('\n- ')}`;
  }

  return {
    score,
    level,
    feedback,
    keyPointsCovered: keyPointsFound.length,
    totalKeyPoints: keyPoints.length,
    details: {
      length: essayLength,
      hasMinLength,
      hasStructure,
      hasExamples,
      keyPointsFound,
      keyPointsCoverage: (keyPointsCoverage * 100).toFixed(1) + '%',
    },
  };
}

// =====================================================
// C) AI USAGE SCORING
// =====================================================

/**
 * Đánh giá chất lượng prompt AI
 * @param {Array<{prompt: string, response: string}>} aiChatLog - Log chat với AI
 * @returns {Object} Kết quả đánh giá prompt quality
 */
function computePromptQuality(aiChatLog) {
  if (!aiChatLog || aiChatLog.length === 0) {
    return {
      score: 4, // Không dùng AI = tốt nhất
      level: 'Không sử dụng AI',
      feedback: 'Bạn hoàn thành bài làm độc lập.',
      details: {
        totalPrompts: 0,
        avgPromptLength: 0,
        hasContext: false,
        hasIteration: false,
      },
    };
  }

  const totalPrompts = aiChatLog.length;
  const avgPromptLength = aiChatLog.reduce((sum, log) => sum + log.prompt.length, 0) / totalPrompts;

  // Kiểm tra prompt có context không (dài, có dấu hỏi, có từ khóa)
  const contextualPrompts = aiChatLog.filter(log => {
    const p = log.prompt.toLowerCase();
    return (
      p.length > 30 && (p.includes('?') || p.includes('làm thế nào') || p.includes('giải thích'))
    );
  });

  const hasContext = contextualPrompts.length / totalPrompts > 0.5;

  // Kiểm tra có iteration không (prompt sau dựa trên response trước)
  const hasIteration =
    aiChatLog.length > 1 &&
    aiChatLog.some((log, i) => {
      if (i === 0) return false;
      const prevResponse = normalizeText(aiChatLog[i - 1].response);
      const currentPrompt = normalizeText(log.prompt);
      // Kiểm tra xem prompt có reference đến response trước không
      return prevResponse.split(' ').some(word => word.length > 5 && currentPrompt.includes(word));
    });

  let score = 0;
  let level = '';
  let feedback = '';

  // Tính điểm (0-10)
  if (avgPromptLength > 50 && hasContext && hasIteration) {
    score = 10;
    level = 'Xuất sắc';
    feedback = '🌟 Prompt chất lượng cao! Bạn hỏi rõ ràng, có ngữ cảnh và cải tiến dần.';
  } else if (avgPromptLength > 40 && hasContext) {
    score = 7.5;
    level = 'Tốt';
    feedback = '✅ Prompt tốt. Bạn hỏi khá rõ ràng và có ngữ cảnh.';
  } else if (avgPromptLength > 20) {
    score = 5;
    level = 'Trung bình';
    feedback = '⚠️ Prompt đơn giản. Nên hỏi cụ thể hơn để AI hỗ trợ tốt hơn.';
  } else if (avgPromptLength > 10) {
    score = 2.5;
    level = 'Yếu';
    feedback = '❌ Prompt quá ngắn. Hãy mô tả vấn đề rõ ràng hơn.';
  } else {
    score = 0;
    level = 'Rất yếu';
    feedback = '❌ Prompt không rõ ràng hoặc vô nghĩa.';
  }

  return {
    score,
    level,
    feedback,
    details: {
      totalPrompts,
      avgPromptLength: Math.round(avgPromptLength),
      hasContext,
      hasIteration,
      contextualPromptsRatio: ((contextualPrompts.length / totalPrompts) * 100).toFixed(1) + '%',
    },
  };
}

/**
 * Tính similarity giữa bài làm sinh viên và câu trả lời AI
 * @param {string} studentEssay - Bài làm sinh viên
 * @param {Array<string>} aiGeneratedAnswers - Các câu trả lời AI đã tạo
 * @returns {Object} Kết quả similarity
 */
function computeSimilarity(studentEssay, aiGeneratedAnswers) {
  if (!studentEssay || !aiGeneratedAnswers || aiGeneratedAnswers.length === 0) {
    return {
      maxSimilarity: 0,
      avgSimilarity: 0,
      method: 'jaccard',
      details: {
        comparisons: [],
      },
    };
  }

  const comparisons = aiGeneratedAnswers.map((aiAnswer, index) => {
    const jaccard = jaccardSimilarity(studentEssay, aiAnswer);
    const cosine = cosineSimilarity(studentEssay, aiAnswer);

    return {
      index,
      jaccardSimilarity: jaccard,
      cosineSimilarity: cosine,
      avgSimilarity: (jaccard + cosine) / 2,
    };
  });

  const maxSimilarity = Math.max(...comparisons.map(c => c.avgSimilarity));
  const avgSimilarity =
    comparisons.reduce((sum, c) => sum + c.avgSimilarity, 0) / comparisons.length;

  return {
    maxSimilarity,
    avgSimilarity,
    method: 'hybrid (jaccard + cosine)',
    details: {
      comparisons,
    },
  };
}

/**
 * Đánh giá mức độ độc lập của sinh viên
 * @param {string} studentEssay - Bài làm sinh viên
 * @param {Array<string>} aiGeneratedAnswers - Câu trả lời AI
 * @param {number} similarityScore - Điểm similarity
 * @returns {Object} Kết quả independence
 */
function computeIndependence(studentEssay, aiGeneratedAnswers, similarityScore) {
  if (!aiGeneratedAnswers || aiGeneratedAnswers.length === 0) {
    return {
      score: 10,
      level: 'Hoàn toàn độc lập',
      feedback: '🌟 Bạn hoàn thành bài làm hoàn toàn độc lập.',
      details: {
        similarity: 0,
        hasOwnStyle: true,
        hasElaboration: true,
      },
    };
  }

  const similarity = similarityScore || 0;

  // Kiểm tra có phong cách riêng không (độ dài, từ ngữ cá nhân)
  const personalWords = [
    'tôi nghĩ',
    'theo tôi',
    'theo em',
    'em thấy',
    'tôi thấy',
    'ý kiến của tôi',
  ];
  const hasOwnStyle = personalWords.some(word => studentEssay.toLowerCase().includes(word));

  // Kiểm tra có elaboration (giải thích thêm, ví dụ riêng)
  const essayLength = studentEssay.split(' ').length;
  const aiAvgLength =
    aiGeneratedAnswers.reduce((sum, ans) => sum + ans.split(' ').length, 0) /
    aiGeneratedAnswers.length;
  const hasElaboration = essayLength > aiAvgLength * 1.2; // Dài hơn AI 20%

  let score = 0;
  let level = '';
  let feedback = '';

  // Tính điểm dựa trên similarity (ngược lại) - thang 10
  if (similarity < 0.3 && hasOwnStyle) {
    score = 10;
    level = 'Hoàn toàn độc lập';
    feedback = '🌟 Bạn tự diễn giải hoàn toàn. Rất tốt!';
  } else if (similarity < 0.5 && (hasOwnStyle || hasElaboration)) {
    score = 7.5;
    level = 'Có chỉnh sửa đáng kể';
    feedback = '✅ Bạn có chỉnh sửa và thêm ý kiến riêng. Tốt!';
  } else if (similarity < 0.7) {
    score = 5;
    level = 'Paraphrase nhẹ';
    feedback = '⚠️ Bạn paraphrase nhưng chưa thêm nhiều ý kiến riêng.';
  } else if (similarity < 0.85) {
    score = 2.5;
    level = 'Gần giống AI';
    feedback = '❌ Bài làm khá giống AI. Hãy tự diễn giải lại.';
  } else {
    score = 0;
    level = 'Copy nguyên văn';
    feedback = '❌ Bài làm gần như copy nguyên văn từ AI.';
  }

  return {
    score,
    level,
    feedback,
    details: {
      similarity: (similarity * 100).toFixed(1) + '%',
      hasOwnStyle,
      hasElaboration,
      essayLength,
      aiAvgLength: Math.round(aiAvgLength),
    },
  };
}

/**
 * Tổng hợp đánh giá AI usage
 * @param {Array<{prompt: string, response: string}>} aiChatLog - Log chat AI
 * @param {string} studentEssay - Bài làm sinh viên
 * @param {Array<string>} aiGeneratedAnswers - Câu trả lời AI
 * @returns {Object} Kết quả tổng hợp AI usage
 */
function gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers) {
  const promptQuality = computePromptQuality(aiChatLog);
  const similarity = computeSimilarity(studentEssay, aiGeneratedAnswers);
  const independence = computeIndependence(
    studentEssay,
    aiGeneratedAnswers,
    similarity.maxSimilarity
  );

  // Tính điểm AI usage (0-4)
  const aiUsageScore = Math.round(((promptQuality.score + independence.score) / 2) * 2) / 2;

  let overallFeedback = '';

  if (aiUsageScore >= 3.5) {
    overallFeedback = '🌟 Sử dụng AI xuất sắc! Bạn hỏi tốt và tự diễn giải hoàn toàn.';
  } else if (aiUsageScore >= 3) {
    overallFeedback = '✅ Sử dụng AI tốt. Bạn biết cách hỏi và có chỉnh sửa.';
  } else if (aiUsageScore >= 2) {
    overallFeedback = '⚠️ Sử dụng AI ở mức trung bình. Cần cải thiện prompt và độc lập hơn.';
  } else if (aiUsageScore >= 1) {
    overallFeedback = '❌ Sử dụng AI chưa hiệu quả. Cần học cách hỏi tốt hơn.';
  } else {
    overallFeedback = '❌ Sử dụng AI không đúng cách hoặc phụ thuộc quá nhiều.';
  }

  return {
    aiUsageScore,
    promptQualityScore: promptQuality.score,
    independenceScore: independence.score,
    similarityToAI: similarity.maxSimilarity,
    feedback: overallFeedback,
    details: {
      promptQuality,
      similarity,
      independence,
    },
  };
}

// =====================================================
// D) FINAL GRADING & SUMMARY
// =====================================================

/**
 * Tổng hợp toàn bộ kết quả chấm điểm
 * @param {Object} params - Parameters
 * @param {Array} params.studentMCQ - Đáp án MCQ của sinh viên
 * @param {Array} params.correctMCQ - Đáp án MCQ đúng
 * @param {string} params.studentEssay - Bài tự luận sinh viên
 * @param {string} params.referenceAnswer - Đáp án tham khảo
 * @param {Array<string>} params.keyPoints - Các key points
 * @param {Array} params.aiChatLog - Log chat AI
 * @param {Array<string>} params.aiGeneratedAnswers - Câu trả lời AI
 * @param {Object} params.weights - Trọng số {mcq, essay, aiUsage}
 * @returns {Object} AIGradingResult
 */
function summarizeGrade({
  studentMCQ = [],
  correctMCQ = [],
  studentEssay = '',
  referenceAnswer = '',
  keyPoints = [],
  aiChatLog = [],
  aiGeneratedAnswers = [],
  weights = { mcq: 0.4, essay: 0.4, aiUsage: 0.2 },
}) {
  // A) Chấm MCQ
  const mcqResult = gradeMCQ(studentMCQ, correctMCQ);

  // B) Chấm Essay
  const essayResult = scoreEssay(studentEssay, referenceAnswer, keyPoints);

  // C) Chấm AI Usage
  const aiUsageResult = gradeAIUsage(aiChatLog, studentEssay, aiGeneratedAnswers);

  // D) Tính điểm cuối (scale 0-10 cho tất cả)
  const mcqScore = mcqResult.score; // Already 0-10
  const essayScore = essayResult.score; // Already 0-10
  const aiUsageScore = aiUsageResult.aiUsageScore; // Already 0-10

  const finalScore =
    mcqScore * weights.mcq + essayScore * weights.essay + aiUsageScore * weights.aiUsage;

  // Generate tổng quan feedback cho thang 10
  let overallFeedback = '';

  if (finalScore >= 8.5) {
    overallFeedback = '🎉 Kết quả xuất sắc! Bạn làm rất tốt cả về kiến thức và kỹ năng sử dụng AI.';
  } else if (finalScore >= 7) {
    overallFeedback = '✅ Kết quả tốt! Bạn đã nắm vững kiến thức và sử dụng AI hiệu quả.';
  } else if (finalScore >= 5) {
    overallFeedback =
      '⚠️ Kết quả đạt yêu cầu. Bạn cần cải thiện thêm về kiến thức và cách dùng AI.';
  } else if (finalScore >= 3) {
    overallFeedback = '❌ Kết quả chưa đạt. Bạn cần học thêm và luyện tập nhiều hơn.';
  } else {
    overallFeedback = '❌ Kết quả rất yếu. Hãy xem lại bài học và thử lại.';
  }

  return {
    // Điểm số
    mcqScore: parseFloat(mcqScore.toFixed(2)),
    essayScore: parseFloat(essayScore.toFixed(2)),
    aiUsageScore: parseFloat(aiUsageScore.toFixed(2)),
    finalScore: parseFloat(finalScore.toFixed(2)),

    // Similarity & Quality
    similarityToAI: parseFloat((aiUsageResult.similarityToAI * 100).toFixed(1)),
    promptQualityScore: aiUsageResult.promptQualityScore,
    independenceScore: aiUsageResult.independenceScore,

    // Feedback
    feedback: {
      overall: overallFeedback,
      mcq: mcqResult.feedback,
      essay: essayResult.feedback,
      aiUsage: aiUsageResult.feedback,
    },

    // Chi tiết
    details: {
      mcq: mcqResult,
      essay: essayResult,
      aiUsage: aiUsageResult.details,
      weights,
    },

    // Metadata
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  // Main function
  summarizeGrade,

  // Individual grading functions
  gradeMCQ,
  scoreEssay,
  gradeAIUsage,

  // Helper functions
  computePromptQuality,
  computeSimilarity,
  computeIndependence,

  // Utility functions
  normalizeText,
  tokenize,
  jaccardSimilarity,
  cosineSimilarity,
};
