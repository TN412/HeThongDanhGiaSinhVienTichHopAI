# Application Insights Integration - Implementation Summary

## ✅ Completed Implementation

### 📦 Packages Installed

```bash
npm install applicationinsights --save
```

- **applicationinsights** v3.x - Official Azure SDK for Node.js
- Auto-instruments HTTP, MongoDB, Redis, and other dependencies
- 170 additional packages (OpenTelemetry dependencies)

---

## 🏗️ Architecture

### Files Created/Modified

**Created:**

1. `src/config/appInsights.js` (350 lines) - App Insights configuration and tracking functions
2. `src/middleware/monitoring.js` (270 lines) - Request timing middleware
3. `APPLICATION_INSIGHTS.md` (500+ lines) - Complete documentation with Kusto queries
4. `APPLICATION_INSIGHTS_QUICKSTART.md` (400+ lines) - 15-minute setup guide

**Modified:** 5. `src/app.js` - Initialize App Insights, add request timing middleware 6. `src/server.js` - Start memory tracking, flush telemetry on shutdown 7. `src/routes/ai.js` - Track AI chat requests, OpenAI calls, errors 8. `src/routes/submission.js` - Track submission submitted events 9. `src/routes/assignment.js` - Track assignment generation, OpenAI calls 10. `.env.example` - Add `APPINSIGHTS_CONNECTION_STRING` 11. `README.md` - Add Monitoring section

---

## 📊 Features Implemented

### 1. HTTP Response Time Tracking (All Routes)

**Middleware**: `requestTimingMiddleware`

- Tracks every HTTP request/response
- Measures duration in milliseconds (high precision)
- Logs to console in development
- Sends to Application Insights:
  - Metric: `http_response_time`
  - Event: `http_request`
  - Dimensions: route, method, statusCode, userId, userRole

**Automatic Tracking:**

- Slow requests (>5s) → `slow_request` event
- HTTP errors (4xx, 5xx) → `http_error` event
- Request size, query params logged

### 2. OpenAI API Call Tracking

**Function**: `trackOpenAICall(endpoint, duration, success, metadata)`

- Tracks as **Dependency** (OpenAI)
- Tracks as **Custom Event** (`openai_api_call`)
- Metrics:
  - Duration (ms)
  - Token usage (prompt, completion, total)
  - Cost estimation
  - Model used
  - Success/failure

**Integration Points:**

- `src/routes/ai.js` - AI chat endpoint
- `src/routes/assignment.js` - Assignment generation

**Data Tracked:**

```javascript
{
  endpoint: 'chat.completions',
  duration: 1234,  // ms
  success: true,
  model: 'gpt-4',
  promptTokens: 150,
  completionTokens: 200,
  totalTokens: 350,
  submissionId: '...',
  questionId: '...'
}
```

### 3. Custom Events

**ai_chat_request** (AI chat usage)

- Triggered: When student asks AI
- Properties: submissionId, questionId, promptLength, hasContext, studentId
- Measurements: promptLength

**ai_chat_error** (AI failures)

- Triggered: When AI chat fails
- Properties: submissionId, errorType, errorMessage, studentId
- Also tracks as Exception

**submission_submitted** (Assignment completion)

- Triggered: When student submits assignment
- Properties: submissionId, assignmentId, studentId, questionsCount, aiInteractionsCount
- Measurements: totalScore, aiSkillScore, finalScore, timeSpentMinutes

**assignment_generated** (Auto-generation)

- Triggered: When instructor generates assignment from document
- Properties: assignmentId, instructorId, questionType, documentType
- Measurements: questionsGenerated, generationTime

**openai_api_call** (OpenAI usage)

- Triggered: Every OpenAI API call
- Properties: endpoint, success, model, submissionId, questionId
- Measurements: duration, promptTokens, completionTokens, totalTokens

**http_request** (All HTTP traffic)

- Triggered: Every HTTP request
- Properties: route, method, statusCode, userId, userRole, path, query
- Measurements: duration, requestSize

**http_error** (HTTP failures)

- Triggered: HTTP 4xx, 5xx responses
- Properties: route, method, statusCode, userId, errorType

