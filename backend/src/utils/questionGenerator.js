/**
 * Question Generator Utility
 * OpenAI prompt templates for generating questions from documents
 */

/**
 * Build OpenAI prompt for question generation
 * @param {string} text - Extracted document text
 * @param {string} type - 'multiple-choice' | 'essay' | 'mixed'
 * @param {number} count - Number of questions to generate
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {string} Formatted prompt for OpenAI
 */
function buildQuestionGenerationPrompt(text, type, count, difficulty = 'medium') {
  const basePrompt = `You are an expert educator creating assessment questions based on the following document.

Document Content:
${text.substring(0, 8000)}

`;

  if (type === 'multiple-choice') {
    return (
      basePrompt +
      `Generate ${count} ${difficulty}-level multiple-choice questions based on this document.

Requirements:
- Each question should test understanding of key concepts
- Provide 4 options (A, B, C, D) for each question
- Clearly indicate the correct answer
- Include a brief explanation for the correct answer
- Questions should be clear, unambiguous, and appropriate for ${difficulty} level
- Avoid trick questions or overly obscure details

Format your response as a JSON array with this structure:
[
  {
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Brief explanation why A is correct"
  },
  ...
]

Generate ${count} questions now.`
    );
  } else if (type === 'essay') {
    return (
      basePrompt +
      `Generate ${count} ${difficulty}-level essay questions based on this document.

Requirements:
- Questions should require thoughtful, detailed responses
- Test deeper understanding and critical thinking
- Each question should have a suggested rubric for grading
- Include estimated time to complete (in minutes)
- Questions should be appropriate for ${difficulty} level
- Encourage analysis, synthesis, and evaluation

Format your response as a JSON array with this structure:
[
  {
    "question": "Analyze and explain...",
    "rubric": "Key points to look for: 1. ... 2. ... 3. ...",
    "estimatedTime": 15,
    "sampleAnswer": "A good answer would include..."
  },
  ...
]

Generate ${count} questions now.`
    );
  } else if (type === 'mixed') {
    const mcCount = Math.ceil(count / 2);
    const essayCount = count - mcCount;

    return (
      basePrompt +
      `Generate ${mcCount} multiple-choice questions and ${essayCount} essay questions based on this document.

Multiple-Choice Questions (${mcCount}):
- Each with 4 options (A, B, C, D)
- Indicate correct answer
- Include brief explanation
- ${difficulty} difficulty level

Essay Questions (${essayCount}):
- Require detailed, thoughtful responses
- Include grading rubric
- Estimated time to complete
- ${difficulty} difficulty level

Format your response as a JSON object with this structure:
{
  "multipleChoice": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ],
  "essay": [
    {
      "question": "Analyze...",
      "rubric": "...",
      "estimatedTime": 15
    }
  ]
}

Generate the questions now.`
    );
  }

  throw new Error(`Invalid question type: ${type}`);
}

/**
 * Parse AI response into structured questions
 * @param {string} aiResponse - Raw response from OpenAI
 * @param {string} questionType - Type of questions
 * @returns {Array} Parsed questions array
 */
function parseAIQuestions(aiResponse, questionType) {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonString = aiResponse;

    // Remove markdown code blocks
    const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Handle mixed questions
    if (questionType === 'mixed') {
      const questions = [];

      // Add multiple-choice questions
      if (parsed.multipleChoice && Array.isArray(parsed.multipleChoice)) {
        parsed.multipleChoice.forEach(q => {
          questions.push({
            type: 'multiple-choice',
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: 10, // Default points
          });
        });
      }

      // Add essay questions
      if (parsed.essay && Array.isArray(parsed.essay)) {
        parsed.essay.forEach(q => {
          questions.push({
            type: 'essay',
            question: q.question,
            rubric: q.rubric,
            estimatedTime: q.estimatedTime || 15,
            points: 20, // Default points for essay
          });
        });
      }

      return questions;
    }

    // Handle single type questions
    if (!Array.isArray(parsed)) {
      throw new Error('Expected array of questions');
    }

    return parsed.map(q => {
      if (questionType === 'multiple-choice') {
        return {
          type: 'multiple-choice',
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 10,
        };
      } else {
        return {
          type: 'essay',
          question: q.question,
          rubric: q.rubric,
          estimatedTime: q.estimatedTime || 15,
          sampleAnswer: q.sampleAnswer,
          points: 20,
        };
      }
    });
  } catch (error) {
    console.error('Failed to parse AI questions:', error);
    throw new Error('Failed to parse AI response: ' + error.message);
  }
}

/**
 * Validate generated questions
 * @param {Array} questions - Questions to validate
 * @returns {Object} Validation result { isValid, errors }
 */
function validateGeneratedQuestions(questions) {
  const errors = [];

  if (!Array.isArray(questions)) {
    return {
      isValid: false,
      errors: ['Questions must be an array'],
    };
  }

  if (questions.length === 0) {
    return {
      isValid: false,
      errors: ['No questions generated'],
    };
  }

  questions.forEach((q, index) => {
    // Check required fields
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
      errors.push(`Question ${index + 1}: Missing or invalid question text`);
    }

    if (!q.type || !['multiple-choice', 'essay'].includes(q.type)) {
      errors.push(`Question ${index + 1}: Invalid question type`);
    }

    // Validate multiple-choice specific fields
    if (q.type === 'multiple-choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }

      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        errors.push(`Question ${index + 1}: Missing correct answer`);
      }
    }

    // Validate essay specific fields
    if (q.type === 'essay') {
      if (!q.rubric || typeof q.rubric !== 'string') {
        errors.push(`Question ${index + 1}: Missing rubric for essay question`);
      }
    }

    // Validate points
    if (typeof q.points !== 'number' || q.points < 0) {
      errors.push(`Question ${index + 1}: Invalid points value`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate fallback questions if AI fails
 * @param {string} text - Document text
 * @param {number} count - Number of questions
 * @returns {Array} Simple questions array
 */
function generateFallbackQuestions(text, count = 5) {
  const questions = [];

  for (let i = 0; i < count; i++) {
    questions.push({
      type: 'essay',
      question: `Based on the provided document, explain key concept #${i + 1}.`,
      rubric: 'Evaluate based on: 1) Accuracy 2) Completeness 3) Clarity',
      estimatedTime: 15,
      points: 20,
    });
  }

  return questions;
}

module.exports = {
  buildQuestionGenerationPrompt,
  parseAIQuestions,
  validateGeneratedQuestions,
  generateFallbackQuestions,
};
