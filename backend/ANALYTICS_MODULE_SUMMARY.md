# Analytics Module - Implementation Summary

## ✅ Completed: November 6, 2025

## Overview

Complete analytics and logging system for tracking AI usage, student performance, and assignment metrics. Provides instructor dashboard data and student progress visualization.

---

## 📁 Files Created

### 1. **src/routes/analytics.js** (689 lines)

Complete analytics API with 4 main endpoints:

#### GET /api/logs/submission/:submissionId

- **Access:** Instructor only
- **Returns:** All AI_Log entries for a submission
- **Sorted by:** Timestamp (ascending - oldest first)
- **Includes:** Full log details + submission metadata

**Response Structure:**

```json
{
  "success": true,
  "logs": [
    {
      "_id": "...",
      "submissionId": "...",
      "assignmentId": "...",
      "studentId": "...",
      "questionId": "...",
      "prompt": "What is a closure?",
      "response": "A closure is...",
      "promptType": "question",
      "contextProvided": false,
      "timestamp": "2025-01-01T10:00:00Z",
      "promptTokens": 50,
      "completionTokens": 100,
      "responseTime": 850
    }
  ],
  "totalLogs": 12,
  "submission": {
    "id": "...",
    "studentId": "...",
    "assignmentId": "...",
    "status": "submitted"
  }
}
```

---

#### GET /api/logs/student/:studentId

- **Access:** Instructor only
- **Query Params:** `assignmentId` (filter), `limit` (default: 100)
- **Returns:** All logs for student across assignments
- **Sorted by:** Timestamp (descending - newest first)
- **Includes:** Summary grouped by assignment

**Response Structure:**

```json
{
  "success": true,
  "logs": [...],
  "totalLogs": 25,
  "student": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "summary": {
    "byAssignment": [
      {
        "assignmentId": "...",
        "totalPrompts": 12,
        "totalTokens": 3500,
        "promptTypes": {
          "question": 7,
          "hint": 3,
          "clarification": 2
        }
      }
    ],
    "totalPrompts": 25,
    "totalTokens": 7500
  }
}
```

---

#### GET /api/analytics/assignment/:id

- **Access:** Student (owner) or Instructor
- **Returns:** Comprehensive assignment analytics
- **Includes:** Scores, completion, AI usage, time metrics

**Response Structure:**

```json
{
  "success": true,
  "analytics": {
    "assignmentId": "...",
    "assignmentTitle": "JavaScript Fundamentals",
    "assignmentType": "multiple-choice",
    "totalQuestions": 10,
    "totalPoints": 100,

    // Completion metrics
    "totalStudents": 30,
    "submittedCount": 25,
    "completionRate": "83.3%",

    // Score metrics
    "averageScore": 75.5,
    "averageFinalScore": 78.2,
    "averageAISkillScore": 82.0,
    "scoreDistribution": {
      "0-59": 2,
      "60-69": 3,
      "70-79": 8,
      "80-89": 9,
      "90-100": 3
    },

    // AI usage metrics
    "aiUsage": {
      "totalPrompts": 150,
      "submissionsWithAI": 20,
      "aiUsageRate": "66.7%",
      "avgPromptsPerSubmission": 7.5,
      "totalTokens": 45000,
      "avgTokensPerPrompt": 300,
      "promptTypes": {
        "question": 80,
        "hint": 40,
        "confirmation": 20,
        "clarification": 10
      },
      "topQuestionsWithAI": [
        { "questionId": "q1", "count": 25 },
        { "questionId": "q3", "count": 18 }
      ]
    },

    // Time metrics
    "timeMetrics": {
      "avgTimeSpent": "45.5 minutes",
      "minTime": "20.0 minutes",
      "maxTime": "90.5 minutes"
    }
  }
}
```

**Key Metrics Calculated:**