**slow_request** (Performance issues)

- Triggered: Requests taking >5 seconds
- Properties: route, method, statusCode, userId, path
- Measurements: duration

**slow_database_query** (DB performance)

- Triggered: MongoDB queries taking >1 second
- Properties: query
- Measurements: duration

### 4. Memory Usage Tracking

**Function**: `startMemoryTracking()`

- Runs every 5 minutes
- Metrics tracked:
  - `memory_heap_used_mb` - V8 heap usage
  - `memory_heap_total_mb` - V8 heap total
  - `memory_rss_mb` - Resident set size
  - `memory_external_mb` - External memory (C++ objects)

### 5. Dependency Tracking (Auto-Instrumented)

Application Insights automatically tracks:

- **MongoDB** queries (via Mongoose)
- **HTTP** outbound requests (OpenAI, Azure Blob)
- **Redis** (if used)
- Duration, success/failure, result codes

---

## 🎯 Monitoring Capabilities

### What You Can Monitor

**Performance:**

- Average/P50/P95/P99 response times per route
- Slow requests (>5s)
- Database query performance
- OpenAI API latency

**Usage:**

- API throughput (requests/min)
- AI chat requests per student
- Submissions per day
- OpenAI token consumption (cost estimation)

**Reliability:**

- Error rate (% of failed requests)
- AI chat error rate
- OpenAI API failures
- Uptime/availability

**Business Metrics:**

- Student AI usage patterns
- Assignment completion rates
- Average scores
- Correlation: AI usage vs scores

---

## 📈 Kusto Queries (Examples)

### Response Time by Route

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(24h)
| summarize
    Avg_ms = avg(value),
    P95_ms = percentile(value, 95)
  by route = tostring(customDimensions.route)
| order by Avg_ms desc
```

### OpenAI Token Usage & Cost

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(7d)
| extend totalTokens = toint(customMeasurements.totalTokens)
| summarize TotalTokens = sum(totalTokens) by bin(timestamp, 1h)
| extend EstimatedCost_USD = TotalTokens * 0.00003  // GPT-4: $0.03/1K tokens
| render timechart
```

### AI Chat Usage Per Student

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(7d)
| extend studentId = tostring(customDimensions.studentId)
| summarize ChatCount = count() by studentId
| order by ChatCount desc
| take 20
```

### Submission Statistics

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(7d)
| extend
    finalScore = todouble(customMeasurements.finalScore),
    aiInteractions = toint(customDimensions.aiInteractionsCount)
| summarize
    AvgScore = avg(finalScore),
    AvgAIInteractions = avg(aiInteractions),
    TotalSubmissions = count()
```

### Error Rate

```kusto
let allReq = customEvents | where name == "http_request" | where timestamp > ago(1h) | count;
let errors = customEvents | where name == "http_error" | where timestamp > ago(1h) | count;
print ErrorRate_Percent = (errors * 100.0) / allReq
```

**Full query reference**: See [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md)

---

## 🚀 Quick Start

### 1. Create App Insights Resource

```bash
# Azure CLI
az monitor app-insights component create \
  --app ai-assessment-backend \
  --location eastus \
  --resource-group ai-assessment-rg \
  --application-type web
```

### 2. Get Connection String

```bash
az monitor app-insights component show \
  --app ai-assessment-backend \
  --resource-group ai-assessment-rg \
  --query connectionString -o tsv
```

### 3. Configure Backend

Add to `.env`:

```bash
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

### 4. Start Backend

```bash
npm run dev
```

Expected output:

```
✅ Application Insights initialized successfully
📊 Environment: development
📊 Memory tracking started (every 5 minutes)
```

### 5. Verify in Azure Portal

1. Go to Application Insights resource
2. Click **Live Metrics** (left menu)
3. Send test request: `curl http://localhost:5000/api/health`
4. See request appear in Live Metrics Stream

**Detailed setup**: See [APPLICATION_INSIGHTS_QUICKSTART.md](./APPLICATION_INSIGHTS_QUICKSTART.md)

---

## 🔧 Configuration Options

