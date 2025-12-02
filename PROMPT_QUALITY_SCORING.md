# Prompt Quality Scoring & ML Training Pipeline

## Tổng Quan

Hệ thống **Prompt Quality Scoring** đánh giá chất lượng prompt của sinh viên theo thời gian thực và xây dựng dataset để train ML model trong tương lai.

### Các Tính Năng Chính

✅ **Real-time Prompt Scoring** - Heuristic-based scoring (0-100 điểm)  
✅ **Instant Feedback** - Gợi ý cải thiện prompt ngay khi sinh viên gõ  
✅ **Instructor Labeling** - Giảng viên label "good"/"bad" cho từng prompt  
✅ **Dataset Export** - Export CSV/JSON cho ML training  
✅ **ML Pipeline Ready** - Skeleton code sẵn sàng cho future ML model

---

## 🎯 Luồng Hoạt Động

### 1. Student Workflow (Sinh Viên)

```
Sinh viên gõ prompt → AI chat endpoint → scorePromptHeuristic()
    ↓
Tính điểm chất lượng (0-100) + Tạo feedback suggestions
    ↓
Response trả về kèm: { message, promptQuality: { score, level, feedback } }
    ↓
Frontend hiển thị:
  - Score badge (emoji + số điểm)
  - Feedback panel (có thể toggle on/off)
  - Tips để cải thiện prompt
```

**Ví dụ Feedback:**

- ❌ Prompt quá ngắn → "Hãy mô tả cụ thể vấn đề bạn gặp phải"
- 💡 Chưa có dấu hỏi → "Thêm '?' để làm rõ câu hỏi"
- ✅ Prompt xuất sắc → "Câu hỏi rõ ràng và có ngữ cảnh"

### 2. Instructor Workflow (Giảng Viên)

```
Giảng viên vào PromptLabelingInterface → Load logs chưa label
    ↓
Review từng prompt + AI response
    ↓
Click "✅ GOOD" hoặc "❌ BAD"
    ↓
POST /api/logs/:logId/label { quality: 'good'|'bad' }
    ↓
Log được lưu với instructorLabel: { quality, labeledBy, labeledAt }
    ↓
Khi đủ 100+ labeled samples → Export CSV cho ML training
```

**Tiêu chí Label:**

- **GOOD**: Prompt cụ thể, có context, hỏi về concept (không đòi đáp án)
- **BAD**: Prompt mơ hồ, thiếu context, hỏi trực tiếp đáp án

---

## 📊 Heuristic Scoring Algorithm

**File:** `backend/src/services/promptScoringService.js`

### Công Thức Tính Điểm

```javascript
Total Score = Length (20) + Specificity (30) + Context (25) + Question Quality (15) + Anti-patterns (10)
```

### Chi Tiết Từng Factor

#### 1. Length (20 điểm)

- `< 10 chars` → 0 điểm ("Quá ngắn")
- `20-200 chars` → 20 điểm (Ideal)
- `200-500 chars` → 15 điểm ("Hơi dài")
- `> 500 chars` → 10 điểm ("Quá dài, AI bị phân tâm")

#### 2. Specificity (30 điểm)

- `< 3 words` → 0 điểm + Warning
- `≥ 5 words + (? hoặc technical terms hoặc code)` → 30 điểm
- `≥ 5 words` → 20 điểm
- Else → 10 điểm

**Technical Terms Pattern:**

```regex
/\b(thuật toán|algorithm|function|class|variable|error|exception|syntax|logic|database|query|API|endpoint|authentication|authorization|validation|schema|model|controller|route|middleware)\b/i
```

#### 3. Context (25 điểm)

- `hasQuestionContext` (questionId provided) → +15 điểm
- `hasPreviousAttempt` (context trong request) → +10 điểm
- Else → Feedback: "AI sẽ hiểu rõ hơn nếu bạn đề cập câu hỏi"

#### 4. Question Quality (15 điểm)