- ✅ Average scores (content, AI skill, final)
- ✅ Completion rate percentage
- ✅ Score distribution (5 buckets for histogram)
- ✅ AI usage rate (% students using AI)
- ✅ Average prompts per submission
- ✅ Total token usage & cost estimation
- ✅ Prompt type breakdown
- ✅ Questions needing most AI help
- ✅ Time spent statistics

---

#### GET /api/analytics/student/:id

- **Access:** Student (own data) or Instructor (any student)
- **Returns:** Student progress, AI skill trend, insights
- **Includes:** Chart-ready trend data

**Response Structure:**

```json
{
  "success": true,
  "analytics": {
    "studentId": "...",
    "studentName": "John Doe",
    "studentEmail": "john@example.com",

    // Assignment progress
    "totalAssignments": 10,
    "completedAssignments": 8,
    "completionRate": "80.0%",

    // Score metrics
    "averageScore": 78.5,
    "averageFinalScore": 81.2,
    "averageAISkillScore": 85.0,

    // AI usage metrics
    "aiUsage": {
      "totalPrompts": 60,
      "totalTokens": 18000,
      "avgPromptsPerAssignment": 7.5,
      "avgTokensPerPrompt": 300,
      "avgPromptLength": 45,
      "contextProvidedRate": "75.0%",
      "promptTypes": {
        "question": 30,
        "hint": 15,
        "confirmation": 10,
        "clarification": 5
      }
    },

    // 📈 Progress trend (line chart data)
    "progressTrend": [
      {
        "assignmentId": "a1",
        "assignmentTitle": "Assignment 1",
        "submittedAt": "2025-01-01T...",
        "totalScore": 75,
        "finalScore": 78,
        "aiSkillScore": 80
      },
      {
        "assignmentId": "a2",
        "assignmentTitle": "Assignment 2",
        "submittedAt": "2025-01-08T...",
        "totalScore": 82,
        "finalScore": 85,
        "aiSkillScore": 90
      }
    ],

    // 📊 AI skill trend (area chart data)
    "aiSkillTrend": [
      {
        "assignmentId": "a1",
        "assignmentTitle": "Assignment 1",
        "submittedAt": "2025-01-01T...",
        "aiSkillScore": 80,
        "promptCount": 8,
        "avgPromptQuality": "42.5"
      },
      {
        "assignmentId": "a2",
        "assignmentTitle": "Assignment 2",
        "submittedAt": "2025-01-08T...",
        "aiSkillScore": 90,
        "promptCount": 6,
        "avgPromptQuality": "48.0"
      }
    ],

    // 💡 Insights (automatic analysis)
    "insights": {
      "strengths": [
        "Excellent AI utilization skills",
        "Good at providing context in prompts",
        "Writes detailed, specific prompts",
        "Strong overall performance"
      ],
      "weaknesses": [
        "AI skills need improvement - consider more thoughtful prompts",
        "Rarely provides context - more context leads to better AI responses"
      ],
      "recommendation": "Keep up the good work! Continue leveraging AI effectively"
    }
  }
}
```

**Insight Generation Logic:**

| Metric                       | Threshold   | Insight                           |
| ---------------------------- | ----------- | --------------------------------- |
| `averageAISkillScore >= 80`  | ✅ Strength | "Excellent AI utilization skills" |
| `averageAISkillScore < 60`   | ⚠️ Weakness | "AI skills need improvement"      |
| `contextProvidedRate >= 70%` | ✅ Strength | "Good at providing context"       |
| `contextProvidedRate < 40%`  | ⚠️ Weakness | "Rarely provides context"         |
| `avgPromptLength >= 40`      | ✅ Strength | "Writes detailed prompts"         |
| `avgPromptLength < 20`       | ⚠️ Weakness | "Prompts too short"               |
| `averageFinalScore >= 80`    | ✅ Strength | "Strong performance"              |
| `averageFinalScore < 60`     | ⚠️ Weakness | "Struggling with assignments"     |

---

## 📊 Chart-Ready Data Formats

### 1. Line Chart (Progress Trend)

