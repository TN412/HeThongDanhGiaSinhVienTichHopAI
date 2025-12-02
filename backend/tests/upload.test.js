const { validateMagicBytes } = require('../src/middleware/upload');

describe('Upload Middleware', () => {
  describe('validateMagicBytes', () => {
    test('should validate PDF magic bytes (%PDF)', () => {
      // %PDF-1.4 header
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(validateMagicBytes(pdfBuffer, 'pdf')).toBe(true);
    });

    test('should validate PDF with %PDF-1.7', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      expect(validateMagicBytes(pdfBuffer, 'pdf')).toBe(true);
    });

    test('should reject invalid PDF magic bytes', () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateMagicBytes(invalidBuffer, 'pdf')).toBe(false);
    });

    test('should reject text file pretending to be PDF', () => {
      const textBuffer = Buffer.from('This is not a PDF');
      expect(validateMagicBytes(textBuffer, 'pdf')).toBe(false);
    });

    test('should validate DOCX magic bytes (PK..)', () => {
      // PK header (ZIP files, which DOCX is based on)
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      expect(validateMagicBytes(docxBuffer, 'docx')).toBe(true);
    });

    test('should reject invalid DOCX magic bytes', () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateMagicBytes(invalidBuffer, 'docx')).toBe(false);
    });

    test('should always accept TXT files (no magic bytes)', () => {
      const txtBuffer1 = Buffer.from('Any content');
      const txtBuffer2 = Buffer.from('Different content 123');
      const txtBuffer3 = Buffer.from(''); // Empty

      expect(validateMagicBytes(txtBuffer1, 'txt')).toBe(true);
      expect(validateMagicBytes(txtBuffer2, 'txt')).toBe(true);
      expect(validateMagicBytes(txtBuffer3, 'txt')).toBe(true);
    });

    test('should reject unknown file types', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateMagicBytes(buffer, 'unknown')).toBe(false);
      expect(validateMagicBytes(buffer, 'exe')).toBe(false);
      expect(validateMagicBytes(buffer, 'jpg')).toBe(false);
    });

    test('should handle short buffers gracefully', () => {
      const shortBuffer = Buffer.from([0x25]); // Only 1 byte
      expect(validateMagicBytes(shortBuffer, 'pdf')).toBe(false);
    });

    test('should validate only the beginning of the file', () => {
      // PDF header followed by other content
      const pdfWithContent = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46, // %PDF
        0x2d,
        0x31,
        0x2e,
        0x34, // -1.4
        ...Buffer.from('...rest of PDF content...'),
      ]);
      expect(validateMagicBytes(pdfWithContent, 'pdf')).toBe(true);
    });
  });
});
