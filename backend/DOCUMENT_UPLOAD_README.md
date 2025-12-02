# Document Upload & Processing Module

## Tổng Quan

Module xử lý upload và parse tài liệu (PDF, DOCX, TXT) cho hệ thống AI Assessment.

## Cấu Trúc

```
backend/
├── src/
│   ├── middleware/
│   │   └── upload.js          # Multer config + validation
│   └── utils/
│       ├── documentParser.js  # Text extraction
│       ├── blob.js           # Azure Blob Storage
│       └── index.js          # Exports
└── tests/
    ├── documentParser.test.js # Unit tests
    └── upload.test.js        # Unit tests
```

## Features

### 1. Upload Middleware (`middleware/upload.js`)

✅ **Memory Storage** - Không lưu file tạm  
✅ **File Size Limit** - Giới hạn từ `MAX_FILE_SIZE_MB` env  
✅ **MIME Type Validation** - Chỉ nhận PDF/DOCX/TXT  
✅ **Magic Bytes Validation** - Kiểm tra file signature để tránh fake files

**Supported Files:**

- PDF: `application/pdf` (magic bytes: `%PDF`)
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (magic bytes: `PK..`)
- TXT: `text/plain`

**Usage:**

```javascript
const { upload, validateFileContent, handleUploadError } = require('./middleware/upload');

router.post(
  '/upload',
  upload.single('document'),
  validateFileContent,
  async (req, res) => {
    // req.file.buffer contains file data
    console.log('File uploaded:', req.file.originalname);
  },
  handleUploadError
);
```

### 2. Document Parser (`utils/documentParser.js`)

#### `extractText(file)`

Extract text từ file buffer.

**Input:**

```javascript
{
  buffer: Buffer,
  mimetype: string,
  originalname: string
}
```

**Output:**

```javascript
{
  text: string,
  meta: {
    filename: string,
    type: 'pdf' | 'docx' | 'txt',
    wordCount: number,
    pages?: number,        // PDF only
    info?: object,         // PDF metadata
    messages?: array,      // DOCX warnings
    encoding?: string      // TXT only
  }
}
```

**Example:**

```javascript
const { extractText } = require('./utils/documentParser');

const result = await extractText(req.file);
console.log('Text:', result.text);
console.log('Words:', result.meta.wordCount);
console.log('Type:', result.meta.type);
```

#### `validateExtractedText(text, minWords = 100)`

Validate text có đủ nội dung không.

```javascript
const validation = validateExtractedText(text, 100);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

#### `truncateForAI(text, maxWords = 6000)`

Truncate text để fit OpenAI token limits (~8000 tokens).

```javascript
const truncated = truncateForAI(extractedText, 6000);
```

#### `cleanText(text)`

Clean text: remove excessive whitespace, special characters.

```javascript
const cleaned = cleanText(rawText);
```

### 3. Azure Blob Storage (`utils/blob.js`)

#### `uploadToBlob(buffer, filename, contentType, userId)`

Upload file lên Azure Blob Storage.

**Returns:** `blobUrl` (public URL)

**Example:**

```javascript
const { uploadToBlob } = require('./utils/blob');

const blobUrl = await uploadToBlob(
  req.file.buffer,
  req.file.originalname,
  req.file.mimetype,
  req.user.id
);

console.log('File uploaded to:', blobUrl);
```

**Blob Structure:**

```
/assignments (container)
  /user-id-1
    /1699123456789_document.pdf
    /1699123457890_syllabus.docx
  /user-id-2
    /1699123458901_notes.txt
```

#### Other Functions:

- `deleteBlob(blobUrl)` - Delete blob
- `isBlobStorageConfigured()` - Check if configured
- `getBlobMetadata(blobUrl)` - Get blob info

## Environment Variables

```bash
# File Upload
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,docx,txt

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER=assignments
```

## Complete Upload Flow

```javascript
const { upload, validateFileContent, handleUploadError } = require('../middleware/upload');
const { extractText, validateExtractedText, truncateForAI } = require('../utils/documentParser');
const { uploadToBlob } = require('../utils/blob');

router.post(
  '/assignment/generate',
  auth.instructor,
  upload.single('document'),
  validateFileContent,
  async (req, res) => {
    try {
      // 1. Extract text
      const { text, meta } = await extractText(req.file);
      console.log(`Extracted ${meta.wordCount} words from ${meta.type}`);

      // 2. Validate text
      const validation = validateExtractedText(text, 100);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // 3. Upload to Azure Blob
      const blobUrl = await uploadToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.id
      );

      // 4. Truncate for AI processing
      const truncatedText = truncateForAI(text, 6000);

      // 5. Send to OpenAI for question generation
      // ... (OpenAI logic here)

      res.json({
        success: true,
        filename: meta.filename,
        wordCount: meta.wordCount,
        blobUrl: blobUrl,
        message: 'Document processed successfully',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  handleUploadError
);
```

## Testing

### Run Tests

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode
```

### Test Results

```
✅ 31 tests passed
✅ documentParser.test.js - 25 tests
✅ upload.test.js - 6 tests
✅ 85.71% coverage for documentParser.js
```

### Test Files

- `tests/documentParser.test.js` - Text extraction tests
- `tests/upload.test.js` - Magic bytes validation tests

## Dependencies

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "@azure/storage-blob": "^12.17.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

## Error Handling

### Upload Errors

```javascript
// File size exceeded
{
  success: false,
  error: "File size exceeds limit of 10MB"
}

// Invalid file type
{
  success: false,
  error: "File type not allowed. Only PDF, DOCX, and TXT files are accepted."
}

// Magic bytes mismatch
{
  success: false,
  error: "File content does not match declared type. Expected pdf file."
}
```

### Extraction Errors

```javascript
// Empty document
{
  valid: false,
  wordCount: 0,
  error: "Document is empty"
}

// Too short
{
  valid: false,
  wordCount: 50,
  error: "Document too short. Need at least 100 words, got 50"
}
```

### Blob Storage Errors

```javascript
// Missing connection string
Error: 'AZURE_STORAGE_CONNECTION_STRING not found in environment variables';

// Upload failed
Error: 'Failed to upload to Azure Blob: <reason>';
```

## Security Notes

1. ✅ **Magic Bytes Validation** - Prevents file type spoofing
2. ✅ **Memory Storage** - No temporary files on disk
3. ✅ **File Size Limits** - Prevents DoS attacks
4. ✅ **MIME Type Validation** - Double-check with magic bytes
5. ✅ **Sanitized Filenames** - Remove special characters
6. ✅ **User Isolation** - Files organized by userId

## Next Steps

1. Integrate with OpenAI for question generation
2. Add assignment creation routes
3. Implement document versioning
4. Add virus scanning (optional)
5. Add OCR for scanned PDFs (Azure Document Intelligence)

## License

ISC