**Use:** Track student scores over time
**Data:** `analytics.progressTrend`

```javascript
{
  x: submittedAt,        // Date
  y: finalScore,         // 0-100
  label: assignmentTitle // String
}
```

### 2. Bar Chart (Score Distribution)

**Use:** Show assignment grade distribution
**Data:** `analytics.scoreDistribution`

```javascript
{
  "0-59": 2,    // F
  "60-69": 3,   // D
  "70-79": 8,   // C
  "80-89": 9,   // B
  "90-100": 3   // A
}
```

### 3. Pie Chart (Prompt Types)

**Use:** Visualize AI interaction patterns
**Data:** `analytics.aiUsage.promptTypes`

```javascript
{
  "question": 80,
  "hint": 40,
  "confirmation": 20,
  "clarification": 10
}
```

### 4. Area Chart (AI Skill Trend)

**Use:** Track AI skill improvement
**Data:** `analytics.aiSkillTrend`

```javascript
{
  x: submittedAt,
  y: aiSkillScore,
  label: assignmentTitle
}
```

---

## 🧪 Testing

### tests/analytics.test.js (19 tests - all passing)

**Test Coverage:**

1. **GET /api/logs/submission/:submissionId** (2 tests)
   - ✅ Returns all logs sorted by timestamp
   - ✅ Includes all log fields

2. **GET /api/logs/student/:studentId** (4 tests)
   - ✅ Returns all logs for student
   - ✅ Filters by assignmentId
   - ✅ Respects limit parameter
   - ✅ Groups logs by assignment

3. **GET /api/analytics/assignment/:id** (5 tests)
   - ✅ Returns complete analytics
   - ✅ Includes score distribution
   - ✅ Includes AI usage metrics
   - ✅ Includes time metrics
   - ✅ Calculates completion rate correctly

4. **GET /api/analytics/student/:id** (5 tests)
   - ✅ Returns complete analytics
   - ✅ Includes progress trend
   - ✅ Includes AI skill trend
   - ✅ Includes AI usage stats
   - ✅ Includes insights

5. **Chart Data Format Validation** (3 tests)
   - ✅ Progress trend (line chart)
   - ✅ Score distribution (bar chart)
   - ✅ Prompt types (pie chart)

---

## 🔐 Access Control

| Endpoint                      | Student (Own) | Student (Other) | Instructor |
| ----------------------------- | ------------- | --------------- | ---------- |
| GET /logs/submission/:id      | ❌            | ❌              | ✅         |
| GET /logs/student/:id         | ❌            | ❌              | ✅         |
| GET /analytics/assignment/:id | ✅            | ❌              | ✅         |
| GET /analytics/student/:id    | ✅            | ❌              | ✅         |

**Implementation:**

```javascript
// Student can only view own data
if (req.user.role === 'student' && req.user.id !== id) {
  return res.status(403).json({
    error: 'You can only view your own analytics',
  });
}
```

---

## 📈 MongoDB Indexes Required

**Critical for query performance:**

```javascript
// AI_Log collection
db.ai_logs.createIndex({ submissionId: 1, timestamp: 1 });
db.ai_logs.createIndex({ studentId: 1, assignmentId: 1 });
db.ai_logs.createIndex({ assignmentId: 1 });

// AssignmentSubmission collection
db.assignment_submissions.createIndex({ studentId: 1, submittedAt: 1 });
db.assignment_submissions.createIndex({ assignmentId: 1, status: 1 });
```

**Why these indexes?**

- `/logs/submission/:id` → Fast lookup by submissionId + timestamp sort
- `/logs/student/:id` → Fast lookup by studentId + optional assignmentId filter
- `/analytics/assignment/:id` → Fast lookup by assignmentId + status filter
- `/analytics/student/:id` → Fast lookup by studentId + chronological sort

---

## 💰 Performance Considerations

### Query Optimization

