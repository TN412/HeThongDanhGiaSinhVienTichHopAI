const {
  extractText,
  validateExtractedText,
  truncateForAI,
  cleanText,
} = require('../src/utils/documentParser');

describe('Document Parser', () => {
  describe('extractText', () => {
    test('should extract text from TXT file', async () => {
      // Mock TXT file
      const mockFile = {
        buffer: Buffer.from(
          'This is a test document.\nIt has multiple lines.\nTesting extractText function.'
        ),
        mimetype: 'text/plain',
        originalname: 'test.txt',
      };

      const result = await extractText(mockFile);

      expect(result.text).toBe(
        'This is a test document.\nIt has multiple lines.\nTesting extractText function.'
      );
      expect(result.meta.type).toBe('txt');
      expect(result.meta.filename).toBe('test.txt');
      expect(result.meta.wordCount).toBe(12);
      expect(result.meta.encoding).toBe('utf-8');
    });

    test('should handle empty TXT file', async () => {
      const mockFile = {
        buffer: Buffer.from(''),
        mimetype: 'text/plain',
        originalname: 'empty.txt',
      };

      const result = await extractText(mockFile);

      expect(result.text).toBe('');
      expect(result.meta.wordCount).toBe(0);
      expect(result.meta.type).toBe('txt');
    });

    test('should handle TXT file with UTF-8 characters', async () => {
      const mockFile = {
        buffer: Buffer.from('Hello! Xin chào. 你好. مرحبا. Testing unicode support.'),
        mimetype: 'text/plain',
        originalname: 'multilang.txt',
      };

      const result = await extractText(mockFile);

      expect(result.text).toContain('Xin chào');
      expect(result.text).toContain('你好');
      expect(result.text).toContain('مرحبا');
      expect(result.meta.wordCount).toBeGreaterThan(0);
    });

    test('should handle TXT file with whitespace', async () => {
      const mockFile = {
        buffer: Buffer.from('   \n\n  Word1   Word2  \n\n  Word3   '),
        mimetype: 'text/plain',
        originalname: 'whitespace.txt',
      };

      const result = await extractText(mockFile);

      expect(result.meta.wordCount).toBe(3);
    });

    test('should reject unsupported file type', async () => {
      const mockFile = {
        buffer: Buffer.from('{"key": "value"}'),
        mimetype: 'application/json',
        originalname: 'test.json',
      };

      await expect(extractText(mockFile)).rejects.toThrow('Unsupported file type');
    });

    test('should handle large TXT file', async () => {
      const largeText = 'word '.repeat(10000); // 10000 words
      const mockFile = {
        buffer: Buffer.from(largeText),
        mimetype: 'text/plain',
        originalname: 'large.txt',
      };

      const result = await extractText(mockFile);

      expect(result.meta.wordCount).toBe(10000);
      expect(result.text.length).toBeGreaterThan(40000);
    });
  });

  describe('validateExtractedText', () => {
    test('should validate text with enough words', () => {
      const text = 'word '.repeat(150); // 150 words
      const result = validateExtractedText(text, 100);

      expect(result.valid).toBe(true);
      expect(result.wordCount).toBe(150);
      expect(result.error).toBeUndefined();
    });

    test('should reject text with too few words', () => {
      const text = 'word '.repeat(50); // Only 50 words
      const result = validateExtractedText(text, 100);

      expect(result.valid).toBe(false);
      expect(result.wordCount).toBe(50);
      expect(result.error).toContain('too short');
      expect(result.error).toContain('100');
      expect(result.error).toContain('50');
    });

    test('should reject empty text', () => {
      const result = validateExtractedText('   \n\n   ');

      expect(result.valid).toBe(false);
      expect(result.wordCount).toBe(0);
      expect(result.error).toBe('Document is empty');
    });

    test('should use custom minimum words', () => {
      const text = 'word '.repeat(30);
      const result = validateExtractedText(text, 20);

      expect(result.valid).toBe(true);
      expect(result.wordCount).toBe(30);
    });

    test('should use default minimum words (100)', () => {
      const text = 'word '.repeat(99);
      const result = validateExtractedText(text);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('100');
    });
  });

  describe('truncateForAI', () => {
    test('should not truncate text under limit', () => {
      const text = 'word '.repeat(1000); // 1000 words
      const result = truncateForAI(text, 2000);

      expect(result).toBe(text);
      expect(result).not.toContain('[...Document truncated]');
    });

    test('should truncate text over limit', () => {
      const text = 'word '.repeat(10000); // 10000 words
      const result = truncateForAI(text, 1000);

      expect(result).toContain('[...Document truncated]');
      const resultWordCount = result.split(/\s+/).filter(Boolean).length;
      expect(resultWordCount).toBeLessThanOrEqual(1003); // 1000 + truncation message words
    });

    test('should use default max words (6000)', () => {
      const text = 'word '.repeat(10000);
      const result = truncateForAI(text);

      expect(result).toContain('[...Document truncated]');
      const resultWordCount = result.split(/\s+/).filter(Boolean).length;
      expect(resultWordCount).toBeLessThanOrEqual(6003);
    });

    test('should preserve text structure when truncating', () => {
      const text = 'First sentence. '.repeat(2000);
      const result = truncateForAI(text, 1000);

      expect(result).toContain('First sentence.');
      expect(result).toContain('[...Document truncated]');
    });
  });

  describe('cleanText', () => {
    test('should remove excessive whitespace', () => {
      const text = 'This    has   too     many    spaces';
      const result = cleanText(text);

      expect(result).toBe('This has too many spaces');
    });

    test('should keep basic punctuation', () => {
      const text = 'Hello! This is a test. Question?';
      const result = cleanText(text);

      expect(result).toBe('Hello! This is a test. Question?');
    });

    test('should trim leading/trailing whitespace', () => {
      const text = '   \n  Hello World  \n\n  ';
      const result = cleanText(text);

      expect(result).toBe('Hello World');
    });

    test('should handle empty string', () => {
      const result = cleanText('   \n\n   ');

      expect(result).toBe('');
    });

    test('should remove special characters', () => {
      const text = 'Hello @ # $ % World';
      const result = cleanText(text);

      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('$');
      expect(result).not.toContain('%');
    });

    test('should handle newlines and tabs', () => {
      const text = 'Line1\nLine2\tTab\rCarriage';
      const result = cleanText(text);

      expect(result).toBe('Line1 Line2 Tab Carriage');
    });
  });
});
