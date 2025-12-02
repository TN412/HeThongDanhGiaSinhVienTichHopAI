# Application Insights - Deployment Checklist

Use this checklist when deploying Application Insights to production.

## Pre-Deployment

### Azure Setup

- [ ] Create Application Insights resource in Azure Portal
- [ ] Copy Connection String from Overview page
- [ ] (Optional) Create Log Analytics Workspace
- [ ] (Optional) Configure data retention (default: 90 days)
- [ ] (Optional) Set daily cap to prevent cost overruns

### Backend Configuration

- [ ] Add `APPINSIGHTS_CONNECTION_STRING` to production `.env` or Azure App Service settings
- [ ] Verify connection string format: `InstrumentationKey=...;IngestionEndpoint=...`
- [ ] Test locally first: `npm run dev` and check console for initialization message
- [ ] Run integration test: `npm run test:appinsights`

### Code Review

- [ ] Review `src/config/appInsights.js` - Ensure sampling settings are appropriate
- [ ] Review `src/middleware/monitoring.js` - Confirm all critical routes tracked
- [ ] Check `src/routes/ai.js` - Verify OpenAI tracking in place
- [ ] Check `src/routes/submission.js` - Verify submission tracking in place
- [ ] Check `src/routes/assignment.js` - Verify generation tracking in place

## Deployment

### Deploy Backend

- [ ] Deploy code with App Insights integration
- [ ] Set `APPINSIGHTS_CONNECTION_STRING` in App Service configuration
- [ ] Restart App Service
- [ ] Check application logs for initialization message:
  ```
  ✅ Application Insights initialized successfully
  📊 Environment: production
  ```

### Verify Telemetry

- [ ] Go to Azure Portal > Application Insights > Live Metrics
- [ ] Wait 2-3 minutes for initial data
- [ ] Send test request to `/api/health`
- [ ] Verify request appears in Live Metrics Stream
- [ ] Check server metrics (CPU, Memory) are being collected

### Test Custom Events

- [ ] Send AI chat request → Check for `ai_chat_request` event
- [ ] Submit assignment → Check for `submission_submitted` event
- [ ] Generate assignment → Check for `assignment_generated` event
- [ ] Query in Logs:
  ```kusto
  customEvents
  | where timestamp > ago(10m)
  | summarize count() by name
  ```

## Post-Deployment

### Build Dashboards

- [ ] Create production dashboard in Azure Portal
- [ ] Add response time chart (by route)
- [ ] Add OpenAI token usage chart (cost estimation)
- [ ] Add AI chat requests chart (usage trends)
- [ ] Add error rate chart (reliability)
- [ ] Add submission count chart (business metrics)
- [ ] Pin dashboard for quick access

### Configure Alerts

- [ ] **Critical**: High error rate (>5% in 5 minutes)
- [ ] **Critical**: OpenAI API failures (>3 in 5 minutes)
- [ ] **Critical**: Response time degradation (P95 >5 seconds)
- [ ] **Warning**: Slow database queries (>5 in 10 minutes)
- [ ] **Warning**: High OpenAI cost (>$10/hour)
- [ ] **Warning**: Memory leak detection (continuous increase)
- [ ] Configure action groups (email, SMS, webhook)
- [ ] Test alerts by triggering conditions

### Documentation

- [ ] Share Application Insights resource URL with team
- [ ] Share dashboard URLs with stakeholders
- [ ] Document Kusto queries for common troubleshooting
- [ ] Create runbook for responding to alerts
- [ ] Schedule weekly review of metrics

### Cost Optimization

- [ ] Review data ingestion in first week
- [ ] If >5GB/month, consider sampling:
  ```javascript
  appInsights.defaultClient.config.samplingPercentage = 20; // Keep 20%
  ```
- [ ] Disable verbose logging if not needed:
  ```javascript
  .setAutoCollectConsole(false, false)
  ```
- [ ] Set budget alerts in Azure Cost Management
- [ ] Review and adjust retention policy if needed

## Weekly Monitoring Tasks

### Performance Review

- [ ] Check average response time trends
- [ ] Identify slow routes (P95 >3 seconds)
- [ ] Review database query performance
- [ ] Check OpenAI API latency

### Usage Analysis

- [ ] Review AI chat usage patterns
- [ ] Analyze submission completion rates
- [ ] Check assignment generation statistics
- [ ] Monitor OpenAI token consumption

### Error Analysis

- [ ] Review error rate trends
- [ ] Investigate new error types
- [ ] Check for failed AI chat requests
- [ ] Verify alert configurations

### Cost Review

- [ ] Check Application Insights costs
- [ ] Estimate OpenAI API costs from token usage
- [ ] Adjust sampling if costs too high
- [ ] Review data retention settings

## Troubleshooting Guide

### No Telemetry Data

**Check:**

1. Connection string is correct in production environment
2. Backend logs show initialization success
3. Firewall allows `*.in.applicationinsights.azure.com`
4. Wait 2-3 minutes for initial ingestion
5. Check Live Metrics (real-time) vs Logs (delayed)

**Debug Query:**

```kusto
traces
| where timestamp > ago(10m)
| take 10
```

### High Costs

**Actions:**

1. Enable sampling to reduce data volume:
   ```javascript
   appInsights.defaultClient.config.samplingPercentage = 10;
   ```
2. Disable console log collection
3. Filter out noisy routes (e.g., `/health`)
4. Reduce retention from 90 days to 30 days
5. Review daily cap settings

### Missing Custom Events

**Check:**

1. Tracking functions are called in code
2. No errors in backend logs
3. Events not filtered by sampling
4. Check specific event name:
   ```kusto
   customEvents
   | where name == "ai_chat_request"
   | where timestamp > ago(1h)
   ```

### Slow Dashboard Queries

**Optimize:**

1. Add time filters: `| where timestamp > ago(24h)`
2. Use summary instead of raw data
3. Limit results: `| take 100`
4. Create materialized views for complex queries

## Success Metrics

After 1 week, you should have:

- [ ] 99%+ data collection success rate
- [ ] <500ms dashboard query response time
- [ ] 0 missed critical alerts
- [ ] Complete visibility into OpenAI costs
- [ ] Clear performance baselines established

After 1 month, you should have:

- [ ] Historical trends for all key metrics
- [ ] Optimized alert thresholds (no false positives)
- [ ] Documented common issues and resolutions
- [ ] Cost-optimized configuration (sampling, retention)
- [ ] Team trained on using dashboards and queries

## Support Resources

- **Azure Portal**: https://portal.azure.com
- **Live Metrics**: App Insights > Live Metrics (left menu)
- **Logs**: App Insights > Logs (left menu)
- **Kusto Documentation**: https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/
- **Application Insights Docs**: https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview

## Contact

For Application Insights issues:

1. Check backend logs for errors
2. Verify connection string in `.env` or App Service settings
3. Review [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md) troubleshooting section
4. Test locally with `npm run test:appinsights`

---

**Last Updated**: 2024
**Version**: 1.0.0