- **Open-ended** (`what|how|why|when|where|which`) → 15 điểm
- **Closed** (`is|are|can|could|should`) → 10 điểm + Tip: "Câu hỏi mở tốt hơn Yes/No"
- No question mark → 5 điểm

#### 5. Anti-patterns (10 điểm)

- **Direct answer request**: `"answer|đáp án|tell me the answer"` → -10 điểm
- **Greeting only**: `"hello|hi|xin chào"` → -10 điểm
- **One-word**: < 15 chars, 1 word → -10 điểm
- **Do it for me**: `"do it for me|làm giúp tôi|write code for"` → -10 điểm
- **Too vague**: `"help|giúp tôi|I don't understand"` (standalone) → -10 điểm
- **Multiple questions**: ≥ 3 dấu hỏi → Warning: "Tách ra từng câu"

### Feature Extraction (24 Features)

**File:** `promptScoringService.js → extractFeatures()`

```javascript
{
  // Length features (4)
  charCount, wordCount, sentenceCount, avgWordLength,

  // Structural features (5)
  hasQuestionMark, hasExclamation, hasCodeBlock, hasInlineCode, hasNumbering,

  // Question type (3)
  isOpenQuestion, isClosedQuestion, isDirectRequest,

  // Semantic features (3)
  hasTechnicalTerms, hasProblemDescription, hasAttemptDescription,

  // Context features (3)
  hasQuestionContext, hasPreviousAttempt, previousPromptCount,

  // Anti-pattern features (6)
  isTooShort, isTooLong, isDirectAnswer, isGreeting, ...
}
```

---

## 🔌 API Endpoints

### 1. POST `/api/logs/:logId/label`

**Auth:** Instructor only  
**Body:**

```json
{
  "quality": "good" | "bad",
  "note": "Optional explanation (max 500 chars)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Prompt labeled successfully",
  "label": {
    "quality": "good",
    "labeledBy": "instructor_id",
    "labeledAt": "2024-11-13T10:30:00Z",
    "previousLabel": null
  }
}
```

### 2. PUT `/api/logs/:logId/label`

Update existing label (change mind)

### 3. DELETE `/api/logs/:logId/label`

Remove label from prompt

### 4. GET `/api/logs/assignment/:assignmentId`

**Query Params:**

- `labeled=true` - Chỉ lấy prompts đã label
- `labeled=false` - Chỉ lấy prompts chưa label

**Response:**

```json
{
  "success": true,
  "count": 45,
  "logs": [
    {
      "_id": "log_id",
      "prompt": "Can you explain...",
      "response": "Sure! ...",
      "qualityScore": 75,
      "instructorLabel": {
        "quality": "good",
        "labeledBy": "instructor_id",
        "labeledAt": "2024-11-13T10:30:00Z"
      },
      "studentId": { "name": "Nguyen Van A" },
      "timestamp": "2024-11-13T09:15:00Z"
    }
  ]
}
```

### 5. GET `/api/logs/export-training-data`

**Query Params:**

- `assignmentId` (optional)
- `labeled=true` - Only export labeled data
- `format=csv|json` (default: csv)

**CSV Output:**

```csv
logId,prompt,promptLength,heuristicScore,qualityLevel,instructorLabel,labeledAt,charCount,wordCount,hasQuestionMark,...
"673abc..","Can you explain closures?",27,85,excellent,good,2024-11-13T10:30:00Z,27,4,1,...
```

**JSON Output:**

```json
{
  "success": true,
  "count": 120,
  "labeledCount": 85,
  "exportedAt": "2024-11-13T11:00:00Z",
  "data": [
    {
      "logId": "...",
      "prompt": "...",
      "heuristicScore": 85,
      "qualityLevel": "excellent",
      "instructorLabel": "good",
      "features": { "charCount": 27, "wordCount": 4, ... }
    }
  ]
}
```

### 6. GET `/api/logs/label-stats`

