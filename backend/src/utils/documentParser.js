const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text từ file buffer
 * Hỗ trợ: PDF, DOCX, TXT
 *
 * @param {Object} file - File object từ multer
 * @param {Buffer} file.buffer - File buffer
 * @param {string} file.mimetype - MIME type
 * @param {string} file.originalname - Tên file gốc
 * @returns {Promise<{text: string, meta: Object}>}
 */
async function extractText(file) {
  const { buffer, mimetype, originalname } = file;

  try {
    // PDF files
    if (mimetype === 'application/pdf') {
      let pdfData;
      try {
        pdfData = await pdfParse(buffer, {
          // Thêm options để handle PDF lỗi
          max: 0, // No page limit
          version: 'v1.10.100', // Use specific version
        });
      } catch (pdfError) {
        // Nếu pdf-parse fail, thử với options khác
        console.warn(
          '[Document Parser] PDF parse failed, trying fallback method:',
          pdfError.message
        );
        try {
          pdfData = await pdfParse(buffer, {
            pagerender: pageData => {
              // Custom page render to handle corrupted pages
              return pageData.getTextContent().then(textContent => {
                return textContent.items.map(item => item.str).join(' ');
              });
            },
          });
        } catch (fallbackError) {
          throw new Error(
            `PDF không thể đọc được. Vui lòng kiểm tra lại file hoặc chuyển sang định dạng DOCX/TXT. Chi tiết: ${pdfError.message}`
          );
        }
      }

      const extractedText = pdfData.text || '';
      if (extractedText.trim().length === 0) {
        throw new Error(
          'PDF không chứa text có thể đọc được. Vui lòng thử file khác hoặc chuyển sang DOCX/TXT.'
        );
      }

      return {
        text: extractedText,
        meta: {
          pages: pdfData.numpages,
          info: pdfData.info,
          filename: originalname,
          type: 'pdf',
          wordCount: extractedText.split(/\s+/).filter(Boolean).length,
        },
      };
    }

    // DOCX files
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        meta: {
          filename: originalname,
          type: 'docx',
          wordCount: result.value.split(/\s+/).filter(Boolean).length,
          messages: result.messages, // Warnings/errors từ mammoth
        },
      };
    }

    // TXT files
    if (mimetype === 'text/plain') {
      const text = buffer.toString('utf-8');

      return {
        text: text,
        meta: {
          filename: originalname,
          type: 'txt',
          wordCount: text.split(/\s+/).filter(Boolean).length,
          encoding: 'utf-8',
        },
      };
    }

    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Validate extracted text
 * Kiểm tra xem có đủ nội dung để tạo câu hỏi không
 *
 * @param {string} text - Extracted text
 * @param {number} minWords - Số từ tối thiểu (default: 100)
 * @returns {Object} - {valid: boolean, wordCount: number, error?: string}
 */
function validateExtractedText(text, minWords = 100) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return {
      valid: false,
      wordCount: 0,
      error: 'Document is empty',
    };
  }

  const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;

  if (wordCount < minWords) {
    return {
      valid: false,
      wordCount,
      error: `Document too short. Need at least ${minWords} words, got ${wordCount}`,
    };
  }

  return {
    valid: true,
    wordCount,
  };
}

/**
 * Truncate text để phù hợp với OpenAI token limits
 * GPT-4: ~8000 tokens context, estimate 1 token ≈ 0.75 words
 *
 * @param {string} text - Full text
 * @param {number} maxWords - Maximum words (default: 6000 ≈ 8000 tokens)
 * @returns {string} - Truncated text
 */
function truncateForAI(text, maxWords = 6000) {
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  return words.slice(0, maxWords).join(' ') + '\n\n[...Document truncated]';
}

/**
 * Clean extracted text
 * Loại bỏ ký tự đặc biệt, multiple spaces
 *
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters (giữ punctuation cơ bản)
      .replace(/[^\w\s.,!?;:()\-'"]/g, '')
      // Trim
      .trim()
  );
}

module.exports = {
  extractText,
  validateExtractedText,
  truncateForAI,
  cleanText,
};
