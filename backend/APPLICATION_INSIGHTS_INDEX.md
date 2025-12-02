# Application Insights Documentation Index

Quick navigation for all Application Insights documentation.

## 🚀 Quick Start (15 minutes)

**Start here if you're new to Application Insights**

📖 [APPLICATION_INSIGHTS_QUICKSTART.md](./APPLICATION_INSIGHTS_QUICKSTART.md)

- Step-by-step Azure setup
- Backend configuration
- Dashboard creation
- Alert setup
- Testing guide

## 📊 Full Documentation (Reference)

**Complete guide with 50+ Kusto queries**

📖 [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md)

- Overview of tracked metrics
- Comprehensive Kusto query library
- Dashboard widget examples
- Alert configurations
- Troubleshooting guide
- Best practices

## 📋 Implementation Summary

**Technical details of what was implemented**

📖 [APPLICATION_INSIGHTS_SUMMARY.md](./APPLICATION_INSIGHTS_SUMMARY.md)

- Architecture overview
- Files created/modified
- Features implemented
- Custom events reference
- Configuration options
- Cost estimation

## ✅ Deployment Checklist

**Step-by-step production deployment guide**

📖 [APPLICATION_INSIGHTS_CHECKLIST.md](./APPLICATION_INSIGHTS_CHECKLIST.md)

- Pre-deployment tasks
- Deployment steps
- Post-deployment verification
- Weekly monitoring tasks
- Troubleshooting guide
- Success metrics

## 🧪 Testing

**Verify integration works correctly**

```bash
npm run test:appinsights
```

Test script: [test-app-insights.js](./test-app-insights.js)

- Loads all modules
- Verifies exports
- Tests tracking functions
- 15 comprehensive tests

## 📁 Code Files

### Configuration

- `src/config/appInsights.js` - App Insights setup and tracking functions
  - `initializeAppInsights()` - Initialize SDK
  - `trackEvent()` - Track custom events
  - `trackOpenAICall()` - Track OpenAI API calls
  - `trackAIChatRequest()` - Track AI chat usage
  - `trackAIChatError()` - Track AI errors
  - `trackSubmissionSubmitted()` - Track submissions
  - `trackAssignmentGeneration()` - Track generation
  - `trackMetric()` - Track custom metrics
  - `trackException()` - Track exceptions
  - `flush()` - Flush telemetry on shutdown

### Middleware

- `src/middleware/monitoring.js` - Request timing and monitoring
  - `requestTimingMiddleware` - Track all HTTP requests
  - `healthCheckTimingMiddleware` - Track health checks
  - `trackOperationTiming()` - Track specific operations
  - `trackDatabaseQuery()` - Track MongoDB queries
  - `trackMemoryUsage()` - Track memory consumption
  - `startMemoryTracking()` - Start periodic memory tracking

### Route Integration

- `src/routes/ai.js` - AI chat tracking
- `src/routes/submission.js` - Submission tracking
- `src/routes/assignment.js` - Generation tracking

### Application

- `src/app.js` - Initialize App Insights, add timing middleware
- `src/server.js` - Memory tracking, graceful shutdown

## 🎯 What's Tracked

### HTTP Metrics

- Response time (all routes, P50/P95/P99)
- Request count per route
- Error rate (4xx, 5xx)
- Slow requests (>5 seconds)

### OpenAI Metrics

- API call duration
- Token usage (prompt, completion, total)
- Cost estimation
- Error rate
- Model usage

### Custom Events

- `ai_chat_request` - Student AI usage
- `ai_chat_error` - AI failures
- `submission_submitted` - Assignment completion
- `assignment_generated` - Auto-generation
- `openai_api_call` - OpenAI usage
- `http_request` - HTTP traffic
- `http_error` - HTTP failures
- `slow_request` - Performance issues
- `slow_database_query` - DB issues

### System Metrics

- Memory usage (heap, RSS)
- CPU usage
- Database query performance
- Dependency tracking (MongoDB, Azure Blob)

## 📖 Common Queries

### Response Time by Route

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(24h)
| summarize Avg=avg(value), P95=percentile(value, 95) by tostring(customDimensions.route)
| order by Avg desc
```

### OpenAI Token Usage & Cost

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(7d)
| summarize TotalTokens = sum(toint(customMeasurements.totalTokens)) by bin(timestamp, 1h)
| extend EstimatedCost_USD = TotalTokens * 0.00003
| render timechart
```

### AI Chat Usage Per Student

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(7d)
| summarize Count = count() by tostring(customDimensions.studentId)
| top 20 by Count
```

### Error Rate

```kusto
let allReq = customEvents | where name == "http_request" | where timestamp > ago(1h) | count;
let errors = customEvents | where name == "http_error" | where timestamp > ago(1h) | count;
print ErrorRate_Percent = (errors * 100.0) / allReq
```

**More queries**: See [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md)

## 🚀 Quick Commands

### Test Integration

```bash
npm run test:appinsights
```

### Start Backend (with monitoring)

```bash
npm run dev
```

### Check Logs

```bash
# Look for:
✅ Application Insights initialized successfully
📊 Environment: production
📊 Memory tracking started (every 5 minutes)
```

## 🔗 Azure Portal Quick Links

After setup, bookmark these:

- **Live Metrics**: App Insights > Live Metrics (real-time data)
- **Logs**: App Insights > Logs (Kusto query editor)
- **Dashboard**: Azure Portal > Dashboard > [Your Dashboard]
- **Alerts**: App Insights > Alerts (alert rules)
- **Usage and Costs**: App Insights > Usage and estimated costs

## 💡 Tips

### For Developers

1. Start with [QUICKSTART](./APPLICATION_INSIGHTS_QUICKSTART.md)
2. Test locally first (no Azure credentials needed)
3. Use `npm run test:appinsights` to verify integration
4. Check console logs for tracking confirmation

### For DevOps

1. Follow [CHECKLIST](./APPLICATION_INSIGHTS_CHECKLIST.md) for deployment
2. Set up alerts immediately after deployment
3. Configure budget alerts to prevent cost overruns
4. Review metrics weekly

### For Analysts

1. Learn Kusto basics: https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/
2. Use query library in [DOCS](./APPLICATION_INSIGHTS.md)
3. Build custom dashboards for stakeholders
4. Export data to Excel/Power BI if needed

## 🆘 Troubleshooting

### No Data Appearing

1. Check connection string in `.env`
2. Verify backend logs show initialization
3. Wait 2-3 minutes for ingestion
4. Check Live Metrics (real-time) first

### High Costs

1. Enable sampling (keep 10-20%)
2. Disable console logs
3. Adjust retention (90d → 30d)
4. Review data cap settings

### Missing Events

1. Verify tracking code is called
2. Check backend logs for errors
3. Query specific event name
4. Check sampling isn't filtering out events

**Full troubleshooting**: See [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md) or [CHECKLIST](./APPLICATION_INSIGHTS_CHECKLIST.md)

## 📧 Support

For issues with Application Insights:

1. Check this documentation index
2. Review specific guide for your task
3. Test locally with `npm run test:appinsights`
4. Check backend logs for errors

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2024  
**Total Pages**: 2000+ lines of documentation
