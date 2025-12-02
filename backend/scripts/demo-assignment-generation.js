/**
 * Demo script for assignment generation
 * Shows how the /api/assignment/generate endpoint works
 */

console.log('=== Assignment Generation Demo ===\n');

// Simulate parseAIQuestions function
function parseAIQuestions(aiResponse, questionType) {
  try {
    // Remove markdown code blocks if present
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON
    const questions = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array');
    }

    if (questions.length === 0) {
      throw new Error('AI returned empty questions array');
    }

    // Validate and normalize each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.type || !q.question) {
        throw new Error(`Question ${index + 1} missing required fields (type, question)`);
      }

      if (q.type === 'multiple-choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question ${index + 1}: multiple-choice must have at least 2 options`);
        }
        if (!q.correctAnswer) {
          throw new Error(`Question ${index + 1}: multiple-choice must have correctAnswer`);
        }

        const answer = q.correctAnswer.trim().toUpperCase();
        if (!/^[A-Z]$/.test(answer)) {
          throw new Error(`Question ${index + 1}: correctAnswer must be a single letter (A-D)`);
        }

        return {
          type: 'multiple-choice',
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: answer,
          explanation: q.explanation ? q.explanation.trim() : '',
          points: q.points || 10,
          difficulty: q.difficulty || 'medium',
        };
      } else if (q.type === 'essay') {
        if (!q.rubric) {
          throw new Error(`Question ${index + 1}: essay must have rubric`);
        }

        return {
          type: 'essay',
          question: q.question.trim(),
          rubric: q.rubric.trim(),
          estimatedTime: q.estimatedTime || 15,
          points: q.points || 20,
          difficulty: q.difficulty || 'medium',
        };
      } else {
        throw new Error(`Question ${index + 1}: invalid type '${q.type}'`);
      }
    });

    return validatedQuestions;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    throw error;
  }
}

// Demo 1: Valid Multiple-Choice Response
console.log('📝 Demo 1: Valid Multiple-Choice Questions\n');

const validMCResponse = JSON.stringify([
  {
    type: 'multiple-choice',
    question: 'What is the time complexity of binary search?',
    options: ['A. O(n)', 'B. O(log n)', 'C. O(n^2)', 'D. O(1)'],
    correctAnswer: 'B',
    explanation:
      'Binary search divides the search space in half each time, resulting in O(log n) complexity.',
    points: 10,
    difficulty: 'medium',
  },
  {
    type: 'multiple-choice',
    question: 'Which data structure uses LIFO principle?',
    options: ['A. Queue', 'B. Stack', 'C. Tree', 'D. Graph'],
    correctAnswer: 'B',
    explanation: 'Stack follows Last-In-First-Out (LIFO) principle.',
    points: 10,
    difficulty: 'easy',
  },
]);

