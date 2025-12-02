# AI Chat Module - Complete Documentation

## Overview

Real-time AI tutoring system that allows students to ask questions while working on assignments. All interactions are logged for AI Skill Score calculation.

## API Endpoints

### 1. **POST /api/ai/chat**

Send a message to AI tutor during assignment

**Authentication:** Required (Student only)

**Request Body:**

```json
{
  "prompt": "Can you explain what a closure is in simple terms?",
  "submissionId": "673abc123def456789012345",
  "questionId": "q1", // Optional - specific question being asked about
  "context": "I think a closure is a function that returns another function" // Optional
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "A closure is a function that has access to variables in its outer scope, even after the outer function has finished executing. While your understanding is partially correct...",
  "tokensUsed": 150,
  "suggestedActions": [
    "Try applying this concept to the question",
    "Write down your reasoning step by step",
    "Try creating your own example"
  ],
  "metadata": {
    "promptType": "clarification",
    "contextProvided": true,
    "responseTime": "850ms",
    "rateLimitRemaining": 45
  }
}
```

**Error Responses:**

- `400`: Invalid prompt (empty, too long, missing submissionId)
- `403`: AI not allowed for this assignment OR submission already submitted
- `404`: Submission or assignment not found
- `429`: Rate limit exceeded
- `500`: OpenAI API error or server error

---

### 2. **GET /api/ai/stats**

Get AI usage statistics for a submission

**Authentication:** Required (Student owner OR Instructor)

**Query Parameters:**

- `submissionId` (required): Submission ID to get stats for

**Response (200):**

```json
{
  "success": true,
  "stats": {
    "totalPrompts": 12,
    "totalTokens": 3450,
    "avgPromptLength": 42,
    "avgResponseTime": 750,
    "contextProvidedRate": "66.7",
    "promptTypes": {
      "question": 7,
      "hint": 2,
      "clarification": 2,
      "confirmation": 1
    },
    "questionsWithAI": 5,
    "uniquePrompts": 10
  }
}
```

---

## Features

### 1. **Context-Aware AI Tutoring**

**System Prompt (Socratic Teaching):**

```
You are a helpful tutor assisting a student with their assignment.
Your role is to guide the student's learning without giving direct answers.

Guidelines:
- Ask guiding questions to help the student think through the problem
- Provide hints and examples, but don't solve the problem directly
- Encourage the student to explain their reasoning
- If the student is stuck, break down the problem into smaller steps
- Be encouraging and supportive
- Keep responses concise (2-3 sentences unless more detail is needed)
```

**Question Context (if `questionId` provided):**

```
Current Question Context:
Question: "What is the output of: console.log(typeof null)?"
Options: null, undefined, object, number

Remember: Guide the student to find the answer themselves.
Don't give away the correct answer directly.
```

**Student Context (if `context` provided):**

```
Context: I think the answer is 'null' because that's what it is
Question: Am I correct?
```

---

### 2. **Prompt Classification**

AI automatically classifies prompts into 4 types for analytics:

**Classification Logic (Priority Order):**

1. **`hint`** (highest priority)
   - Contains: "hint", "clue", "gợi ý", "give me a"
   - Starts with: "help"
   - Example: "Can you give me a hint?"

2. **`confirmation`**
   - Contains: "is this correct", "am i right", "đúng không", "correct?", "right?"
   - Example: "My answer is X, is this correct?"

3. **`clarification`**
   - Contains: "mean" (not starting with "what"), "clarify", "explain" (not starting with "what"), "giải thích"
   - Special: "what do you mean"
   - Example: "Can you clarify this?"

4. **`question`** (default/lowest priority)
   - Contains: "?"
   - Starts with: "what", "how", "why", "when", "where", "can you", "could you"
   - Example: "What is a closure?"

**Why Priority Matters:**

```
"Can you give me a hint about this?"
→ Matches both "can you" (question) AND "hint" (hint)
→ Returns "hint" (higher priority)
```

---

### 3. **Smart Suggestion Generation**

**Suggestions Based on Prompt Type:**

| Prompt Type     | Suggested Actions                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `question`      | • Try applying this concept to the question<br>• Write down your reasoning step by step           |
| `hint`          | • Think about how this hint applies to your answer<br>• Take a moment to work through it yourself |
| `confirmation`  | • Test your answer with different examples<br>• Explain why you think your answer is correct      |
| `clarification` | • Rephrase the concept in your own words<br>• Look for examples in the course materials           |

**Context-Based Suggestions:**

- **Response contains "example"** → "Try creating your own example"
- **Response contains "?"** → "Answer the guiding questions I asked"
- **Response contains "step"/"first"/"next"** → "Follow the steps one at a time"
- **Prompt < 20 chars** → "💡 Tip: More detailed questions get better responses"
- **No "?" in prompt** → "💡 Tip: Try asking specific questions"

**Limit:** Maximum 4 suggestions returned

---

### 4. **Rate Limiting**

