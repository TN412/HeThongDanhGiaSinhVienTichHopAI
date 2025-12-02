# Assignment Generation API

## Overview

API endpoint để tạo bài tập tự động từ tài liệu sử dụng OpenAI. Giảng viên upload PDF/DOCX/TXT và AI tự động generate câu hỏi.

## Endpoint

### POST /api/assignment/generate

Generate assignment từ uploaded document.

**Authentication:** Required (Instructor only)

**Content-Type:** `multipart/form-data`

**Request:**

| Field           | Type   | Required | Description                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `document`      | File   | ✅       | PDF, DOCX, or TXT file                       |
| `questionType`  | String | ✅       | `'multiple-choice'`, `'essay'`, or `'mixed'` |
| `questionCount` | Number | ✅       | 1-20 questions                               |
| `difficulty`    | String | ✅       | `'easy'`, `'medium'`, or `'hard'`            |

**Example Request (curl):**

```bash
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN" \
  -F "document=@path/to/document.pdf" \
  -F "questionType=multiple-choice" \
  -F "questionCount=5" \
  -F "difficulty=medium"
```

**Success Response (201):**

```json
{
  "success": true,
  "assignmentId": "507f1f77bcf86cd799439011",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "What is the capital of France?",
      "options": ["A. London", "B. Paris", "C. Berlin", "D. Madrid"],
      "correctAnswer": "B",
      "explanation": "Paris is the capital city of France",
      "points": 10,
      "difficulty": "medium"
    }
  ],
  "meta": {
    "sourceFile": "document.pdf",
    "wordCount": 1500,
    "questionCount": 5,
    "totalPoints": 50,
    "blobUrl": "https://storage.blob.core.windows.net/..."
  }
}
```

**Error Responses:**

#### 400 Bad Request - Invalid Input

```json
{
  "success": false,
  "error": "questionType must be 'multiple-choice', 'essay', or 'mixed'"
}
```

```json
{
  "success": false,
  "error": "Document too short. Need at least 100 words, got 50",
  "wordCount": 50
}
```

#### 422 Unprocessable Entity - AI Response Parse Error

```json
{
  "success": false,
  "error": "Failed to parse AI-generated questions",
  "details": "Question 1 missing required fields (type, question)",
  "aiResponse": "partial AI response for debugging..."
}
```

#### 500 Internal Server Error - OpenAI API Error

```json
{
  "success": false,
  "error": "OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
}
```

#### 503 Service Unavailable - OpenAI Quota Exceeded

```json
{
  "success": false,
  "error": "OpenAI API quota exceeded. Please try again later."
}
```

## Flow Diagram

```
1. Upload Document (PDF/DOCX/TXT)
        ↓
2. Extract Text
        ↓
3. Validate Text (min 100 words)
        ↓
4. Upload to Azure Blob Storage
        ↓
5. Truncate Text (max 6000 words)
        ↓
6. Build OpenAI Prompt
        ↓
7. Call OpenAI API (GPT-4)
        ↓
8. Parse AI Response (JSON)
        ↓
9. Validate Questions Structure
        ↓
10. Create Assignment (status='draft')
        ↓
11. Return Assignment ID & Questions
```

## OpenAI Prompt Templates

### Multiple-Choice Prompt

```
Based on the following document, generate 5 medium-level multiple-choice questions.

For each question, provide:
- The question text
- 4 options (labeled A, B, C, D)
- The correct answer (must be one of A, B, C, D)
- Brief explanation of why the answer is correct
- Points value (easy=5, medium=10, hard=15)

Format your response as a valid JSON array.

Document:
[extracted text here...]

Return your response as a JSON array of question objects.
```

### Essay Prompt

```
Based on the following document, generate 3 medium-level essay questions.

For each question, provide:
- The question text (open-ended, requiring detailed explanation)
- Rubric for grading (key points to look for)
- Estimated time to complete (in minutes)
- Points value (easy=10, medium=20, hard=30)

Format your response as a valid JSON array.

Document:
[extracted text here...]

Return your response as a JSON array of question objects.
```

## Question Structures

### Multiple-Choice Question

```javascript
{
  "type": "multiple-choice",
  "question": "What is TypeScript?",
  "options": [
    "A. A superset of JavaScript",
    "B. A framework",
    "C. A database",
    "D. An editor"
  ],
  "correctAnswer": "A",
  "explanation": "TypeScript is a strongly typed superset of JavaScript",
  "points": 10,
  "difficulty": "medium"
}
```

**Validation Rules:**

- ✅ `type` must be `'multiple-choice'`
- ✅ `question` is required
- ✅ `options` must be array with at least 2 items
- ✅ `correctAnswer` must be single letter (A-D)
- ✅ `points` defaults to 10 if not specified

### Essay Question

```javascript
{
  "type": "essay",
  "question": "Explain the concept of object-oriented programming",
  "rubric": "Key points: 1) Definition, 2) Encapsulation, 3) Inheritance, 4) Polymorphism",
  "estimatedTime": 20,
  "points": 25,
  "difficulty": "medium"
}
```

**Validation Rules:**

- ✅ `type` must be `'essay'`
- ✅ `question` is required
- ✅ `rubric` is required (grading criteria)
- ✅ `estimatedTime` defaults to 15 minutes
- ✅ `points` defaults to 20 if not specified

