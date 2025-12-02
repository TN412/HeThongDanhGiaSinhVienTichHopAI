# Application Insights - Quick Start Guide

Fast setup guide for Azure Application Insights monitoring.

## 1. Create App Insights Resource (2 minutes)

### Option A: Azure Portal (Visual)

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** > Search **Application Insights**
3. Fill in:
   - **Resource Group**: `ai-assessment-rg` (or your existing RG)
   - **Name**: `ai-assessment-backend`
   - **Region**: Same as your backend (e.g., East US)
   - **Workspace**: Create new or use existing Log Analytics Workspace
4. Click **Review + Create** > **Create**
5. Wait ~1 minute for deployment
6. Go to resource > **Overview** > Copy **Connection String**

### Option B: Azure CLI (Fast)

```bash
# Create resource
az monitor app-insights component create \
  --app ai-assessment-backend \
  --location eastus \
  --resource-group ai-assessment-rg \
  --application-type web

# Get connection string
az monitor app-insights component show \
  --app ai-assessment-backend \
  --resource-group ai-assessment-rg \
  --query connectionString -o tsv
```

## 2. Configure Backend (30 seconds)

Add to `backend/.env`:

```bash
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=abc123...;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/
```

**Important**: Use `APPINSIGHTS_CONNECTION_STRING` (not the legacy `APPINSIGHTS_INSTRUMENTATIONKEY`)

## 3. Verify Setup (1 minute)

### Start Backend

```bash
cd backend
npm run dev
```

### Expected Console Output

```
📊 Application Insights: Not configured (optional in development)
# OR (if configured):
✅ Application Insights initialized successfully
📊 Environment: development
```

### Check Live Metrics

1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to your App Insights resource
3. Click **Live Metrics** in left menu
4. Send test request:
   ```bash
   curl http://localhost:5000/api/health
   ```
5. You should see:
   - Request appear in Live Metrics Stream
   - Response time tracked
   - Server metrics (CPU, Memory)

## 4. Test Tracking (2 minutes)

### Test AI Chat Tracking

```bash
# Login as student
TOKEN="your-jwt-token"

# Send AI chat request
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is a closure?",
    "submissionId": "673abc123def456789012345"
  }'
```

**Check in Azure Portal:**

- Go to **Logs** > Run query:
  ```kusto
  customEvents
  | where name == "ai_chat_request"
  | where timestamp > ago(5m)
  | take 10
  ```

### Test Submission Tracking

```bash
# Submit assignment
curl -X POST http://localhost:5000/api/submission/123/submit \
  -H "Authorization: Bearer $TOKEN"
```

**Check in Azure Portal:**

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(5m)
| take 10
```

## 5. Build Dashboard (5 minutes)

### Create Dashboard

1. Azure Portal > **Dashboard** (left menu)
2. Click **+ New dashboard** > **Blank dashboard**
3. Name: `AI Assessment Backend`

### Add Key Widgets

**Widget 1: Response Time**

- Click **+ Add** > **Metrics chart**
- Select your App Insights resource
- Metric: `customMetrics/http_response_time`
- Aggregation: Avg
- Time range: Last 24 hours

**Widget 2: OpenAI Token Usage**

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(24h)
| summarize TotalTokens = sum(toint(customMeasurements.totalTokens)) by bin(timestamp, 1h)
```