**Query:** `?assignmentId=xxx`

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalLogs": 150,
    "labeledLogs": 85,
    "goodLabels": 60,
    "badLabels": 25,
    "unlabeledLogs": 65,
    "labeledPercentage": 57
  },
  "readyForTraining": false,
  "recommendation": "Label 15 more prompts to start ML training"
}
```

---

## 🎨 Frontend Components

### 1. `PromptQualityFeedback.jsx`

**Props:**

- `quality: { score, level, feedback }`
- `show: boolean`
- `inline: boolean` - Compact bar vs full panel

**Modes:**

- **Inline**: Bar + badge dưới input field
- **Panel**: Chi tiết feedback + tips viết prompt tốt

### 2. `PromptQualityIndicator.jsx`

Compact badge hiển thị trong message history:

```jsx
<PromptQualityIndicator quality={{ score: 85, level: "excellent" }} />
// Output: 🌟 85
```

### 3. `PromptQualityHistory.jsx`

Trend chart cho analytics:

```jsx
<PromptQualityHistory logs={[...]} />
// Shows: Avg score, trend (↗️/↘️), bar chart
```

### 4. `PromptLabelingInterface.jsx`

**Props:**

- `assignmentId: string`
- `submissionId: string` (optional)

**Features:**

- Stats dashboard (total, good, bad, unlabeled, %)
- Filter buttons (All | Unlabeled | Labeled)
- Log cards với metadata
- Label actions (✅ GOOD | ❌ BAD | 🔄 Change | 🗑️ Remove)
- Export buttons (CSV | JSON)
- Training readiness indicator

---

## 🤖 ML Training Pipeline (Future)

### Current State: Heuristic-based

✅ Hoạt động ngay không cần training  
✅ Feedback tức thì cho sinh viên  
✅ Thu thập labeled data

### Future State: ML Model

#### Step 1: Collect Data (100+ labeled samples)

```bash
# Export labeled data
GET /api/logs/export-training-data?labeled=true&format=csv
```

#### Step 2: Train Model (Python scikit-learn)

```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load data
df = pd.read_csv('prompt_training_data.csv')

# Features (24 columns)
X = df[['charCount', 'wordCount', 'hasQuestionMark', 'isOpenQuestion', ...]]

# Target (instructor label)
y = df['instructorLabel'].map({'good': 1, 'bad': 0})

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f'Accuracy: {accuracy:.2f}')

