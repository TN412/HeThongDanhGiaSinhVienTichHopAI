# 🚨 Hệ Thống Phát Hiện Copy-Paste & Dependency Patterns

## Vấn Đề Được Giải Quyết

**Scenario:** Sinh viên copy-paste câu hỏi bài tập vào AI và để AI trả lời trực tiếp → Hệ thống cần phát hiện và giảm điểm Independence.

---

## 🔍 Các Pattern Được Phát Hiện

### 1. **Write-For-Me Pattern** (Trọng số: 30% trong Dependency Score)

#### Phát hiện:

- **Keywords trực tiếp:** "làm hộ", "làm giúp", "write for me", "code hộ", "giải hộ", "answer this", "solve this"
- **Copy-paste câu hỏi dài:**
  - Prompt > 200 ký tự
  - KHÔNG có từ cá nhân (tôi, mình, em, theo, trong trường hợp, với bài...)
  - Có đúng 1 dấu `?` (câu hỏi copy nguyên văn)
- **Lệnh trực tiếp ngắn:**
  - Bắt đầu bằng: "viết", "tạo", "làm", "code", "build", "create", "write", "solve", "answer"
  - Ngắn < 20 từ
  - KHÔNG có tư duy (tại sao, như thế nào, giải thích...)

#### Ví dụ bị phạt:

```
❌ "Viết code sắp xếp mảng"
❌ "Giải bài toán: Tìm số lớn nhất trong mảng các số nguyên?"
❌ "solve this"
✅ "Tôi đang làm bài sắp xếp mảng, có thể giải thích thuật toán bubble sort không?"
```

---

### 2. **Copy-Paste Indicators** (Trọng số: 20% trong Dependency Score)

#### Phát hiện:

- **Prompt quá ngắn:** < 15 ký tự
- **Single word:** "code", "fix", "help", "giúp", "sửa", "làm"
- **Copy câu hỏi KHÔNG có context:**
  - Prompt > 150 ký tự
  - KHÔNG có từ cá nhân
  - Đúng 1 dấu `?`
- **Sequential copy-paste pattern:**
  - 3 prompts liên tiếp
  - Tất cả > 100 ký tự
  - Độ chênh lệch length < 50 ký tự (giống nhau về độ dài)

#### Ví dụ:

```
❌ Prompt 1 (150 chars): "Thuật toán tìm kiếm nhị phân là gì?"
❌ Prompt 2 (160 chars): "Cách implement quicksort như thế nào?"
❌ Prompt 3 (155 chars): "Độ phức tạp của merge sort là bao nhiêu?"
→ Pattern: Copy-paste 3 câu hỏi dài giống nhau về length
```

---

### 3. **Too Fast Pattern** (Trọng số: 25% trong Dependency Score)

Gửi prompts < 30 giây → Không có thời gian đọc response và suy nghĩ.

---

### 4. **No Iteration Pattern** (Trọng số: 10% trong Dependency Score)

Không cải thiện prompt, duplicate hoàn toàn.

---

### 5. **Lack of Inquiry** (Trọng số: 15% trong Dependency Score)

Không có câu hỏi follow-up, verification, hoặc critical thinking.

---

## 📊 Cách Tính Điểm

### Dependency Score (0-100)

```javascript
Dependency Score = 100 - (
  writeForMeRate × 30% +
  tooFastRate × 25% +
  copyPasteRate × 20% +
  noInquiryRate × 15% +
  noIterationRate × 10%
)
```

**Ví dụ:** 5 câu tự luận, tất cả copy-paste câu hỏi:

- writeForMeRate = 5/5 = 100%
- copyPasteRate = 5/5 = 100%

```
Dependency Score = 100 - (100 × 30% + 100 × 20%) = 100 - 50 = 50
→ Risk Level: HIGH
```

---

### Prompt Quality Score (1-5)

**Base Score:** 3 (Đạt)

**Penalties:**

- Copy-paste câu hỏi dài: **-1.5**
- "Làm hộ" keywords: **-2.0**
- Lệnh trực tiếp ngắn: **-1.2**
- Copy-paste pattern: **-1.0**
- Quá ngắn (<20 chars): **-1.0**
- Single word: **-1.5**
- Duplicate: **-0.5**

**Ví dụ:**

```
Prompt: "Giải bài toán: Tìm số lớn nhất trong mảng các số nguyên?"
→ Base: 3
→ Copy-paste câu hỏi dài: -1.5
→ Không có context: -0 (hasContext = false)
→ Final Score: 3 - 1.5 = 1.5 → 2 (Yếu)
```

---

### WISDOM Mindfulness Score (0-10)

**Penalties (từ 10 điểm):**

- Write-for-me rate × **5** (tăng từ 4)
- Copy-paste rate × **4** (tăng từ 3)
- Lack context rate × **2**

**Ví dụ:**

```
5 câu copy-paste:
- writeForMeRate = 100% → Penalty: 5
- copyPasteRate = 100% → Penalty: 4
→ Mindfulness Score = 10 - 5 - 4 = 1/10
```