### Disable in Development

App Insights is **optional** - if no connection string is set, backend runs normally without telemetry.

To disable:

```bash
# Remove or comment out in .env
# APPINSIGHTS_CONNECTION_STRING=...
```

Console output:

```
📊 Application Insights: Not configured (optional in development)
```

### Auto-Collection Settings

In `src/config/appInsights.js`:

```javascript
appInsights
  .setAutoCollectRequests(true) // HTTP requests
  .setAutoCollectPerformance(true) // CPU, memory
  .setAutoCollectExceptions(true) // Unhandled exceptions
  .setAutoCollectDependencies(true) // MongoDB, HTTP calls
  .setAutoCollectConsole(true) // Console logs (info, warn, error)
  .setUseDiskRetryCaching(true) // Retry failed telemetry
  .setSendLiveMetrics(true); // Live Metrics Stream
```

### Sampling (Reduce Costs)

To sample telemetry (e.g., keep only 10%):

```javascript
const client = appInsights.defaultClient;
client.config.samplingPercentage = 10; // 10% sampling
```

---

## 📋 Testing Checklist

### Test Custom Events

```bash
# Set JWT token
TOKEN="your-jwt-token"

# Test ai_chat_request
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test","submissionId":"123"}'

# Test submission_submitted
curl -X POST http://localhost:5000/api/submission/123/submit \
  -H "Authorization: Bearer $TOKEN"

# Test assignment_generated
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@test.pdf" \
  -F "questionType=multiple-choice"
```

### Verify in Azure Portal

**Logs** > Run query:

```kusto
customEvents
| where timestamp > ago(10m)
| project timestamp, name, customDimensions, customMeasurements
| order by timestamp desc
```

---

## 💰 Cost Estimation

### Application Insights Pricing

- **Basic tier**: ~$2.30/GB ingested
- **First 5 GB/month**: Free
- **Typical usage**:
  - Small app (100 req/min): ~1-2 GB/month → **Free**
  - Medium app (1000 req/min): ~5-10 GB/month → **$5-15/month**
  - Large app (10k req/min): ~50-100 GB/month → **$100-200/month**

### Reduce Costs

1. **Sampling**: Keep 10-20% of telemetry
2. **Disable console logs**: `.setAutoCollectConsole(false)`
3. **Adjust retention**: 90 days → 30 days (Azure Portal)
4. **Filter noisy routes**: Skip `/health` tracking

---

## 📖 Documentation

1. **[APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md)** (500+ lines)
   - Complete monitoring guide
   - 50+ Kusto queries
   - Dashboard widget examples
   - Alert configurations
   - Troubleshooting

2. **[APPLICATION_INSIGHTS_QUICKSTART.md](./APPLICATION_INSIGHTS_QUICKSTART.md)** (400+ lines)
   - 15-minute setup guide
   - Step-by-step Azure Portal walkthrough
   - Common issues and solutions
   - Quick reference queries

3. **[README.md](./README.md)** - Updated with Monitoring section

---

## 🎉 Summary

### What's Tracked

✅ HTTP response time (all routes)  
✅ OpenAI API calls (duration, tokens, cost)  
✅ AI chat requests and errors  
✅ Submissions submitted  
✅ Assignment generation  
✅ Database queries (slow queries)  
✅ Memory usage (every 5 minutes)  
✅ HTTP errors (4xx, 5xx)  
✅ Exceptions

### What You Can Do

✅ View real-time metrics in Live Metrics Stream  
✅ Build custom dashboards with Kusto queries  
✅ Set up alerts (error rate, slow requests, high costs)  
✅ Monitor OpenAI token usage and costs  
✅ Analyze student AI usage patterns  
✅ Track performance degradation over time  
✅ Debug production issues with detailed telemetry

### Next Steps

1. Create Application Insights resource in Azure
2. Add connection string to `.env`
3. Restart backend
4. Build dashboard with key metrics
5. Set up critical alerts

**Total Setup Time**: ~15 minutes  
**Zero Code Changes Required in Production**: App Insights is opt-in via environment variable

---

**Ready for production monitoring!** 🚀