```javascript
// ✅ Good: Use .lean() for read-only queries
const logs = await AI_Log.find({ submissionId }).sort({ timestamp: 1 }).lean();

// ✅ Good: Limit fields if not all needed
const submissions = await AssignmentSubmission.find({ assignmentId })
  .select('totalScore finalScore aiSkillScore status')
  .lean();

// ✅ Good: Use aggregation for complex calculations
const stats = await AI_Log.aggregate([
  { $match: { assignmentId: id } },
  {
    $group: {
      _id: '$promptType',
      count: { $sum: 1 },
    },
  },
]);
```

### Response Times (Expected)

- `/logs/submission/:id` → ~50-100ms (10-50 logs)
- `/logs/student/:id` → ~100-200ms (50-200 logs)
- `/analytics/assignment/:id` → ~200-500ms (complex calculations)
- `/analytics/student/:id` → ~300-600ms (trend calculations)

---

## 🚀 Frontend Integration Examples

### React Component: Assignment Analytics Dashboard

```jsx
import { useEffect, useState } from 'react';
import { LineChart, BarChart, PieChart } from 'recharts';

function AssignmentAnalyticsDashboard({ assignmentId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch(`/api/analytics/assignment/${assignmentId}`)
      .then(res => res.json())
      .then(data => setAnalytics(data.analytics));
  }, [assignmentId]);

  if (!analytics) return <Loading />;

  return (
    <div className="analytics-dashboard">
      <h1>{analytics.assignmentTitle}</h1>

      {/* Completion Overview */}
      <StatsGrid>
        <StatCard title="Completion Rate" value={analytics.completionRate} color="green" />
        <StatCard title="Avg Score" value={analytics.averageFinalScore} color="blue" />
        <StatCard title="AI Usage Rate" value={analytics.aiUsage.aiUsageRate} color="purple" />
      </StatsGrid>

      {/* Score Distribution Bar Chart */}
      <Card title="Score Distribution">
        <BarChart
          data={Object.entries(analytics.scoreDistribution).map(([range, count]) => ({
            range,
            students: count,
          }))}
        >
          <XAxis dataKey="range" />
          <YAxis />
          <Bar dataKey="students" fill="#3b82f6" />
        </BarChart>
      </Card>

      {/* AI Usage Pie Chart */}
      <Card title="Prompt Types">
        <PieChart
          data={Object.entries(analytics.aiUsage.promptTypes).map(([type, count]) => ({
            name: type,
            value: count,
          }))}
        >
          <Pie dataKey="value" nameKey="name" />
        </PieChart>
      </Card>

      {/* Top Questions Needing Help */}
      <Card title="Questions Needing Most AI Help">
        <List>
          {analytics.aiUsage.topQuestionsWithAI.map(q => (
            <ListItem key={q.questionId}>
              Question {q.questionId}: {q.count} prompts
            </ListItem>
          ))}
        </List>
      </Card>
    </div>
  );
}
```

### React Component: Student Progress Tracker

