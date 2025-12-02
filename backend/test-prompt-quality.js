/**
 * Test Script: Prompt Quality Scoring & ML Pipeline
 *
 * Run: node test-prompt-quality.js
 */

const {
  scorePromptHeuristic,
  extractFeatures,
  detectAntiPatterns,
} = require('./src/services/promptScoringService');

console.log('🧪 Testing Prompt Quality Scoring System\n');
console.log('='.repeat(60));

// Test cases
const testCases = [
  {
    name: 'Test 1: One-word prompt (BAD)',
    prompt: 'hello',
    context: {},
    expectedScore: '<20',
  },
  {
    name: 'Test 2: Direct answer request (BAD)',
    prompt: 'What is the answer to question 5?',
    context: {},
    expectedScore: '<30',
  },
  {
    name: 'Test 3: Good question with context',
    prompt: 'Can you explain what a closure is in JavaScript and how it works?',
    context: { hasQuestionContext: true },
    expectedScore: '>80',
  },
  {
    name: 'Test 4: Excellent question with attempt',
    prompt:
      "I'm working on question 5 about async/await. I tried using Promise.then() but got an error. Can you help me understand the difference between async/await and promises?",
    context: { hasQuestionContext: true, hasPreviousAttempt: true },
    expectedScore: '>90',
  },
  {
    name: 'Test 5: Too vague (FAIR)',
    prompt: "I don't understand",
    context: {},
    expectedScore: '<40',
  },
  {
    name: 'Test 6: Technical question without context',
    prompt: 'How do I implement authentication in Node.js?',
    context: {},
    expectedScore: '60-80',
  },
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📝 ${testCase.name}`);
  console.log('─'.repeat(60));
  console.log(`Prompt: "${testCase.prompt}"`);
  console.log(`Context: ${JSON.stringify(testCase.context)}`);

  try {
    const result = scorePromptHeuristic(testCase.prompt, testCase.context);

    console.log(`\n✅ Score: ${result.score}/100 (Level: ${result.level})`);
    console.log(`Expected: ${testCase.expectedScore}`);

    if (result.feedback && result.feedback.length > 0) {
      console.log(`\n💡 Feedback:`);
      result.feedback.forEach(f => console.log(`   ${f}`));
    }

    // Log features for inspection
    console.log(`\n📊 Features (${Object.keys(result.features).length} total):`);
    console.log(`   - Char count: ${result.features.charCount}`);
    console.log(`   - Word count: ${result.features.wordCount}`);
    console.log(`   - Has question mark: ${result.features.hasQuestionMark ? 'Yes' : 'No'}`);
    console.log(`   - Is open question: ${result.features.isOpenQuestion ? 'Yes' : 'No'}`);
    console.log(`   - Has technical terms: ${result.features.hasTechnicalTerms ? 'Yes' : 'No'}`);
    console.log(`   - Has question context: ${result.features.hasQuestionContext ? 'Yes' : 'No'}`);

    passed++;
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Summary: ${passed}/${testCases.length} passed`);

if (failed > 0) {
  console.log(`❌ ${failed} tests failed`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}

// Additional tests
console.log('\n' + '='.repeat(60));
console.log('\n🔬 Additional Feature Extraction Tests\n');

const samplePrompt =
  "Can you explain how async/await works in JavaScript? I've tried using it but keep getting 'await is only valid in async function' error.";
const sampleContext = {
  hasQuestionContext: true,
  hasPreviousAttempt: true,
  previousPromptCount: 2,
};

console.log(`Prompt: "${samplePrompt}"`);
console.log(`Context: ${JSON.stringify(sampleContext)}\n`);

const features = extractFeatures(samplePrompt, sampleContext);

console.log('📋 Extracted Features:');
Object.entries(features).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

// Anti-pattern tests
console.log('\n' + '='.repeat(60));
console.log('\n🚫 Anti-Pattern Detection Tests\n');

const antiPatternTests = [
  { prompt: 'What is the answer?', expected: 'Direct answer request' },
  { prompt: 'hello', expected: 'Greeting only' },
  { prompt: 'help', expected: 'One-word' },
  { prompt: 'Do it for me', expected: 'Do it for me' },
  { prompt: "I don't understand", expected: 'Too vague' },
  { prompt: 'What? How? Why? When? Where?', expected: 'Too many questions' },
];

antiPatternTests.forEach(test => {
  const warnings = detectAntiPatterns(test.prompt);
  console.log(`Prompt: "${test.prompt}"`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Warnings: ${warnings.length > 0 ? warnings.join(', ') : 'None'}`);
  console.log('─'.repeat(60));
});

console.log('\n✅ Prompt Quality Scoring System Tests Complete!\n');