---

## 🎯 Rubric Scores (1-5)

### Independence Level

Dựa trên Dependency Score:

- Score ≥ 80 → Level 5 (Xuất sắc)
- Score ≥ 70 → Level 4 (Tốt)
- Score ≥ 50 → Level 3 (Trung bình)
- Score ≥ 30 → Level 2 (Yếu)
- Score < 30 → Level 1 (Rất yếu)

**Copy-paste 5 câu → Dependency Score = 50 → Independence Level = 3**

---

## ✅ Best Practices Cho Sinh Viên

### ❌ Tránh

```javascript
// Copy-paste trực tiếp
"Viết code sắp xếp mảng";
"Giải bài toán: Tìm số lớn nhất?";
"code";
```

### ✅ Nên

```javascript
// Có context và tư duy
"Tôi đang làm bài sắp xếp, hiện tại dùng bubble sort nhưng chậm.
Có thuật toán nào nhanh hơn không và tại sao nó nhanh hơn?"

"Em đang nghiên cứu thuật toán tìm kiếm. So sánh giữa binary search
và linear search trong trường hợp nào thì binary search hiệu quả hơn?"

"Trong bài tập vừa rồi, em thử implement quicksort nhưng bị lỗi
stack overflow với mảng lớn. Có cách nào optimize không?"
```

---

## 📈 Cải Thiện Prompt

### Iteration Pattern (Bonus +0.5)

```javascript
Prompt 1: "Thuật toán bubble sort là gì?"
Prompt 2: "So với prompt trước, em muốn biết thêm về độ phức tạp của bubble sort"
Prompt 3: "Dựa vào phân tích vừa rồi, có cách nào optimize bubble sort không?"
→ Có iteration → Quality Score tăng
```

### Context-Rich Prompts (Bonus +0.4)

```javascript
"Trong bài lab 3, em implement stack bằng array.
Hiện tại em muốn chuyển sang dùng linked list.
So sánh ưu nhược điểm 2 cách implement?"
→ Có context, có so sánh → Quality Score cao
```

---

## 🔧 Tech Stack

### Backend Detection

- **File:** `backend/src/utils/prompt_classifier.js`
- **Functions:**
  - `detectDependencyPatterns(logs)` - Phát hiện 5 patterns
  - `assessPromptQuality(prompt, context)` - Đánh giá 1-5
  - `calculateDiversificationScore(logs)` - Độ đa dạng

### WISDOM Framework

- **File:** `backend/src/utils/wisdom_mapper.js`
- **Functions:**
  - `calculateMindfulnessScore(logs)` - Mindfulness 0-10
  - `calculateInquiryScore(logs)` - Inquiry 0-10
  - `calculateDisruptiveThinkingScore(logs)` - Creativity 0-10

### Auto-Detection on Save

- **File:** `backend/src/models/AI_Log.js`
- **Method:** `AI_Log.createWithClassification(logData)`
  - Tự động classify promptType
  - Tự động assess quality
  - Tự động detect mutations
  - Tự động detect copy-paste pattern

---

## 🧪 Test Cases

### Test 1: Copy-Paste 5 Câu Tự Luận

```javascript
Prompts:
1. "Thuật toán sắp xếp nổi bọt hoạt động như thế nào?"
2. "Phương pháp tìm kiếm nhị phân có ưu điểm gì?"
3. "Độ phức tạp của thuật toán quicksort là bao nhiêu?"
4. "Cách implement stack bằng array trong Java?"
5. "Sự khác biệt giữa BFS và DFS là gì?"

Expected:
- writeForMeCount: 5/5 (100%)
- copyPasteIndicators: 5/5 (100%)
- Dependency Score: ~50
- Risk Level: HIGH
- Avg Quality Score: ~2/5 (Yếu)
- Mindfulness Score: ~1/10
```

### Test 2: Good Prompts với Context

```javascript
Prompts:
1. "Em đang học bubble sort, có thể giải thích tại sao nó O(n²) không?"
2. "Dựa vào giải thích vừa rồi, em thử optimize bằng flag, đúng không?"
3. "So sánh bubble sort với insertion sort, trong trường hợp nào nên dùng?"

Expected:
- writeForMeCount: 0/3 (0%)
- Dependency Score: ~85
- Risk Level: LOW
- Avg Quality Score: ~4/5 (Tốt)
- Mindfulness Score: ~8/10
```

---

## 📚 References

- **Dependency Detection:** `prompt_classifier.detectDependencyPatterns()`
- **Quality Assessment:** `prompt_classifier.assessPromptQuality()`
- **WISDOM Framework:** `wisdom_mapper.calculateWisdomScore()`
- **Comprehensive Report:** `ai_advanced_assessment.generateComprehensiveAssessment()`

---

**Kết luận:** Hệ thống hiện đã có khả năng phát hiện chính xác copy-paste patterns và giảm điểm Independence/Mindfulness tương ứng! 🎯
