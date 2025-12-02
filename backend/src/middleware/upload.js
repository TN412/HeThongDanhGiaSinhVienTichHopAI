const multer = require('multer');
const { sanitizeFilename } = require('./security');

/**
 * Multer middleware cho document upload
 * - Memory storage (không lưu file tạm)
 * - Giới hạn kích thước từ MAX_FILE_SIZE_MB
 * - Validate MIME type và magic bytes
 * - Sanitize filename để tránh path traversal
 */

// Lấy giới hạn kích thước từ env (MB -> bytes)
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIMETYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

// Magic bytes signatures
const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4b, 0x03, 0x04], // PK.. (ZIP signature)
  txt: null, // Text files không có magic bytes cố định
};

/**
 * Validate magic bytes của file buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} expectedType - 'pdf', 'docx', hoặc 'txt'
 * @returns {boolean}
 */
function validateMagicBytes(buffer, expectedType) {
  // TXT files không cần validate magic bytes
  if (expectedType === 'txt') return true;

  const magicBytes = MAGIC_BYTES[expectedType];
  if (!magicBytes) return false;

  // Kiểm tra các byte đầu tiên
  for (let i = 0; i < magicBytes.length; i++) {
    if (buffer[i] !== magicBytes[i]) {
      return false;
    }
  }

  return true;
}

/**
 * File filter cho multer - validate MIME type và sanitize filename
 */
const fileFilter = (req, file, cb) => {
  // Sanitize filename trước khi xử lý
  file.originalname = sanitizeFilename(file.originalname);

  // Kiểm tra MIME type
  if (!ALLOWED_MIMETYPES[file.mimetype]) {
    return cb(
      new Error('File type not allowed. Only PDF, DOCX, and TXT files are accepted.'),
      false
    );
  }

  // Kiểm tra file extension match với MIME type
  const fileExt = file.originalname.split('.').pop().toLowerCase();
  const expectedExt = ALLOWED_MIMETYPES[file.mimetype];

  if (fileExt !== expectedExt) {
    return cb(
      new Error(`File extension .${fileExt} does not match MIME type ${file.mimetype}`),
      false
    );
  }

  cb(null, true);
};

/**
 * Middleware để validate magic bytes sau khi upload
 * Dùng trong route handler
 */
const validateFileContent = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
    });
  }

  const fileType = ALLOWED_MIMETYPES[req.file.mimetype];
  const buffer = req.file.buffer;

  // Validate magic bytes
  if (!validateMagicBytes(buffer, fileType)) {
    return res.status(400).json({
      success: false,
      error: `File content does not match declared type. Expected ${fileType} file.`,
    });
  }

  next();
};

/**
 * Multer configuration với memory storage
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

/**
 * Error handler cho multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit of ${process.env.MAX_FILE_SIZE_MB || 10}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  next();
};

module.exports = {
  upload,
  validateFileContent,
  handleUploadError,
  validateMagicBytes, // Export cho testing
};