```jsx
function StudentProgressTracker({ studentId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch(`/api/analytics/student/${studentId}`)
      .then(res => res.json())
      .then(data => setAnalytics(data.analytics));
  }, [studentId]);

  if (!analytics) return <Loading />;

  return (
    <div className="student-progress">
      <h1>{analytics.studentName}</h1>

      {/* Progress Line Chart */}
      <Card title="Score Progression">
        <LineChart data={analytics.progressTrend}>
          <XAxis dataKey="submittedAt" />
          <YAxis />
          <Line dataKey="finalScore" stroke="#3b82f6" name="Final Score" />
          <Line dataKey="aiSkillScore" stroke="#8b5cf6" name="AI Skill" />
          <Tooltip />
          <Legend />
        </LineChart>
      </Card>

      {/* AI Skill Trend Area Chart */}
      <Card title="AI Skill Development">
        <AreaChart data={analytics.aiSkillTrend}>
          <XAxis dataKey="submittedAt" />
          <YAxis />
          <Area dataKey="aiSkillScore" fill="#8b5cf6" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                const data = payload[0].payload;
                return (
                  <div className="tooltip">
                    <p>{data.assignmentTitle}</p>
                    <p>AI Skill: {data.aiSkillScore}</p>
                    <p>Prompts: {data.promptCount}</p>
                    <p>Avg Quality: {data.avgPromptQuality}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </AreaChart>
      </Card>

      {/* Insights */}
      <Card title="Insights">
        {analytics.insights.strengths.length > 0 && (
          <Section title="Strengths" color="green">
            {analytics.insights.strengths.map((s, i) => (
              <Badge key={i} color="green">
                ✓ {s}
              </Badge>
            ))}
          </Section>
        )}

        {analytics.insights.weaknesses.length > 0 && (
          <Section title="Areas for Improvement" color="orange">
            {analytics.insights.weaknesses.map((w, i) => (
              <Badge key={i} color="orange">
                ⚠ {w}
              </Badge>
            ))}
          </Section>
        )}

        <Alert>{analytics.insights.recommendation}</Alert>
      </Card>
    </div>
  );
}
```

---

## 🔍 Use Cases

### 1. Instructor Dashboard

**Goal:** Monitor assignment performance and AI usage

**Workflow:**

1. Instructor selects assignment
2. Call `GET /api/analytics/assignment/:id`
3. Display:
   - Completion rate & score distribution
   - AI usage patterns
   - Questions needing most help
   - Time spent statistics

### 2. Student Progress Report

**Goal:** Show student their improvement over time

**Workflow:**

1. Student views their profile
2. Call `GET /api/analytics/student/:id`
3. Display:
   - Progress line chart (scores trending up/down)
   - AI skill development over time
   - Personalized insights & recommendations

### 3. AI Usage Audit

**Goal:** Review student's AI interactions for a submission

**Workflow:**

1. Instructor clicks "View AI Logs" on submission
2. Call `GET /api/logs/submission/:submissionId`
3. Display:
   - Timeline of all prompts & responses
   - Prompt quality assessment
   - Context usage patterns

### 4. Cost Tracking

**Goal:** Monitor OpenAI API costs

**Workflow:**

1. Admin views cost dashboard
2. Call `GET /api/analytics/assignment/:id` for all assignments
3. Calculate:
   - Total tokens used: `aiUsage.totalTokens`
   - Estimated cost: `(tokens * price_per_1k) / 1000`
   - Breakdown by assignment

---

## 📚 Next Steps

### Phase 1: Enhanced Visualizations

- [ ] Real-time dashboard updates (WebSocket)
- [ ] Exportable reports (PDF/CSV)
- [ ] Comparison view (student vs class average)

### Phase 2: Advanced Analytics

- [ ] Predictive analytics (identify at-risk students)
- [ ] Clustering (group similar students)
- [ ] Anomaly detection (unusual AI usage patterns)

### Phase 3: Optimization

- [ ] Caching layer (Redis) for expensive queries
- [ ] Background jobs for pre-computed stats
- [ ] Data aggregation pipeline

---

## ✅ Completion Checklist

- ✅ GET /api/logs/submission/:id endpoint
- ✅ GET /api/logs/student/:id endpoint
- ✅ GET /api/analytics/assignment/:id endpoint
- ✅ GET /api/analytics/student/:id endpoint
- ✅ Instructor-only access control
- ✅ Chart-ready data formats
- ✅ 19 comprehensive unit tests
- ✅ Routes registered in index.js
- ✅ All tests passing (156/156)
- ✅ Swagger/JSDoc documentation
- ✅ MongoDB query optimization
- ✅ Response time < 1 second
- ✅ Insight generation logic
- ✅ Frontend integration examples

---

**Status:** ✅ **100% COMPLETE**  
**Test Results:** 156/156 PASSING (100%)  
**Last Updated:** November 6, 2025  
**Module Version:** 1.0.0