**Configuration:**

```javascript
const RATE_LIMIT_CONFIG = {
  maxPromptsPerSubmission: 50, // Total prompts for entire submission
  maxPromptsPerQuestion: 10, // Prompts per individual question
  windowMinutes: 60, // Rolling window
};
```

**Environment Variables:**

```bash
MAX_AI_PROMPTS_PER_SUBMISSION=50  # Default: 50
MAX_AI_PROMPTS_PER_QUESTION=10    # Default: 10
```

**Why Rate Limiting?**

- Prevents cost explosion (OpenAI API charges per token)
- Encourages independent thinking
- Prevents brute-force "give me the answer" attempts

**Rate Limit Response (429):**

```json
{
  "success": false,
  "error": "Rate limit exceeded: Maximum 50 AI prompts per submission",
  "rateLimitInfo": {
    "maxPrompts": 50,
    "usedPrompts": 50,
    "windowMinutes": 60
  }
}
```

---

### 5. **Token Usage Tracking**

**Tracked Metrics:**

```javascript
{
  promptTokens: 150,        // Tokens in student's prompt + system prompt
  completionTokens: 200,    // Tokens in AI's response
  responseTime: 850         // Milliseconds to get response
}
```

**Response Includes:**

```json
{
  "tokensUsed": 350, // Total: 150 + 200
  "metadata": {
    "responseTime": "850ms"
  }
}
```

**Cost Estimation (GPT-4 pricing):**

```
Input:  $0.03 / 1K tokens
Output: $0.06 / 1K tokens

Example (150 input + 200 output):
= (150 * 0.03/1000) + (200 * 0.06/1000)
= $0.0045 + $0.012
= $0.0165 per interaction

50 prompts/submission * $0.0165 = $0.825 per student
```

---

### 6. **AI Interaction Logging**

**CRITICAL:** All interactions are logged **BEFORE** returning response to student.

**AI_Log Schema:**

```javascript
{
  submissionId: ObjectId,
  assignmentId: ObjectId,
  studentId: ObjectId,
  questionId: ObjectId,        // Optional
  prompt: String,              // Student's question
  response: String,            // AI's answer
  promptType: String,          // 'question', 'hint', 'confirmation', 'clarification'
  contextProvided: Boolean,    // Did student provide context?
  timestamp: Date,
  promptTokens: Number,
  completionTokens: Number,
  responseTime: Number         // Milliseconds
}
```

**Used For:**

- AI Skill Score calculation (40% prompt quality + 30% independence + 30% iteration)
- Instructor analytics dashboard
- Student progress tracking
- Cost tracking

---

### 7. **Auto-Increment Interaction Count**

**When `questionId` is provided:**

```javascript
await AssignmentSubmission.updateOne(
  { _id: submissionId, 'answers.questionId': questionId },
  { $inc: { 'answers.$.aiInteractionCount': 1 } }
);
```

**Submission Answer Schema:**

```javascript
{
  questionId: ObjectId,
  answer: String,
  aiInteractionCount: 5,  // ← Incremented automatically
  timeSpent: 120
}
```

**Used For:**

- Dashboard analytics (which questions need AI help most?)
- AI Skill Score (independence factor)
- Identifying struggling students

---

## Security & Validation

### Input Validation

✅ **Prompt:**

- Required, non-empty string
- Max 2000 characters
- No special validation (students can type anything)

✅ **submissionId:**

- Required
- Must exist in database
- Student must be owner
- Status must be 'draft' (not 'submitted' or 'graded')

✅ **questionId:**

- Optional
- If provided, must exist in assignment

✅ **context:**

- Optional
- Trimmed of whitespace

### Access Control

✅ **POST /api/ai/chat:**

- Student authentication required (`auth.student`)
- Must own the submission
- Submission status must be 'draft'
- Assignment must have `allowAI: true`

✅ **GET /api/ai/stats:**

- Student (owner) OR instructor
- Validates submission exists

### Assignment Validation

✅ **Check `assignment.allowAI`:**

```javascript
if (!assignment.allowAI) {
  return res.status(403).json({
    error: 'AI assistance is not allowed for this assignment',
  });
}
```

---

## OpenAI Integration

### Configuration

**Model:** GPT-4 (or `OPENAI_MODEL` from env)
**Temperature:** 0.7 (creative but consistent)
**Max Tokens:** 500 (controls response length)

