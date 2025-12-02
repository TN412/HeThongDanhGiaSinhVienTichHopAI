# GitHub Actions CI/CD Setup Guide

## 📋 Overview

This workflow provides automated **build, test, and deployment** for the AI-Integrated Student Assessment System to Microsoft Azure.

**Pipeline Flow:**

```
Push to main/master
    ↓
[Backend Build & Test] + [Frontend Build & Test] (parallel)
    ↓
Both pass? → Deploy Backend → Deploy Frontend
    ↓
Health Check → Success ✅
```

---

## 🔧 Workflow Features

### ✅ Build & Test Phase

- **Backend:**
  - Node.js 20.x setup with npm caching
  - ESLint code quality check
  - Jest test suite (with MongoDB Memory Server)
  - Code coverage reports
  - Artifact creation for deployment

- **Frontend:**
  - Node.js 20.x setup with npm caching
  - ESLint code quality check
  - Vitest test suite (React Testing Library)
  - Production build with Vite
  - Static files artifact

### 🚀 Deployment Phase

- **Backend → Azure App Service:**
  - Automated deployment with publish profile
  - Environment variables configuration
  - Production dependencies only
  - Application Insights integration

- **Frontend → Azure Static Web Apps:**
  - Pre-built static files deployment
  - CDN distribution
  - Custom domain support

### 🏥 Post-Deployment

- Health check for backend API
- Frontend accessibility verification
- Deployment notifications
- Automatic cleanup on failure

---

## 🔐 Required GitHub Secrets

Navigate to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

### 1. **Database & Storage**

```bash
# MongoDB Connection String (Production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_assessment_prod?retryWrites=true&w=majority

# MongoDB Connection String (Test - Optional)
MONGODB_URI_TEST=mongodb+srv://username:password@cluster.mongodb.net/ai_assessment_test?retryWrites=true&w=majority

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=...;EndpointSuffix=core.windows.net
```

**How to get:**

- **MongoDB Atlas:** Database → Connect → Drivers → Copy connection string
- **Azure Storage:** Storage Account → Access keys → Connection string

---

### 2. **Authentication & Security**

```bash
# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...
```

**How to get:**

- **JWT_SECRET:** Run `openssl rand -base64 32` in terminal
- **OpenAI Key:** https://platform.openai.com/api-keys

---

### 3. **Azure Deployment**

```bash
# Azure App Service (Backend)
AZURE_BACKEND_APP_NAME=your-backend-app-name
AZURE_WEBAPP_PUBLISH_PROFILE=<paste-entire-xml-content-here>

# Azure Static Web Apps (Frontend)
AZURE_STATIC_WEB_APPS_API_TOKEN=your-static-web-apps-deployment-token

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.azurestaticapps.net
```

**How to get:**

**Backend Publish Profile:**

```bash
# Azure Portal:
1. Go to App Service → your-backend-app
2. Click "Download publish profile"
3. Open .PublishSettings file
4. Copy ENTIRE XML content
5. Paste into GitHub Secret AZURE_WEBAPP_PUBLISH_PROFILE
```

**Static Web Apps Token:**

```bash
# Azure Portal:
1. Go to Static Web Apps → your-frontend-app
2. Click "Manage deployment token"
3. Copy the token
4. Paste into GitHub Secret AZURE_STATIC_WEB_APPS_API_TOKEN
```

---

### 4. **Monitoring (Optional)**

```bash
# Azure Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=your-instrumentation-key
```

**How to get:**

```bash
# Azure Portal:
1. Go to Application Insights → your-app-insights
2. Copy "Instrumentation Key" from Overview
```

---

### 5. **Frontend Environment Variables**

```bash
# Backend API URL (for frontend build)
VITE_API_URL=https://your-backend.azurewebsites.net/api
```

---

## 📝 Complete Secrets Checklist

Copy this checklist to track your setup:

```markdown
## Required Secrets

- [ ] MONGODB_URI
- [ ] JWT_SECRET
- [ ] OPENAI_API_KEY
- [ ] AZURE_STORAGE_CONNECTION_STRING
- [ ] AZURE_BACKEND_APP_NAME
- [ ] AZURE_WEBAPP_PUBLISH_PROFILE
- [ ] AZURE_STATIC_WEB_APPS_API_TOKEN
- [ ] FRONTEND_URL

## Optional Secrets

- [ ] MONGODB_URI_TEST (for isolated test database)
- [ ] APPINSIGHTS_INSTRUMENTATIONKEY (for monitoring)
- [ ] VITE_API_URL (defaults to backend URL if not set)
```