try {
  const questions = parseAIQuestions(validMCResponse, 'multiple-choice');
  console.log('✅ Successfully parsed', questions.length, 'questions');
  questions.forEach((q, i) => {
    console.log(`\n   Question ${i + 1}:`);
    console.log(`   - Type: ${q.type}`);
    console.log(`   - Question: ${q.question}`);
    console.log(`   - Options: ${q.options.length}`);
    console.log(`   - Correct: ${q.correctAnswer}`);
    console.log(`   - Points: ${q.points}`);
  });
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Demo 2: Valid Essay Response
console.log('\n\n📝 Demo 2: Valid Essay Questions\n');

const validEssayResponse = JSON.stringify([
  {
    type: 'essay',
    question:
      'Explain the concept of object-oriented programming and provide examples of its main principles.',
    rubric:
      'Key points: 1) Definition of OOP, 2) Encapsulation with example, 3) Inheritance with example, 4) Polymorphism with example, 5) Real-world application',
    estimatedTime: 20,
    points: 25,
    difficulty: 'medium',
  },
]);

try {
  const questions = parseAIQuestions(validEssayResponse, 'essay');
  console.log('✅ Successfully parsed', questions.length, 'question(s)');
  questions.forEach((q, i) => {
    console.log(`\n   Question ${i + 1}:`);
    console.log(`   - Type: ${q.type}`);
    console.log(`   - Question: ${q.question.substring(0, 60)}...`);
    console.log(`   - Rubric length: ${q.rubric.length} chars`);
    console.log(`   - Est. time: ${q.estimatedTime} minutes`);
    console.log(`   - Points: ${q.points}`);
  });
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Demo 3: Response with Markdown Code Blocks
console.log('\n\n📝 Demo 3: Response with Markdown Blocks\n');

const markdownResponse = `\`\`\`json
[
  {
    "type": "multiple-choice",
    "question": "What is React?",
    "options": ["A. A library", "B. A framework", "C. A language", "D. An IDE"],
    "correctAnswer": "A",
    "points": 5
  }
]
\`\`\``;

try {
  const questions = parseAIQuestions(markdownResponse, 'multiple-choice');
  console.log('✅ Successfully parsed', questions.length, 'question(s) from markdown');
  console.log('   - Removed markdown wrapper');
  console.log('   - Question:', questions[0].question);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Demo 4: Invalid JSON (Error Handling)
console.log('\n\n❌ Demo 4: Invalid JSON Response\n');

const invalidJSON = 'This is not valid JSON';

try {
  const questions = parseAIQuestions(invalidJSON, 'multiple-choice');
  console.log('Should not reach here');
} catch (error) {
  console.log('✅ Correctly caught error:', error.message);
}

// Demo 5: Missing Required Fields
console.log('\n\n❌ Demo 5: Missing Required Fields\n');

const missingFields = JSON.stringify([
  {
    type: 'multiple-choice',
    // missing question, options, correctAnswer
  },
]);

try {
  const questions = parseAIQuestions(missingFields, 'multiple-choice');
  console.log('Should not reach here');
} catch (error) {
  console.log('✅ Correctly caught error:', error.message);
}

// Demo 6: Invalid correctAnswer Format
console.log('\n\n❌ Demo 6: Invalid correctAnswer Format\n');

const invalidAnswer = JSON.stringify([
  {
    type: 'multiple-choice',
    question: 'Test?',
    options: ['A. One', 'B. Two'],
    correctAnswer: 'AB', // Invalid - must be single letter
    points: 5,
  },
]);

try {
  const questions = parseAIQuestions(invalidAnswer, 'multiple-choice');
  console.log('Should not reach here');
} catch (error) {
  console.log('✅ Correctly caught error:', error.message);
}

// Demo 7: Complete Success Response
console.log('\n\n✅ Demo 7: Complete Success Response Structure\n');

const successResponse = {
  success: true,
  assignmentId: '507f1f77bcf86cd799439011',
  questions: [
    {
      type: 'multiple-choice',
      question: 'What is TypeScript?',
      options: ['A. A superset of JavaScript', 'B. A framework', 'C. A database', 'D. An editor'],
      correctAnswer: 'A',
      explanation: 'TypeScript is a strongly typed superset of JavaScript.',
      points: 10,
      difficulty: 'medium',
    },
  ],
  meta: {
    sourceFile: 'typescript-intro.pdf',
    wordCount: 1500,
    questionCount: 1,
    totalPoints: 10,
    blobUrl:
      'https://storage.blob.core.windows.net/assignments/user123/1699123456789_typescript-intro.pdf',
  },
};

console.log('Success Response:');
console.log('  - Success:', successResponse.success);
console.log('  - Assignment ID:', successResponse.assignmentId);
console.log('  - Questions:', successResponse.questions.length);
console.log('  - Source:', successResponse.meta.sourceFile);
console.log('  - Words:', successResponse.meta.wordCount);
console.log('  - Total Points:', successResponse.meta.totalPoints);
console.log('  - Blob URL:', successResponse.meta.blobUrl ? '✅ Uploaded' : '❌ Not uploaded');

// Demo 8: Error Response (422)
console.log('\n\n❌ Demo 8: Error Response (422 - Unprocessable Entity)\n');

const errorResponse = {
  success: false,
  error: 'Failed to parse AI-generated questions',
  details: 'AI response is not an array',
  aiResponse: '{"questions": [...]}', // Partial for debugging
};

console.log('Error Response:');
console.log('  - Success:', errorResponse.success);
console.log('  - Error:', errorResponse.error);
console.log('  - Details:', errorResponse.details);
console.log('  - AI Response (partial):', errorResponse.aiResponse);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All Demos Completed!');
console.log('='.repeat(60));
console.log('\nKey Takeaways:');
console.log('  ✅ parseAIQuestions validates structure thoroughly');
console.log('  ✅ Handles markdown code blocks gracefully');
console.log('  ✅ Normalizes correctAnswer to uppercase letter');
console.log('  ✅ Provides clear error messages for debugging');
console.log('  ✅ Returns 422 status for unparseable responses');
console.log('  ✅ Success response includes meta information');
console.log('\nNext Steps:');
console.log('  1. Test with real OpenAI API');
console.log('  2. Upload real PDF/DOCX files');
console.log('  3. Verify blob storage integration');
console.log('  4. Test with various document types');
console.log();