# Save model
import joblib
joblib.dump(model, 'prompt_quality_model.pkl')
```

#### Step 3: Deploy Model

**Option A: Python Microservice**

```python
# api.py
from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
model = joblib.load('prompt_quality_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    features = request.json['features']  # 24 features array
    prediction = model.predict([features])[0]  # 0 = bad, 1 = good
    confidence = model.predict_proba([features])[0]

    return jsonify({
        'quality': 'good' if prediction == 1 else 'bad',
        'confidence': float(max(confidence)),
        'score': int(confidence[1] * 100)  # Convert to 0-100 scale
    })

if __name__ == '__main__':
    app.run(port=5001)
```

**Option B: ONNX Runtime (Node.js)**

```bash
pip install skl2onnx
python convert_to_onnx.py  # Convert .pkl to .onnx
npm install onnxruntime-node
```

```javascript
// backend/src/services/mlModel.js
const onnx = require("onnxruntime-node");

let session;

async function loadModel() {
  session = await onnx.InferenceSession.create("./models/prompt_quality.onnx");
}

async function scorePromptML(features) {
  const input = new onnx.Tensor("float32", features, [1, 24]);
  const results = await session.run({ input });
  const prediction = results.output.data[0];

  return {
    quality: prediction >= 0.5 ? "good" : "bad",
    score: Math.round(prediction * 100),
    confidence: Math.abs(prediction - 0.5) * 2,
  };
}

module.exports = { loadModel, scorePromptML };
```

#### Step 4: Replace Heuristic

```javascript
// backend/src/routes/ai.js

// OLD:
const promptQuality = scorePromptHeuristic(prompt, context);

// NEW:
const features = extractFeatures(prompt, context);
const promptQuality = await scorePromptML(features); // ML model
```

---

## 📈 Analytics & Monitoring

### Student Dashboard

- Avg prompt quality score
- Trend over time (📈/📉)
- Prompt count
- Tips dựa trên weak areas

### Instructor Dashboard

- Assignment-level stats
- Student comparison (anonymized)
- Identify struggling students (low scores)
- Export labeled dataset

### Application Insights Events

```javascript
trackEvent("prompt_labeled", {
  logId,
  quality: "good",
  instructorId,
  assignmentId,
});

trackEvent("training_data_exported", {
  format: "csv",
  totalLogs: 150,
  labeledLogs: 85,
});
```

---

## 🚀 Deployment Checklist

### Backend

- [x] AI_Log model có `instructorLabel` field
- [x] Logs routes mounted (`/api/logs`)
- [x] promptScoringService.js deployed
- [x] AI chat route trả về `promptQuality`

### Frontend

- [x] PromptQualityFeedback component
- [x] AIChat hiển thị quality badge + feedback
- [x] PromptLabelingInterface cho instructor
- [x] CSS files imported

### Database

```javascript
// Add index for labeling queries
db.ai_logs.createIndex({ "instructorLabel.quality": 1, assignmentId: 1 });
db.ai_logs.createIndex({ "instructorLabel.labeledAt": -1 });
```

### Testing

```bash
# Test labeling endpoint
POST /api/logs/:logId/label
Body: { "quality": "good" }

# Test export
GET /api/logs/export-training-data?labeled=true&format=csv

# Test real-time feedback
POST /api/ai/chat
Body: { "prompt": "hello", "submissionId": "...", "questionId": "..." }
# Should return: { promptQuality: { score: 5, feedback: [...] } }
```

---

## 💡 Best Practices

### For Students

1. **Mô tả cụ thể**: "Tại sao closure trong JavaScript có thể access outer scope?"
2. **Cung cấp context**: "Câu 5 hỏi về async/await. Tôi đã thử dùng Promise nhưng..."
3. **Hỏi về concept**: Thay vì "Đáp án là gì?" → "Làm sao để phân biệt X và Y?"
4. **Iterative**: Nếu score thấp, đọc feedback và refine prompt

### For Instructors

1. **Consistency**: Label theo tiêu chí rõ ràng
2. **Quality over Quantity**: 100 labels chất lượng > 500 labels random
3. **Diverse Samples**: Label cả good và bad examples
4. **Regular Export**: Export data định kỳ để backup

### For Developers

1. **Monitor Heuristic**: Track score distribution, adjust weights nếu cần
2. **A/B Test**: So sánh heuristic vs ML model khi deploy
3. **Feedback Loop**: Student ratings → improve scoring algorithm
4. **Privacy**: Anonymize data khi export (remove student names)

---

## 📚 Related Documentation

- [Application Insights Setup](./APPLICATION_INSIGHTS.md)
- [AI Chat Integration](../backend/src/routes/ai.js)
- [Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

## 🐛 Troubleshooting

### Prompt Quality không hiển thị

```javascript
// Check API response
console.log(response.data.promptQuality);

// Verify backend trả về data
// backend/src/routes/ai.js line ~300
console.log("Prompt quality:", promptQuality);
```

### Label endpoint 403 Forbidden

```javascript
// Check auth middleware
// Chỉ instructor mới label được
// Verify: req.user.role === 'instructor'
```

### Export CSV rỗng

```bash
# Check filter query
GET /api/logs/export-training-data?labeled=true

# Nếu không có labeled data → label ít nhất 1 prompt trước
```

### ML Model accuracy thấp

- Cần ít nhất 100 labeled samples (150+ recommended)
- Balance dataset (50/50 good/bad hoặc 60/40)
- Hyperparameter tuning (n_estimators, max_depth, min_samples_split)
- Feature engineering (thêm features mới)

---

**Version:** 1.0.0  
**Last Updated:** 2024-11-13  
**Author:** AI Assessment System Team