**Widget 3: AI Chat Requests**

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(24h)
| summarize Count = count() by bin(timestamp, 1h)
```

**Widget 4: Error Rate**

```kusto
let allReq = customEvents | where name == "http_request" | where timestamp > ago(1h) | count;
let errors = customEvents | where name == "http_error" | where timestamp > ago(1h) | count;
print ErrorRate = (errors * 100.0) / allReq
```

## 6. Set Up Alerts (3 minutes)

### Alert 1: High Error Rate

1. App Insights > **Alerts** > **+ Create** > **Alert rule**
2. Scope: Your App Insights resource
3. Condition: Custom log search
4. Query:
   ```kusto
   let allReq = customEvents | where name == "http_request" | where timestamp > ago(5m) | count;
   let errors = customEvents | where name == "http_error" | where timestamp > ago(5m) | count;
   let rate = (errors * 100.0) / allReq;
   rate > 5.0  // Alert if error rate > 5%
   ```
5. Action Group: Email/SMS/Webhook
6. Severity: 2 - Warning
7. **Create alert rule**

### Alert 2: Slow Response Time

1. Same steps as above
2. Query:
   ```kusto
   customMetrics
   | where name == "http_response_time"
   | where timestamp > ago(5m)
   | summarize P95 = percentile(value, 95)
   | where P95 > 5000  // Alert if P95 > 5 seconds
   ```

## 7. Production Deployment

### Update Environment Variable

In Azure App Service:

1. Go to your App Service
2. **Configuration** > **Application settings**
3. Add new setting:
   - Name: `APPINSIGHTS_CONNECTION_STRING`
   - Value: (paste connection string)
4. **Save** and **Restart**

### Verify Production Telemetry

```bash
# SSH into App Service or check logs
az webapp log tail --name your-app-name --resource-group ai-assessment-rg
```

Look for:

```
✅ Application Insights initialized successfully
📊 Environment: production
```

## 8. Monitor OpenAI Costs

### Daily Token Usage

```kusto
customEvents
| where name == "openai_api_call"
| where timestamp > ago(30d)
| summarize TotalTokens = sum(toint(customMeasurements.totalTokens)) by bin(timestamp, 1d)
| extend EstimatedCost_USD = TotalTokens * 0.00003  // GPT-4: ~$0.03/1K tokens
| render timechart
```

### Set Budget Alert

1. App Insights > **Alerts** > **+ Create**
2. Query:
   ```kusto
   customEvents
   | where name == "openai_api_call"
   | where timestamp > ago(1h)
   | summarize Tokens = sum(toint(customMeasurements.totalTokens))
   | extend Cost = Tokens * 0.00003
   | where Cost > 5.0  // Alert if hourly cost > $5
   ```

## Common Issues

### Issue 1: No Data Appearing

**Check:**

1. Connection string in `.env` is correct
2. Backend logs show initialization success
3. Firewall allows `*.in.applicationinsights.azure.com`
4. Wait 2-3 minutes (initial ingestion delay)

**Debug Query:**

```kusto
traces
| where timestamp > ago(10m)
| take 20
```

### Issue 2: Missing Custom Events

**Check:**

1. Code is calling tracking functions:
   ```javascript
   trackAIChatRequest({ ... });
   trackSubmissionSubmitted({ ... });
   ```
2. No errors in backend logs
3. Run specific query:
   ```kusto
   customEvents
   | where timestamp > ago(30m)
   | distinct name
   ```

### Issue 3: High Costs

**Optimize:**

1. Disable console log collection:
   ```javascript
   .setAutoCollectConsole(false, false)
   ```
2. Sample telemetry (keep 10%):
   ```javascript
   appInsights.defaultClient.config.samplingPercentage = 10;
   ```
3. Adjust log retention (Azure Portal > Usage and estimated costs)

## Next Steps

✅ **Setup Complete!**

Now you can:

- View real-time metrics in **Live Metrics Stream**
- Build custom dashboards with Kusto queries
- Set up alerts for critical issues
- Monitor OpenAI token usage and costs
- Analyze student AI usage patterns

📖 **Read full documentation**: [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md)

---

## Quick Reference

### Most Useful Queries

**Response time by route:**

```kusto
customMetrics
| where name == "http_response_time"
| where timestamp > ago(1h)
| summarize Avg=avg(value), P95=percentile(value, 95) by tostring(customDimensions.route)
```

**OpenAI errors:**

```kusto
dependencies
| where dependencyType == "OpenAI"
| where success == false
| where timestamp > ago(1h)
```

**AI chat usage per student:**

```kusto
customEvents
| where name == "ai_chat_request"
| where timestamp > ago(24h)
| summarize Count=count() by tostring(customDimensions.studentId)
| top 10 by Count
```

**Submission statistics:**

```kusto
customEvents
| where name == "submission_submitted"
| where timestamp > ago(7d)
| summarize
    AvgScore = avg(todouble(customMeasurements.finalScore)),
    AvgAIInteractions = avg(toint(customDimensions.aiInteractionsCount))
```

---

**Estimated Setup Time**: 15 minutes total
**Cost**: ~$2-5/month (basic tier) + OpenAI API costs