---

## 🚀 Azure Resource Setup

### Step 1: Create Azure App Service (Backend)

```bash
# Using Azure CLI
az login

# Create resource group
az group create --name ai-assessment-rg --location eastus

# Create App Service Plan (Linux)
az appservice plan create \
  --name ai-assessment-plan \
  --resource-group ai-assessment-rg \
  --sku B1 \
  --is-linux

# Create Web App (Node.js 20)
az webapp create \
  --name your-backend-app-name \
  --resource-group ai-assessment-rg \
  --plan ai-assessment-plan \
  --runtime "NODE:20-lts"

# Enable CORS
az webapp cors add \
  --name your-backend-app-name \
  --resource-group ai-assessment-rg \
  --allowed-origins https://your-frontend.azurestaticapps.net

# Download publish profile
az webapp deployment list-publishing-profiles \
  --name your-backend-app-name \
  --resource-group ai-assessment-rg \
  --xml > backend-publish-profile.xml
```

---

### Step 2: Create Azure Static Web Apps (Frontend)

```bash
# Using Azure Portal (Recommended):
1. Azure Portal → Create a resource → Static Web Apps
2. Basics:
   - Resource Group: ai-assessment-rg
   - Name: your-frontend-app
   - Region: East US 2
3. Deployment:
   - Source: Other
   - Build Presets: Custom
4. Review + Create

# Get deployment token:
# Portal → Static Web Apps → Manage deployment token → Copy
```

**OR Using Azure CLI:**

```bash
az staticwebapp create \
  --name your-frontend-app \
  --resource-group ai-assessment-rg \
  --location eastus2

# Get deployment token
az staticwebapp secrets list \
  --name your-frontend-app \
  --resource-group ai-assessment-rg \
  --query "properties.apiKey" -o tsv
```

---

### Step 3: Create Azure Storage Account (for documents)

```bash
az storage account create \
  --name yourstorageaccount \
  --resource-group ai-assessment-rg \
  --location eastus \
  --sku Standard_LRS

# Create blob container
az storage container create \
  --name assignment-documents \
  --account-name yourstorageaccount \
  --public-access off

# Get connection string
az storage account show-connection-string \
  --name yourstorageaccount \
  --resource-group ai-assessment-rg \
  --output tsv
```

---

### Step 4: Create MongoDB Atlas Database

```bash
# Using MongoDB Atlas Portal:
1. Go to https://cloud.mongodb.com/
2. Create New Project → "AI Assessment System"
3. Build a Database → Shared (Free) or Dedicated
4. Cloud Provider: Azure, Region: East US
5. Database User: Create username/password
6. Network Access: Add Current IP Address (or 0.0.0.0/0 for Azure)
7. Connect → Drivers → Copy connection string
8. Replace <password> with your actual password
```

---

## 🔄 Workflow Triggers

### Automatic Triggers

```yaml
# Push to main/master branches
push:
  branches: [main, master]

# Pull requests to main/master
pull_request:
  branches: [main, master]
```

### Manual Trigger

```bash
# GitHub UI:
Actions → CI/CD Pipeline → Run workflow → Run workflow

# GitHub CLI:
gh workflow run deploy.yml
```

---

## 📊 Monitoring Deployment

### View Workflow Status

```bash
# GitHub UI:
Repository → Actions → CI/CD Pipeline

# GitHub CLI:
gh run list --workflow=deploy.yml
gh run view <run-id> --log
```

### View Azure Logs

```bash
# Backend logs:
az webapp log tail --name your-backend-app-name --resource-group ai-assessment-rg

# Frontend logs:
# Static Web Apps → Logs in Azure Portal
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Backend Tests Fail - MongoDB Connection**

**Problem:** Tests can't connect to MongoDB Atlas

**Solution:**

```bash
# Option A: Use MongoDB Memory Server (already configured)
# Tests automatically use in-memory DB

