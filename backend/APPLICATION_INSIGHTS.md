# Azure Application Insights Monitoring Guide

This document provides Kusto queries and dashboard configurations for monitoring the AI Assessment System backend in Azure Application Insights.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Key Metrics](#key-metrics)
4. [Kusto Queries](#kusto-queries)
5. [Dashboard Widgets](#dashboard-widgets)
6. [Alerts](#alerts)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The backend integrates Azure Application Insights to track:

- **HTTP Request/Response timing** (all routes)
- **OpenAI API calls** (timing, token usage, errors)
- **Custom events** (ai_chat_request, submission_submitted, etc.)
- **Dependencies** (MongoDB, Azure Blob Storage, OpenAI)
- **Exceptions and errors**
- **Memory usage** (tracked every 5 minutes)

### Custom Events

- `ai_chat_request` - Student asks AI during assignment
- `ai_chat_error` - AI chat fails
- `submission_submitted` - Student submits assignment
- `assignment_generated` - Instructor generates assignment from document
- `openai_api_call` - OpenAI API call (also tracked as dependency)
- `http_request` - HTTP request metrics
- `http_error` - HTTP errors (4xx, 5xx)
- `slow_request` - Requests taking >5 seconds
- `slow_database_query` - MongoDB queries taking >1 second
- `operation_*` - Operation-specific timing (e.g., `operation_generate_assignment`)

---

## Setup

### 1. Create Application Insights Resource

```bash
# Azure Portal
1. Navigate to Azure Portal > Create Resource > Application Insights
2. Select Resource Group, Region, Name
3. Copy Connection String from Overview page

# Azure CLI
az monitor app-insights component create \
  --app ai-assessment-backend \
  --location eastus \
  --resource-group ai-assessment-rg \
  --application-type web
```

### 2. Configure Backend

Add to `backend/.env`:

```bash
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

### 3. Verify Data Collection

Start backend and check Azure Portal:

- Navigate to Application Insights > Live Metrics
- Send test requests
- Verify data appears in Live Metrics Stream

---

## Key Metrics

### Performance Metrics

- **Average Response Time**: Track overall API performance
- **P95 Response Time**: Identify outliers
- **OpenAI API Duration**: Monitor AI service latency
- **Database Query Duration**: MongoDB performance

### Usage Metrics

- **Requests per minute**: API throughput
- **AI Chat Requests**: Student AI usage
- **Submissions per hour**: Assignment completion rate
- **OpenAI Token Usage**: Cost tracking

### Reliability Metrics

- **Error Rate**: HTTP 5xx errors / total requests
- **AI Chat Error Rate**: Failed AI interactions
- **Availability**: Uptime percentage

---

## Kusto Queries

### 1. HTTP Response Time - Overall Performance

**Average response time by route (last 24 hours):**

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(24h)
| summarize
    Avg_ms = avg(value),
    P50_ms = percentile(value, 50),
    P95_ms = percentile(value, 95),
    P99_ms = percentile(value, 99),
    Count = count()
  by route = tostring(customDimensions.route)
| order by Avg_ms desc
| project route, Avg_ms, P50_ms, P95_ms, P99_ms, Count
```

**Response time trend (last 7 days):**

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(7d)
| summarize Avg_ms = avg(value) by bin(timestamp, 1h)
| render timechart
```

**Slow requests (>5 seconds):**

```kusto
customEvents
| where name == "slow_request"
| where timestamp > ago(24h)
| extend
    route = tostring(customDimensions.route),
    duration_ms = todouble(customMeasurements.duration),
    userId = tostring(customDimensions.userId)
| project timestamp, route, duration_ms, userId
| order by duration_ms desc
```

---

### 2. OpenAI API Monitoring

**OpenAI call duration and token usage:**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where timestamp > ago(24h)
| extend
    model = tostring(customDimensions.model),
    totalTokens = toint(customDimensions.totalTokens),
    promptTokens = toint(customDimensions.promptTokens),
    completionTokens = toint(customDimensions.completionTokens)
| summarize
    AvgDuration_ms = avg(duration),
    TotalCalls = count(),
    TotalTokens = sum(totalTokens),
    AvgTokensPerCall = avg(totalTokens),
    FailureCount = countif(success == false)
  by model
| extend SuccessRate = (TotalCalls - FailureCount) * 100.0 / TotalCalls
| project model, AvgDuration_ms, TotalCalls, TotalTokens, AvgTokensPerCall, SuccessRate
```

**OpenAI token usage over time (cost estimation):**

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(7d)
| extend totalTokens = toint(customMeasurements.totalTokens)
| summarize TotalTokens = sum(totalTokens) by bin(timestamp, 1h)
| extend EstimatedCost_USD = TotalTokens * 0.00003  // GPT-4 pricing: ~$0.03/1K tokens
| render timechart
```

**OpenAI errors:**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where success == false
| where timestamp > ago(24h)
| extend
    endpoint = name,
    error = tostring(customDimensions.error),
    submissionId = tostring(customDimensions.submissionId)
| project timestamp, endpoint, duration, error, submissionId
| order by timestamp desc
```

---

### 3. AI Chat Usage Analytics

**AI chat requests per student:**

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(7d)
| extend studentId = tostring(customDimensions.studentId)
| summarize
    ChatCount = count(),
    UniqueSubmissions = dcount(tostring(customDimensions.submissionId))
  by studentId
| order by ChatCount desc
| take 20
```

**AI chat usage distribution:**

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(24h)
| summarize ChatRequests = count() by bin(timestamp, 1h)
| render timechart
```

**AI chat error rate:**

```kusto
let totalChats = customEvents
| where name == "ai_chat_request"
| where timestamp > ago(24h)
| count;
let errorChats = customEvents
| where name == "ai_chat_error"
| where timestamp > ago(24h)
| count;
print
    TotalChats = totalChats,
    ErrorChats = errorChats,
    ErrorRate_Percent = (errorChats * 100.0) / totalChats
```

**Most common AI chat errors:**

```kusto
customEvents
| where name == "ai_chat_error"
| where timestamp > ago(7d)
| extend errorType = tostring(customDimensions.errorType)
| summarize ErrorCount = count() by errorType
| order by ErrorCount desc
```

---

### 4. Submission Analytics

**Submissions per day:**

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(30d)
| summarize SubmissionCount = count() by bin(timestamp, 1d)
| render timechart
```

**Submission statistics (scores, AI usage):**

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(7d)
| extend
    finalScore = todouble(customMeasurements.finalScore),
    aiSkillScore = todouble(customMeasurements.aiSkillScore),
    aiInteractions = toint(customDimensions.aiInteractionsCount)
| summarize
    AvgFinalScore = avg(finalScore),
    AvgAISkillScore = avg(aiSkillScore),
    AvgAIInteractions = avg(aiInteractions),
    TotalSubmissions = count()
| project AvgFinalScore, AvgAISkillScore, AvgAIInteractions, TotalSubmissions
```

**Correlation: AI usage vs final score:**

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(7d)
| extend
    finalScore = todouble(customMeasurements.finalScore),
    aiInteractions = toint(customDimensions.aiInteractionsCount)
| summarize AvgScore = avg(finalScore) by AIUsageBucket = case(
    aiInteractions == 0, "No AI",
    aiInteractions <= 5, "1-5 interactions",
    aiInteractions <= 10, "6-10 interactions",
    aiInteractions <= 20, "11-20 interactions",
    "20+ interactions"
  )
| render columnchart
```

---

### 5. Assignment Generation Monitoring

**Assignment generation time:**

```kusto
customEvents
| where name == "assignment_generated"
| where timestamp > ago(7d)
| extend
    questionType = tostring(customDimensions.questionType),
    generationTime = todouble(customMeasurements.generationTime)
| summarize
    AvgTime_ms = avg(generationTime),
    P95Time_ms = percentile(generationTime, 95),
    Count = count()
  by questionType
| project questionType, AvgTime_ms, P95Time_ms, Count
```

**Questions generated per document type:**

```kusto
customEvents
| where name == "assignment_generated"
| where timestamp > ago(30d)
| extend
    docType = tostring(customDimensions.documentType),
    questionsGenerated = toint(customMeasurements.questionsGenerated)
| summarize
    TotalAssignments = count(),
    AvgQuestions = avg(questionsGenerated),
    TotalQuestions = sum(questionsGenerated)
  by docType
| project docType, TotalAssignments, AvgQuestions, TotalQuestions
```

---

### 6. Database Performance

**Slow database queries:**

```kusto
customEvents
| where name == "slow_database_query"
| where timestamp > ago(24h)
| extend
    query = tostring(customDimensions.query),
    duration_ms = todouble(customMeasurements.duration)
| summarize
    AvgDuration_ms = avg(duration_ms),
    MaxDuration_ms = max(duration_ms),
    Count = count()
  by query
| order by AvgDuration_ms desc
```

**MongoDB dependency tracking:**

```kusto
dependencies
| where dependencyType == "MongoDB"
| where timestamp > ago(24h)
| summarize
    AvgDuration_ms = avg(duration),
    P95Duration_ms = percentile(duration, 95),
    TotalCalls = count(),
    FailureCount = countif(success == false)
  by name
| extend SuccessRate = (TotalCalls - FailureCount) * 100.0 / TotalCalls
| order by AvgDuration_ms desc
```

---

### 7. Error Monitoring

**HTTP errors by status code:**

```kusto
customEvents
| where name == "http_error"
| where timestamp > ago(24h)
| extend statusCode = tostring(customDimensions.statusCode)
| summarize ErrorCount = count() by statusCode, route = tostring(customDimensions.route)
| order by ErrorCount desc
```

**Error rate over time:**

```kusto
let allRequests = customEvents
| where name == "http_request"
| where timestamp > ago(7d)
| summarize TotalRequests = count() by bin(timestamp, 1h);
let errorRequests = customEvents
| where name == "http_error"
| where timestamp > ago(7d)
| summarize ErrorRequests = count() by bin(timestamp, 1h);
allRequests
| join kind=leftouter (errorRequests) on timestamp
| extend ErrorRate = (ErrorRequests * 100.0) / TotalRequests
| project timestamp, ErrorRate
| render timechart
```

**Exceptions:**

```kusto
exceptions
| where timestamp > ago(24h)
| extend errorMessage = tostring(outerMessage)
| summarize Count = count() by errorMessage
| order by Count desc
| take 10
```

---

### 8. Memory Usage

**Memory consumption trend:**

```kusto
customMetrics
| where name startswith "memory_"
| where timestamp > ago(24h)
| summarize AvgValue_MB = avg(value) by name, bin(timestamp, 5m)
| render timechart
```

**Current memory usage:**

```kusto
customMetrics
| where name in ("memory_heap_used_mb", "memory_heap_total_mb", "memory_rss_mb")
| where timestamp > ago(10m)
| summarize AvgValue_MB = avg(value), MaxValue_MB = max(value) by name
```

---

## Dashboard Widgets

### Recommended Dashboard Layout

**1. Overview Row**

- Metric: Total Requests (last 24h)
- Metric: Average Response Time (last 24h)
- Metric: Error Rate % (last 24h)
- Metric: AI Chat Requests (last 24h)

**2. Performance Row**

- Chart: Response Time Trend (last 7 days)
- Chart: OpenAI Duration Trend (last 7 days)
- Chart: P95 Response Time by Route (bar chart)

**3. AI Usage Row**

- Chart: AI Chat Requests Over Time
- Chart: OpenAI Token Usage (cost estimation)
- Metric: Average AI Interactions per Submission

**4. Submissions Row**

- Chart: Submissions per Day (last 30 days)
- Chart: Average Final Score Trend
- Chart: AI Usage vs Score Correlation

**5. Errors Row**

- Chart: Error Rate Over Time
- Table: Top Errors (last 24h)
- Chart: HTTP Errors by Status Code

**6. System Health Row**

- Chart: Memory Usage Trend
- Metric: Database Query P95 Duration
- Chart: Slow Requests (>5s)

---

## Alerts

### Critical Alerts (PagerDuty/Email)

**1. High Error Rate**

```kusto
let threshold = 5.0;  // 5% error rate
let allRequests = customEvents
| where name == "http_request"
| where timestamp > ago(5m)
| count;
let errorRequests = customEvents
| where name == "http_error"
| where timestamp > ago(5m)
| count;
let errorRate = (errorRequests * 100.0) / allRequests;
errorRate > threshold
```

**2. OpenAI API Failures**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where timestamp > ago(5m)
| where success == false
| count > 3  // More than 3 failures in 5 minutes
```

**3. Response Time Degradation**

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(5m)
| summarize P95_ms = percentile(value, 95)
| where P95_ms > 5000  // P95 exceeds 5 seconds
```

**4. Memory Leak Detection**

```kusto
customMetrics
| where name == "memory_heap_used_mb"
| where timestamp > ago(30m)
| summarize Trend = linear_fit(value, timestamp)
| where Trend > 1.0  // Continuously increasing
```

### Warning Alerts (Slack/Teams)

**5. Slow Database Queries**

```kusto
customEvents
| where name == "slow_database_query"
| where timestamp > ago(10m)
| count > 5
```

**6. High OpenAI Cost**

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(1h)
| summarize TotalTokens = sum(toint(customMeasurements.totalTokens))
| extend EstimatedCost_USD = TotalTokens * 0.00003
| where EstimatedCost_USD > 10.0  // $10/hour threshold
```

---

## Troubleshooting

### No Data in Application Insights

**1. Check Connection String:**

```bash
# Backend logs should show:
✅ Application Insights initialized successfully
📊 Environment: production
```

**2. Verify Telemetry:**

```kusto
traces
| where timestamp > ago(10m)
| take 10
```

**3. Check Firewall:**

- Ensure backend can reach `https://*.in.applicationinsights.azure.com`

### High Latency

**1. Identify Slow Routes:**

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(1h)
| summarize P95_ms = percentile(value, 95) by route = tostring(customDimensions.route)
| where P95_ms > 3000
```

**2. Check OpenAI Bottleneck:**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where timestamp > ago(1h)
| summarize AvgDuration_ms = avg(duration)
```

**3. Check Database:**

```kusto
dependencies
| where dependencyType == "MongoDB"
| where timestamp > ago(1h)
| summarize P95_ms = percentile(duration, 95)
```

### OpenAI Errors

**1. Check Error Types:**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where success == false
| where timestamp > ago(1h)
| extend error = tostring(customDimensions.error)
| summarize Count = count() by error
```

**2. Check Rate Limiting:**

```kusto
traces
| where message contains "rate limit"
| where timestamp > ago(1h)
```

---

## Best Practices

### 1. Regular Monitoring

- Review dashboards daily
- Set up weekly reports
- Monitor alerts in Slack/Teams

### 2. Cost Optimization

- Track OpenAI token usage
- Set budget alerts in Azure
- Monitor unnecessary logging

### 3. Performance Tuning

- Identify slow routes → optimize code
- Cache frequent queries
- Use CDN for static assets

### 4. Security

- Monitor suspicious activity (rapid requests)
- Track failed authentication attempts
- Alert on unusual AI usage patterns

---

## Additional Resources

- [Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Kusto Query Language (KQL)](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/)
- [Azure Dashboard Creation](https://docs.microsoft.com/en-us/azure/azure-portal/azure-portal-dashboards)
- [Alert Rules](https://docs.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)

---

## Contact

For questions about Application Insights setup:

- Check backend logs for initialization errors
- Verify `APPINSIGHTS_CONNECTION_STRING` in `.env`
- Review this guide's troubleshooting section
