# Assignment Generation API - Quick Reference

## Endpoint

```
POST /api/assignment/generate
```

**Auth:** Instructor only  
**Content-Type:** multipart/form-data

## Request

```bash
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN" \
  -F "document=@document.pdf" \
  -F "questionType=multiple-choice" \
  -F "questionCount=5" \
  -F "difficulty=medium"
```

## Parameters

| Field           | Type   | Values                              | Required |
| --------------- | ------ | ----------------------------------- | -------- |
| `document`      | File   | PDF/DOCX/TXT                        | ✅       |
| `questionType`  | String | `multiple-choice`, `essay`, `mixed` | ✅       |
| `questionCount` | Number | 1-20                                | ✅       |
| `difficulty`    | String | `easy`, `medium`, `hard`            | ✅       |

## Success Response (201)

```json
{
  "success": true,
  "assignmentId": "507f1f77bcf86cd799439011",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "What is...?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "B",
      "explanation": "...",
      "points": 10,
      "difficulty": "medium"
    }
  ],
  "meta": {
    "sourceFile": "document.pdf",
    "wordCount": 1500,
    "questionCount": 5,
    "totalPoints": 50,
    "blobUrl": "https://..."
  }
}
```

## Error Responses

### 400 - Invalid Input

```json
{
  "success": false,
  "error": "questionType must be 'multiple-choice', 'essay', or 'mixed'"
}
```

### 422 - Parse Error

```json
{
  "success": false,
  "error": "Failed to parse AI-generated questions",
  "details": "Question 1 missing required fields",
  "aiResponse": "partial response..."
}
```

### 500 - OpenAI Not Configured

```json
{
  "success": false,
  "error": "OpenAI API is not configured"
}
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=assignments
MAX_FILE_SIZE_MB=10
```

## Flow

```
Upload → Extract Text → Upload Blob → OpenAI → Parse → Save → Return
```

## Question Types

### Multiple-Choice

```javascript
{
  type: "multiple-choice",
  question: "...",
  options: ["A. ...", "B. ...", "C. ...", "D. ..."],
  correctAnswer: "B",
  explanation: "...",
  points: 10
}
```

### Essay

```javascript
{
  type: "essay",
  question: "...",
  rubric: "Key points: 1) ..., 2) ..., 3) ...",
  estimatedTime: 20,
  points: 25
}
```

## Testing

```bash
# Run tests
npm test

# Run demo
node scripts/demo-assignment-generation.js

# Manual test
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer $(cat token.txt)" \
  -F "document=@test.pdf" \
  -F "questionType=multiple-choice" \
  -F "questionCount=3" \
  -F "difficulty=easy"
```

## Common Issues

| Issue                 | Solution                               |
| --------------------- | -------------------------------------- |
| OpenAI not configured | Add `OPENAI_API_KEY` to `.env`         |
| Document too short    | Upload file with 100+ words            |
| Parse error (422)     | Check AI response format, retry        |
| Blob upload failed    | Add Azure connection string (optional) |
| Quota exceeded        | Wait or upgrade OpenAI plan            |

## Files

- `src/routes/assignment.js` - Main route
- `tests/assignment.test.js` - Unit tests
- `scripts/demo-assignment-generation.js` - Demo
- `ASSIGNMENT_GENERATION_README.md` - Full docs

## Next Steps

1. ✅ Generation complete
2. ⏭️ GET /api/assignment/:id
3. ⏭️ PUT /api/assignment/:id
4. ⏭️ POST /api/assignment/:id/publish
5. ⏭️ Frontend upload UI

---

**Version:** 1.0.0  
**Tests:** 53/53 passed ✅