## Parse Logic

### `parseAIQuestions(aiResponse, questionType)`

Robust parsing với error handling:

1. **Remove Markdown Blocks**

   ````javascript
   // AI might return: ```json [...] ```
   // Remove: ``` or ```json wrappers
   ````

2. **Parse JSON**

   ```javascript
   const questions = JSON.parse(cleaned);
   ```

3. **Validate Array**

   ```javascript
   if (!Array.isArray(questions)) {
     throw new Error('AI response is not an array');
   }
   ```

4. **Validate Each Question**
   - Check required fields
   - Normalize `correctAnswer` to uppercase
   - Validate option count
   - Set default values

5. **Return Validated Questions**

### Error Messages

| Error          | HTTP Code | Message                                                                 |
| -------------- | --------- | ----------------------------------------------------------------------- |
| Invalid JSON   | 422       | `Failed to parse AI response as JSON: ...`                              |
| Not Array      | 422       | `AI response is not an array`                                           |
| Empty Array    | 422       | `AI returned empty questions array`                                     |
| Missing Fields | 422       | `Question 1 missing required fields (type, question)`                   |
| Invalid Answer | 422       | `Question 1: correctAnswer must be a single letter (A-D)`               |
| Invalid Type   | 422       | `Question 1: invalid type 'xyz' (must be 'multiple-choice' or 'essay')` |

## Assignment Model

Created assignment has following structure:

```javascript
{
  instructorId: ObjectId, // From auth token
  title: "Assignment from document.pdf",
  description: "Auto-generated from document with 1500 words",
  sourceDocument: {
    filename: "document.pdf",
    blobUrl: "https://storage.blob.core.windows.net/...",
    extractedText: "full text content..."
  },
  questionType: "multiple-choice",
  questions: [...], // Parsed questions
  status: "draft", // Can be published later
  settings: {
    allowAI: true,
    allowMultipleDrafts: true,
    timeLimit: null,
    maxAttempts: 1
  },
  generatedAt: Date,
  totalPoints: 50 // Computed from questions
}
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo

# Optional (for blob storage)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=...
AZURE_STORAGE_CONTAINER=assignments

# Document Processing
MAX_FILE_SIZE_MB=10
```

## Testing

### Unit Tests

```bash
npm test -- assignment.test.js
```

**Coverage:** 22 tests passed

- ✅ Parse valid JSON
- ✅ Handle markdown blocks
- ✅ Validate structures
- ✅ Error handling
- ✅ Normalization

### Demo Script

```bash
node scripts/demo-assignment-generation.js
```

Shows:

- ✅ Valid parsing
- ✅ Markdown removal
- ✅ Error handling
- ✅ Response structures

### Manual Testing

```bash
# 1. Create test document
echo "Sample text about programming..." > test.txt

# 2. Get instructor token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@test.com", "password": "password123"}'

# 3. Generate assignment
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.txt" \
  -F "questionType=multiple-choice" \
  -F "questionCount=3" \
  -F "difficulty=easy"
```

## Common Issues

### ❌ OpenAI API Key Not Set

**Error:**

```json
{
  "success": false,
  "error": "OpenAI API is not configured"
}
```

**Fix:** Add `OPENAI_API_KEY` to `.env`

### ❌ Document Too Short

**Error:**

```json
{
  "success": false,
  "error": "Document too short. Need at least 100 words, got 50"
}
```

**Fix:** Upload longer document (min 100 words)

### ❌ AI Returns Invalid JSON

**Error (422):**

```json
{
  "success": false,
  "error": "Failed to parse AI-generated questions",
  "details": "Unexpected token..."
}
```

**Fix:**

- Check OpenAI model (GPT-4 recommended)
- Increase temperature (0.7 is balanced)
- Retry with different document

### ❌ Blob Upload Failed

**Warning in logs:** `Blob upload failed, continuing without`

**Fix:** Add Azure Storage connection string (optional)

### ❌ Quota Exceeded

**Error (503):**

```json
{
  "success": false,
  "error": "OpenAI API quota exceeded"
}
```

**Fix:**

- Wait for quota reset
- Upgrade OpenAI plan
- Use different API key

## Performance

| Operation       | Time   | Notes            |
| --------------- | ------ | ---------------- |
| File Upload     | ~100ms | Memory storage   |
| Text Extraction | ~500ms | PDF parsing      |
| Blob Upload     | ~1s    | Azure Storage    |
| OpenAI API      | ~5-10s | Depends on model |
| Total           | ~7-12s | End-to-end       |

## Security

✅ **Authentication:** Only instructors can generate  
✅ **File Validation:** MIME type + magic bytes  
✅ **Size Limits:** Configurable via env  
✅ **Blob Isolation:** Files organized by userId  
✅ **Text Sanitization:** Remove special characters

## Next Steps

1. ✅ Assignment generation complete
2. ⏭️ Assignment CRUD endpoints (GET, PUT, DELETE)
3. ⏭️ Publish assignment endpoint
4. ⏭️ Submission workflow
5. ⏭️ Frontend UI for generation

## API Documentation

For complete API docs, see: `docs/api.md`

---

**Version:** 1.0.0  
**Last Updated:** November 6, 2025