# Option B: Set MONGODB_URI_TEST secret
# Create separate test database in Atlas
MONGODB_URI_TEST=mongodb+srv://...test_db
```

#### 2. **Frontend Build Fails - Environment Variables**

**Problem:** `VITE_API_URL` not set

**Solution:**

```bash
# Add to GitHub Secrets:
VITE_API_URL=https://your-backend.azurewebsites.net/api
```

#### 3. **Deployment Fails - Publish Profile Invalid**

**Problem:** Azure publish profile expired or incorrect

**Solution:**

```bash
# Re-download publish profile:
1. Azure Portal → App Service → Download publish profile
2. Copy ENTIRE XML content (including <?xml> tag)
3. Update GitHub Secret AZURE_WEBAPP_PUBLISH_PROFILE
```

#### 4. **CORS Errors After Deployment**

**Problem:** Frontend can't call backend API

**Solution:**

```bash
# Enable CORS in Azure App Service:
az webapp cors add \
  --name your-backend-app-name \
  --resource-group ai-assessment-rg \
  --allowed-origins https://your-frontend.azurestaticapps.net

# Or via Azure Portal:
App Service → CORS → Add allowed origin
```

#### 5. **Health Check Fails**

**Problem:** Deployment succeeded but health check fails

**Solution:**

```bash
# Check backend manually:
curl https://your-backend.azurewebsites.net/health

# Add health endpoint if missing:
# backend/src/routes/health.js
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## 🔒 Security Best Practices

### 1. **Rotate Secrets Regularly**

```bash
# Recommended rotation schedule:
- JWT_SECRET: Every 90 days
- OPENAI_API_KEY: Every 90 days
- Database passwords: Every 180 days
- Publish profiles: When compromised
```

### 2. **Use Separate Environments**

```bash
# Development secrets (optional):
MONGODB_URI_DEV=...
OPENAI_API_KEY_DEV=...

# Production secrets:
MONGODB_URI=...
OPENAI_API_KEY=...
```

### 3. **Network Security**

```bash
# MongoDB Atlas:
- IP Whitelist: Add Azure datacenter IPs
- Enable VPC Peering if using dedicated cluster

# Azure App Service:
- Enable HTTPS only
- Set minimum TLS version to 1.2
- Enable managed identity (optional)
```

---

## 📈 Performance Optimization

### 1. **Cache npm Dependencies**

```yaml
# Already configured in workflow:
- uses: actions/setup-node@v4
  with:
    cache: "npm"
```

### 2. **Parallel Jobs**

```yaml
# Backend and Frontend test in parallel
# Reduces total pipeline time by ~50%
```

### 3. **Conditional Deployment**

```yaml
# Only deploy on push to main/master
# PRs run tests only
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

---

## 🎯 Next Steps After Setup

1. **Test the Pipeline:**

   ```bash
   # Make a small change and push:
   git add .
   git commit -m "test: trigger CI/CD pipeline"
   git push origin main

   # Watch workflow in GitHub Actions tab
   ```

2. **Set Up Branch Protection:**

   ```bash
   # Repository → Settings → Branches → Add rule
   - Require status checks to pass (CI/CD Pipeline)
   - Require pull request reviews
   - Require branches to be up to date
   ```

3. **Configure Notifications:**

   ```bash
   # Repository → Settings → Notifications
   - Enable email notifications for failed workflows
   - Optional: Slack/Teams integration
   ```

4. **Monitor Costs:**
   ```bash
   # Azure Portal → Cost Management
   # GitHub Actions: 2000 minutes/month free (public repos)
   # Private repos: 3000 minutes/month (depends on plan)
   ```

---

## 📚 Additional Resources

- [Azure App Service Docs](https://docs.microsoft.com/azure/app-service/)
- [Azure Static Web Apps Docs](https://docs.microsoft.com/azure/static-web-apps/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)

---

## ✅ Deployment Checklist

Before first deployment, ensure:

```markdown
- [ ] All GitHub Secrets configured
- [ ] Azure App Service created
- [ ] Azure Static Web Apps created
- [ ] Azure Storage Account created
- [ ] MongoDB Atlas database created
- [ ] CORS configured in App Service
- [ ] Health endpoint exists in backend
- [ ] Frontend build configured with API URL
- [ ] Tests passing locally
- [ ] Branch protection rules set (optional)
```

---

## 🎉 Success Indicators

After successful deployment, you should see:

```bash
✅ Backend tests: All passing
✅ Frontend tests: All passing
✅ Backend deployed: https://your-backend.azurewebsites.net
✅ Frontend deployed: https://your-frontend.azurestaticapps.net
✅ Health checks: Passing
✅ Pipeline duration: ~5-10 minutes
```

---

**Pipeline Version:** 1.0.0  
**Last Updated:** 2025-01-13  
**Node Version:** 20.x  
**Azure SDK:** Latest
