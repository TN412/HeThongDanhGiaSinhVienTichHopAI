# Document Upload Module - Quick Reference

## 🚀 Quick Start

### 1. Import Modules

```javascript
const { upload, validateFileContent, handleUploadError } = require('./middleware/upload');
const { extractText, validateExtractedText, truncateForAI } = require('./utils/documentParser');
const { uploadToBlob } = require('./utils/blob');
```

### 2. Create Upload Route

```javascript
router.post(
  '/upload',
  auth.instructor,
  upload.single('document'),
  validateFileContent,
  async (req, res) => {
    const { text, meta } = await extractText(req.file);
    const blobUrl = await uploadToBlob(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.user.id
    );
    res.json({ text, meta, blobUrl });
  },
  handleUploadError
);
```

### 3. Test Upload

```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@path/to/file.pdf"
```

## 📋 API Reference

### Upload Middleware

| Function                 | Purpose              | Usage                       |
| ------------------------ | -------------------- | --------------------------- |
| `upload.single('field')` | Accept single file   | `upload.single('document')` |
| `validateFileContent`    | Validate magic bytes | Use after upload            |
| `handleUploadError`      | Error handler        | Use at end of chain         |

### Document Parser

| Function                           | Input          | Output                       | Purpose           |
| ---------------------------------- | -------------- | ---------------------------- | ----------------- |
| `extractText(file)`                | File object    | `{text, meta}`               | Extract text      |
| `validateExtractedText(text, min)` | String, Number | `{valid, wordCount, error?}` | Validate length   |
| `truncateForAI(text, max)`         | String, Number | String                       | Truncate text     |
| `cleanText(text)`                  | String         | String                       | Remove whitespace |

### Azure Blob Storage

| Function                                       | Purpose      | Returns  |
| ---------------------------------------------- | ------------ | -------- |
| `uploadToBlob(buffer, filename, type, userId)` | Upload file  | Blob URL |
| `deleteBlob(url)`                              | Delete file  | Boolean  |
| `isBlobStorageConfigured()`                    | Check config | Boolean  |
| `getBlobMetadata(url)`                         | Get info     | Object   |

## 🔧 Environment Variables

```bash
MAX_FILE_SIZE_MB=10
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=assignments
```

## ✅ Supported File Types

| Type | MIME Type                                              | Magic Bytes | Extension |
| ---- | ------------------------------------------------------ | ----------- | --------- |
| PDF  | `application/pdf`                                      | `%PDF`      | `.pdf`    |
| DOCX | `application/vnd...document.wordprocessingml.document` | `PK..`      | `.docx`   |
| TXT  | `text/plain`                                           | None        | `.txt`    |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run demo
node scripts/demo-upload.js
```

## 📊 Test Coverage

- **31 tests** passed
- **documentParser.js**: 85.71% coverage
- **upload.js**: 52.77% coverage

## 🔐 Security Features

✅ Magic bytes validation  
✅ MIME type checking  
✅ File size limits  
✅ Memory storage (no temp files)  
✅ Sanitized filenames  
✅ User isolation in blob storage

## 📁 File Structure

```
backend/
├── src/
│   ├── middleware/
│   │   └── upload.js
│   └── utils/
│       ├── documentParser.js
│       ├── blob.js
│       └── index.js
├── tests/
│   ├── documentParser.test.js
│   └── upload.test.js
└── scripts/
    └── demo-upload.js
```

## 🐛 Common Errors

### File Size Error

```json
{
  "success": false,
  "error": "File size exceeds limit of 10MB"
}
```

**Fix**: Reduce file size or increase `MAX_FILE_SIZE_MB`

### Invalid File Type

```json
{
  "success": false,
  "error": "File type not allowed"
}
```

**Fix**: Only upload PDF, DOCX, or TXT files

### Magic Bytes Mismatch

```json
{
  "success": false,
  "error": "File content does not match declared type"
}
```

**Fix**: File may be corrupted or renamed incorrectly

### Document Too Short

```json
{
  "valid": false,
  "error": "Document too short. Need at least 100 words, got 50"
}
```

**Fix**: Upload a longer document (min 100 words)

### Azure Storage Not Configured

```
Error: AZURE_STORAGE_CONNECTION_STRING not found
```

**Fix**: Add connection string to `.env`

## 💡 Tips

1. **Always validate extracted text** before sending to OpenAI
2. **Truncate long documents** to fit token limits
3. **Clean text** before processing
4. **Store blob URL** in database for future reference
5. **Use user ID** in blob path for organization
6. **Handle errors gracefully** with proper status codes

## 🔗 Integration Example

```javascript
// Complete flow: Upload → Extract → Validate → Store → Generate Questions

router.post(
  '/assignment/generate',
  auth.instructor,
  upload.single('document'),
  validateFileContent,
  async (req, res) => {
    try {
      // 1. Extract
      const { text, meta } = await extractText(req.file);

      // 2. Validate
      const validation = validateExtractedText(text, 100);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // 3. Store
      const blobUrl = await uploadToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.id
      );

      // 4. Truncate
      const truncated = truncateForAI(text, 6000);

      // 5. Generate questions with OpenAI
      const questions = await generateQuestions(truncated);

      // 6. Save assignment
      const assignment = await Assignment.create({
        instructorId: req.user.id,
        sourceDocument: {
          filename: meta.filename,
          blobUrl: blobUrl,
          extractedText: text,
        },
        questions: questions,
        // ... other fields
      });

      res.json({ success: true, assignment });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  handleUploadError
);
```

## 📚 Next Steps

1. ✅ Upload module complete
2. ⏭️ Integrate OpenAI for question generation
3. ⏭️ Create assignment routes
4. ⏭️ Build frontend upload UI
5. ⏭️ Add OCR for scanned documents (optional)

---

**Documentation**: See `DOCUMENT_UPLOAD_README.md` for full details  
**Tests**: Run `npm test` to verify  
**Demo**: Run `node scripts/demo-upload.js`