**Environment Variables:**

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4  # Optional, defaults to gpt-4
```

### API Call

```javascript
const aiResponse = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 500,
});
```

### Error Handling

```javascript
try {
  aiResponse = await openai.chat.completions.create(...)
} catch (openaiError) {
  console.error('OpenAI API Error:', openaiError);
  return res.status(500).json({
    success: false,
    error: 'Failed to get AI response. Please try again.',
    details: process.env.NODE_ENV === 'development' ? openaiError.message : undefined
  });
}
```

---

## Testing

### Run Tests:

```bash
cd backend
npm test -- ai.test.js
```

### Test Coverage (47 tests):

- ✅ `classifyPromptType` function (8 tests)
- ✅ `generateSuggestions` function (8 tests)
- ✅ Rate limiting logic (5 tests)
- ✅ System prompt construction (5 tests)
- ✅ Input validation (5 tests)
- ✅ Access control (4 tests)
- ✅ Token usage tracking (2 tests)
- ✅ AI interaction count update (2 tests)
- ✅ Statistics calculation (6 tests)
- ✅ Edge cases (2 tests)

---

## Integration with Other Modules

### Submission Module:

```javascript
// During assignment work
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userInput,
    submissionId: currentSubmission._id,
    questionId: currentQuestion._id,
    context: currentAnswer,
  }),
});

// When submitting
const logs = await AI_Log.find({ submissionId });
const aiSkillScore = calculateAISkillScore(logs, submission);
```

### Assignment Module:

```javascript
// Check if AI is allowed
if (assignment.allowAI) {
  // Show AI chat button in UI
} else {
  // Hide AI chat features
}
```

---

## Usage Examples

### Example 1: Student asks a direct question

```javascript
POST /api/ai/chat
{
  "prompt": "What is the difference between let and var?",
  "submissionId": "abc123",
  "questionId": "q1"
}

Response:
{
  "message": "Great question! Both let and var are used to declare variables in JavaScript. Can you think about when you might want to use one over the other? Consider their scope...",
  "tokensUsed": 120,
  "suggestedActions": [
    "Try applying this concept to the question",
    "Write down your reasoning step by step",
    "Answer the guiding questions I asked"
  ]
}
```

### Example 2: Student requests a hint

```javascript
POST /api/ai/chat
{
  "prompt": "Can you give me a hint?",
  "submissionId": "abc123",
  "questionId": "q2"
}

Response:
{
  "message": "Think about what happens when you declare a variable with var inside a function versus inside a block...",
  "tokensUsed": 85,
  "suggestedActions": [
    "Think about how this hint applies to your answer",
    "Take a moment to work through it yourself"
  ]
}
```

### Example 3: Student provides context

```javascript
POST /api/ai/chat
{
  "prompt": "Is this correct?",
  "submissionId": "abc123",
  "questionId": "q3",
  "context": "I think var is function-scoped and let is block-scoped"
}

Response:
{
  "message": "You're on the right track! That's exactly correct. Can you explain why this difference matters in practice?",
  "tokensUsed": 95,
  "suggestedActions": [
    "Test your answer with different examples",
    "Explain why you think your answer is correct"
  ]
}
```

---

## Common Issues & Solutions

### Issue 1: "AI service is not configured"

**Cause:** `OPENAI_API_KEY` not set in `.env`  
**Solution:**

```bash
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

### Issue 2: Rate limit exceeded too quickly

**Cause:** Student clicking "Ask AI" repeatedly  
**Solution:** Increase limits or add client-side debouncing

```bash
# .env
MAX_AI_PROMPTS_PER_SUBMISSION=100
MAX_AI_PROMPTS_PER_QUESTION=20
```

### Issue 3: AI giving direct answers

**Cause:** System prompt not strict enough  
**Solution:** Modify system prompt in `ai.js`:

```javascript
systemPrompt += `\n\nIMPORTANT: Never give the direct answer. Always guide with questions.`;
```

### Issue 4: High OpenAI costs

**Cause:** Too many tokens per response  
**Solution:** Reduce `max_tokens` in API call

```javascript
max_tokens: 300,  // Instead of 500
```

---

## Environment Variables

Required in `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4                # Optional, default: gpt-4

# Rate Limiting
MAX_AI_PROMPTS_PER_SUBMISSION=50  # Optional, default: 50
MAX_AI_PROMPTS_PER_QUESTION=10    # Optional, default: 10
```

---

## File Structure

```
backend/
├── src/
│   └── routes/
│       ├── ai.js             (605 lines - Main implementation)
│       └── index.js          (Updated with AI routes)
├── tests/
│   └── ai.test.js            (587 lines - 47 tests)
└── models/
    └── AI_Log.js             (Referenced)
```

---

## Quick Reference

**Send AI chat:** `POST /api/ai/chat { prompt, submissionId, questionId?, context? }`  
**Get AI stats:** `GET /api/ai/stats?submissionId=...`

**Rate limits:** 50/submission, 10/question, 60min window  
**Prompt types:** question, hint, confirmation, clarification  
**Max prompt length:** 2000 characters  
**Max response tokens:** 500

**Logging:** All interactions saved to `AI_Log` collection  
**Scoring:** Logs used for AI Skill Score calculation

**Access:** Student (owner) only for chat, owner/instructor for stats  
**Validation:** submission status='draft', assignment.allowAI=true

---

**Status:** ✅ Complete (137/137 tests passing)  
**Last Updated:** November 6, 2025  
**Module Version:** 1.0.0
