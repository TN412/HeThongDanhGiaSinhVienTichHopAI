# Security Documentation 🔐

**Last Updated:** November 13, 2025  
**Version:** 1.0.0

---

## Overview

This document outlines the security measures implemented in the AI-Integrated Student Assessment System. The system follows industry best practices for web application security, including OWASP Top 10 protection.

---

## Table of Contents

1. [HTTP Security Headers (Helmet)](#http-security-headers-helmet)
2. [Rate Limiting](#rate-limiting)
3. [File Upload Security](#file-upload-security)
4. [CORS Configuration](#cors-configuration)
5. [Error Handling](#error-handling)
6. [Authentication & Authorization](#authentication--authorization)
7. [Environment Variables](#environment-variables)
8. [Security Checklist](#security-checklist)

---

## HTTP Security Headers (Helmet)

**Package:** `helmet` v7.x  
**Location:** `src/middleware/security.js`

### Configured Headers

#### 1. Content Security Policy (CSP)

```javascript
{
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"]
}
```

**Protection:** Prevents XSS attacks by restricting resource loading sources.

#### 2. HTTP Strict Transport Security (HSTS)

```javascript
{
  maxAge: 31536000,        // 1 year
  includeSubDomains: true,
  preload: true
}
```

**Protection:** Forces HTTPS connections, prevents man-in-the-middle attacks.

#### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

**Protection:** Prevents clickjacking attacks by disallowing iframe embedding.

#### 4. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Protection:** Prevents MIME type sniffing attacks.

#### 5. Referrer-Policy

```
Referrer-Policy: no-referrer
```

**Protection:** Prevents leaking sensitive information in referrer headers.

#### 6. Cross-Origin Policies

```javascript
crossOriginEmbedderPolicy: false,  // For Azure Blob Storage compatibility
crossOriginResourcePolicy: "cross-origin"
```

#### 7. Hide Powered-By

```
X-Powered-By: (removed)
```

**Protection:** Prevents attackers from knowing the server technology stack.

### Usage

Automatically applied to all routes via `app.js`:

```javascript
const { helmetConfig } = require('./middleware/security');
app.use(helmetConfig);
```

---

## Rate Limiting

**Package:** `express-rate-limit` v7.x  
**Location:** `src/middleware/security.js`

### 1. General API Rate Limiter

**Applies to:** All `/api/*` routes (except health checks)  
**Limit:** 100 requests per 15 minutes per IP  
**Environment:** Production only

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
```

**Usage:**

```javascript
// In app.js
if (process.env.NODE_ENV === 'production') {
  app.use('/api', generalLimiter);
}
```

### 2. Authentication Rate Limiter

**Applies to:** `/api/auth/*` routes  
**Limit:** 5 login attempts per 15 minutes per IP  
**Purpose:** Prevent brute force attacks

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true, // Only count failed attempts
});
```

**Usage:**

```javascript
// In routes/index.js
router.use('/auth', authLimiter, authRoutes);
```

**Response when limit exceeded:**

```json
{
  "success": false,
  "error": "Too many login attempts, please try again after 15 minutes."
}
```

### 3. AI Chat Rate Limiter ⭐

**Applies to:** `/api/ai/chat` endpoint  
**Limit:** 20 requests per 30 minutes per submission  
**Key:** Composite `IP + submissionId`  
**Purpose:** Prevent AI cost explosion and encourage quality prompts

```javascript
const aiChatLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 20, // 20 AI interactions
  keyGenerator: req => {
    const submissionId = req.body.submissionId || 'unknown';
    const ip = req.ip;
    return `${ip}-${submissionId}`;
  },
});
```

**Why per submission?**

- Prevents students from exhausting AI quota on one assignment
- Encourages thoughtful, comprehensive questions
- Tracks AI usage per assignment attempt

**Usage:**

```javascript
// In routes/ai.js
router.post('/chat', aiChatLimiter, auth.student, async (req, res) => {
  // AI chat handler
});
```

**Response when limit exceeded:**

```json
{
  "success": false,
  "error": "Too many AI chat requests for this submission. Please wait 30 minutes before continuing.",
  "hint": "Try to ask more comprehensive questions to reduce the number of interactions.",
  "retryAfter": 30
}
```

### 4. File Upload Rate Limiter

**Applies to:** `/api/assignment/generate` (document upload)  
**Limit:** 10 uploads per hour per IP  
**Purpose:** Prevent storage abuse

```javascript
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads
});
```

### 5. AI Generation Rate Limiter

**Applies to:** `/api/assignment/generate` (AI question generation)  
**Limit:** 5 generations per hour per IP  
**Purpose:** Control OpenAI API costs

```javascript
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 AI generations
});
```

**Usage:**

```javascript
// In routes/assignment.js
router.post(
  '/generate',
  uploadLimiter,
  aiGenerationLimiter,
  auth.instructor,
  upload.single('document')
  // ... handler
);
```

### Rate Limit Headers

All rate limiters include standard headers:

```http
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: 1699876543
```

---

## File Upload Security

**Package:** `multer` v1.4.x + `file-type` v19.x  
**Location:** `src/middleware/upload.js`

### 1. File Size Limits

```javascript
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
```

**Default:** 10 MB  
**Configurable via:** `MAX_FILE_SIZE_MB` environment variable

**Response when exceeded:**

```json
{
  "success": false,
  "error": "File size exceeds limit of 10MB"
}
```

### 2. Allowed File Types

```javascript
const ALLOWED_MIMETYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};
```

**Protection:** Prevents malicious file types (executables, scripts, etc.)

### 3. Magic Bytes Validation ⭐

Validates file content matches declared MIME type by checking magic bytes (file signatures):

```javascript
const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4b, 0x03, 0x04], // PK.. (ZIP signature)
  txt: null, // Text files vary
};

function validateMagicBytes(buffer, expectedType) {
  if (expectedType === 'txt') return true;

  const magicBytes = MAGIC_BYTES[expectedType];
  for (let i = 0; i < magicBytes.length; i++) {
    if (buffer[i] !== magicBytes[i]) {
      return false;
    }
  }
  return true;
}
```

**Why this matters:**

- Attackers can rename `.exe` to `.pdf` to bypass MIME type checks
- Magic bytes verification ensures file content is genuinely what it claims to be
- Prevents malicious file uploads disguised as documents

**Usage:**

```javascript
router.post(
  '/generate',
  upload.single('document'),
  validateFileContent, // Checks magic bytes
  async (req, res) => {
    // File is verified safe
  }
);
```

### 4. Filename Sanitization ⭐

```javascript
function sanitizeFilename(filename) {
  // Remove path traversal characters (../, ..\, etc.)
  let sanitized = filename.replace(/[\/\\\.\.]/g, '');

  // Only allow alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // Remove consecutive dots (prevents ../)
  sanitized = sanitized.replace(/\.{2,}/g, '.');

  // Limit length to 255 chars
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 240);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}
```

**Prevents:**

- Path traversal attacks (`../../etc/passwd`)
- Command injection (`file; rm -rf /`)
- Special character exploits
- Overly long filenames

**Example:**

```javascript
// Before: "../../../etc/passwd.pdf"
// After: "etcpasswd.pdf"

// Before: "file; rm -rf /.pdf"
// After: "file_rm_-rf_.pdf"
```

**Usage:**

```javascript
router.post(
  '/generate',
  upload.single('document'),
  sanitizeUploadedFile, // Sanitizes filename
  async (req, res) => {
    // req.file.originalname is now safe
    // req.file.safeName includes timestamp
  }
);
```

### 5. Extension vs MIME Type Match

```javascript
const fileExt = file.originalname.split('.').pop().toLowerCase();
const expectedExt = ALLOWED_MIMETYPES[file.mimetype];

if (fileExt !== expectedExt) {
  return cb(new Error('File extension does not match MIME type'));
}
```

**Prevents:** Uploading `malware.exe` renamed to `document.pdf`

### Complete Upload Security Flow

```
1. Client uploads file
   ↓
2. multer fileFilter checks MIME type
   ↓
3. multer checks file size (< 10MB)
   ↓
4. sanitizeFilename removes dangerous characters
   ↓
5. validateFileContent checks magic bytes
   ↓
6. File stored in memory buffer (not disk)
   ↓
7. Extract text for AI processing
   ↓
8. Upload to Azure Blob Storage with safe filename
   ↓
9. Delete buffer from memory
```

---

## CORS Configuration

**Package:** `cors` v2.x  
**Location:** `src/middleware/cors.js`

### Strict CORS Policy

```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [FRONTEND_URL];

// Development only: Add localhost variants
if (NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173');
}
```

### Configuration

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Reject no-origin requests in production
    if (!origin && NODE_ENV === 'production') {
      return callback(new Error('No origin header'));
    }

    // Check whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked: ${origin}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true, // Allow cookies (JWT refresh tokens)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 600, // Cache preflight 10 minutes
};
```

### Key Features

1. **Whitelist-based:** Only `FRONTEND_URL` is allowed in production
2. **Credentials:** Supports `httpOnly` cookies for refresh tokens
3. **No wildcard:** Never uses `origin: '*'` for security
4. **Logging:** Logs blocked requests for monitoring

### Environment-Specific Behavior

| Environment | No Origin  | Localhost  | Production URL |
| ----------- | ---------- | ---------- | -------------- |
| Development | ✅ Allowed | ✅ Allowed | ✅ Allowed     |
| Production  | ❌ Blocked | ❌ Blocked | ✅ Allowed     |

### Configuration

**Set in `.env`:**

```bash
FRONTEND_URL=https://your-frontend.azurestaticapps.net
```

**In Azure App Service:**

```bash
az webapp config appsettings set \
  --name your-backend-app \
  --resource-group your-rg \
  --settings FRONTEND_URL=https://your-frontend.azurestaticapps.net
```

---

## Error Handling

**Location:** `src/middleware/errorHandler.js`

### Stack Trace Protection ⭐

```javascript
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Production: Hide sensitive details
  console.error('🔥 Error:', {
    message: err.message,
    statusCode: err.status || 500,
    path: req.path,
    userId: req.user?.id || 'anonymous',
  });
} else {
  // Development: Full details
  console.error('🔥 Error:', {
    message: err.message,
    stack: err.stack,
    body: req.body,
  });
}
```

### Production Error Response

```javascript
// Hide internal errors
const errorResponse = {
  success: false,
  error: {
    message:
      isProduction && statusCode === 500
        ? 'Internal Server Error' // Generic message
        : message, // Specific message
    status: statusCode,
  },
};

// NO stack trace in production
if (!isProduction && err.stack) {
  errorResponse.error.stack = err.stack;
}
```

**Development Response:**

```json
{
  "success": false,
  "error": {
    "message": "MongoDB connection failed",
    "status": 500,
    "stack": "Error: MongoDB connection failed\n    at connectDB (database.js:15:12)\n    ..."
  }
}
```

**Production Response:**

```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error",
    "status": 500
  }
}
```

### Error Types Handled

1. **Validation Errors** (400)
2. **Duplicate Key Errors** (409)
3. **JWT Errors** (401)
4. **CORS Errors** (403)
5. **Rate Limit Errors** (429)
6. **Cast Errors** (400)
7. **Generic Errors** (500)

---

## Authentication & Authorization

**Location:** `src/middleware/auth.js`

### JWT Security

1. **Access Token:** Short-lived (15 minutes), in `Authorization` header
2. **Refresh Token:** Long-lived (7 days), in `httpOnly` cookie
3. **Secret Rotation:** Recommended every 90 days

### Password Security

```javascript
// Bcrypt with cost factor 10
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
```

**Cost factor 10:** Balances security and performance (~100ms hashing time)

### Role-Based Access Control (RBAC)

```javascript
// Middleware guards
auth.authenticate; // Any authenticated user
auth.student; // Only students
auth.instructor; // Only instructors
```

**Usage:**

```javascript
router.get('/assignments', auth.student, async (req, res) => {
  // Only students can access
});

router.post('/assignment/generate', auth.instructor, async (req, res) => {
  // Only instructors can access
});
```

---

## Environment Variables

### Required for Production

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true

# JWT Secrets (rotate every 90 days)
JWT_SECRET=<32-char-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# CORS
FRONTEND_URL=https://your-frontend.azurestaticapps.net

# Environment
NODE_ENV=production

# File Upload
MAX_FILE_SIZE_MB=10

# Rate Limiting
MAX_AI_PROMPTS_PER_SUBMISSION=50
MAX_AI_PROMPTS_PER_QUESTION=10
```

### Generate Secrets

```bash
# JWT_SECRET (32-byte base64)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Never Commit

❌ **NEVER commit to Git:**

- `.env` file
- API keys
- Database passwords
- Connection strings

✅ **Use instead:**

- GitHub Secrets (CI/CD)
- Azure Key Vault (production)
- `.env.example` template

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] JWT secrets are random and secure
- [ ] `NODE_ENV=production` is set
- [ ] CORS `FRONTEND_URL` is correct
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Rate limiters enabled in production
- [ ] File upload size limits configured
- [ ] Database connection uses SSL/TLS
- [ ] Azure Blob Storage uses private containers
- [ ] No hardcoded secrets in code

### Post-Deployment

- [ ] Health checks responding
- [ ] CORS working correctly (no console errors)
- [ ] Rate limiters triggering appropriately
- [ ] File uploads working with validation
- [ ] AI chat rate limiting per submission
- [ ] Error responses don't leak stack traces
- [ ] Helmet headers present in responses
- [ ] Authentication tokens working
- [ ] Monitoring/logging enabled (Azure App Insights)

### Monitoring

- [ ] Set up alerts for rate limit violations
- [ ] Monitor failed authentication attempts
- [ ] Track AI API usage and costs
- [ ] Log security events (suspicious activity)
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning (`npm audit`)

### Regular Maintenance

- [ ] **Monthly:** Check for dependency updates
- [ ] **Quarterly:** Rotate JWT secrets
- [ ] **Quarterly:** Review rate limit thresholds
- [ ] **Bi-annually:** Rotate database passwords
- [ ] **Annually:** Security penetration testing

---

## Security Testing

### Test Rate Limiters

```bash
# Test auth rate limiter (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Attempt $i"
done
```

### Test CORS

```bash
# Should be blocked (wrong origin)
curl -X GET http://localhost:5000/api/health \
  -H "Origin: https://evil.com" \
  -v

# Should succeed
curl -X GET http://localhost:5000/api/health \
  -H "Origin: http://localhost:5173" \
  -v
```

### Test File Upload

```bash
# Should be rejected (wrong file type)
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@malware.exe" \
  -F "questionType=multiple-choice"

# Should be rejected (file too large)
dd if=/dev/zero of=large.pdf bs=1M count=15
curl -X POST http://localhost:5000/api/assignment/generate \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@large.pdf" \
  -F "questionType=multiple-choice"
```

### Test AI Chat Rate Limit

```bash
# Should block after 20 requests in 30 minutes
for i in {1..25}; do
  curl -X POST http://localhost:5000/api/ai/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\":\"Test $i\",\"submissionId\":\"$SUBMISSION_ID\"}"
  echo "Request $i"
done
```

---

## Incident Response

### If Security Breach Detected

1. **Immediate Actions:**
   - Rotate all secrets (JWT, database, API keys)
   - Review access logs
   - Disable compromised accounts
   - Notify affected users

2. **Investigation:**
   - Check error logs for unusual patterns
   - Review rate limit violations
   - Analyze failed authentication attempts
   - Check file upload logs

3. **Recovery:**
   - Patch vulnerabilities
   - Update dependencies
   - Deploy fixes
   - Monitor closely

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [CORS Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Azure Security Best Practices](https://learn.microsoft.com/en-us/azure/security/fundamentals/best-practices-and-patterns)

---

**Security Contact:** Your security team email  
**Last Security Audit:** November 2025  
**Next Audit Due:** February 2026
