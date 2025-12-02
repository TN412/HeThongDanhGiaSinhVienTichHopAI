/**
 * Demo script để test document upload và processing
 * Chạy: node scripts/demo-upload.js
 */

const path = require('path');
const fs = require('fs');
const {
  extractText,
  validateExtractedText,
  truncateForAI,
  cleanText,
} = require('../src/utils/documentParser');

console.log('=== Document Upload & Processing Demo ===\n');

async function demoTextExtraction() {
  console.log('📄 Demo 1: Text Extraction\n');

  // Tạo mock file TXT
  const mockTxtFile = {
    buffer: Buffer.from(
      `
Introduction to Artificial Intelligence

Artificial Intelligence (AI) is the simulation of human intelligence processes by machines,
especially computer systems. These processes include learning, reasoning, and self-correction.

Key Concepts:
1. Machine Learning - Systems that learn from data
2. Neural Networks - Computing systems inspired by biological neural networks
3. Deep Learning - Multi-layered neural networks
4. Natural Language Processing - Understanding human language
5. Computer Vision - Interpreting visual information

Applications of AI:
- Healthcare: Diagnosis and treatment recommendations
- Finance: Fraud detection and trading
- Transportation: Self-driving cars
- Education: Personalized learning systems
- Entertainment: Content recommendations

The field of AI has seen remarkable progress in recent years, with breakthroughs in
areas such as image recognition, language translation, and game playing. As AI continues
to evolve, it promises to transform many aspects of our daily lives and work.

However, AI also raises important ethical questions about privacy, bias, and the
future of human employment. It is crucial that we develop AI systems responsibly
and ensure they benefit all of humanity.
    `.trim()
    ),
    mimetype: 'text/plain',
    originalname: 'ai-introduction.txt',
  };

  try {
    // Extract text
    const result = await extractText(mockTxtFile);

    console.log('✅ Text extracted successfully!');
    console.log('   Filename:', result.meta.filename);
    console.log('   Type:', result.meta.type);
    console.log('   Word count:', result.meta.wordCount);
    console.log('   Encoding:', result.meta.encoding);
    console.log('\n   First 200 characters:');
    console.log('   ' + result.text.substring(0, 200) + '...\n');

    // Validate text
    console.log('📋 Demo 2: Text Validation\n');
    const validation = validateExtractedText(result.text, 100);

    if (validation.valid) {
      console.log('✅ Text validation passed!');
      console.log('   Word count:', validation.wordCount);
      console.log('   Minimum required: 100 words\n');
    } else {
      console.log('❌ Text validation failed:', validation.error);
    }

    // Clean text
    console.log('🧹 Demo 3: Text Cleaning\n');
    const dirtyText = 'This    has   too     many    spaces  \n\n\n   and newlines   ';
    const cleaned = cleanText(dirtyText);

    console.log('   Before:', JSON.stringify(dirtyText));
    console.log('   After:', JSON.stringify(cleaned));
    console.log();

    // Truncate for AI
    console.log('✂️  Demo 4: Text Truncation\n');
    const longText = 'word '.repeat(10000); // 10000 words
    const truncated = truncateForAI(longText, 1000);
    const truncatedWordCount = truncated.split(/\s+/).filter(Boolean).length;

    console.log('   Original word count: 10000');
    console.log('   Truncated to:', truncatedWordCount, 'words');
    console.log(
      '   Truncation marker:',
      truncated.includes('[...Document truncated]') ? '✅' : '❌'
    );
    console.log();

    // Simulate validation failures
    console.log('❌ Demo 5: Validation Failures\n');

    const emptyValidation = validateExtractedText('   \n\n   ');
    console.log('   Empty text:', emptyValidation.error);

    const shortValidation = validateExtractedText('word '.repeat(50), 100);
    console.log('   Too short:', shortValidation.error);
    console.log();

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ All demos completed successfully!');
    console.log('═'.repeat(50));
    console.log('\nKey Features Demonstrated:');
    console.log('  ✅ Text extraction from TXT files');
    console.log('  ✅ Word count calculation');
    console.log('  ✅ Text validation (minimum words)');
    console.log('  ✅ Text cleaning (whitespace removal)');
    console.log('  ✅ Text truncation for AI processing');
    console.log('  ✅ Error handling for invalid inputs');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Upload real PDF/DOCX files');
    console.log('  2. Integrate with Azure Blob Storage');
    console.log('  3. Connect to OpenAI for question generation');
    console.log('  4. Create assignment from extracted text');
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Run demo
demoTextExtraction();
