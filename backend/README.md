# Backend Structure

## Overview

Backend API for AI-Integrated Student Assessment System using Node.js, Express, and MongoDB.

## Directory Structure

```
backend/
├── src/
│   ├── app.js                  # Express app configuration
│   ├── server.js               # Server startup & MongoDB connection
│   ├── config/
│   │   └── database.js         # MongoDB connection logic
│   ├── middleware/
│   │   ├── cors.js             # CORS configuration
│   │   ├── errorHandler.js    # Global error handler
│   │   └── notFound.js         # 404 handler
│   └── routes/
│       └── index.js            # Health check route
├── .env.example                # Environment variables template
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json                # Dependencies and scripts
```

## Key Components

### `src/server.js`

- Entry point for the application
- Connects to MongoDB once at startup
- Starts Express server on PORT 5000
- Handles graceful shutdown (SIGTERM, SIGINT)
- Error handling for uncaught exceptions

### `src/app.js`

- Express app configuration
- Middleware setup:
  - `express.json()` - Parse JSON bodies
  - `express.urlencoded()` - Parse URL-encoded bodies
  - `cookie-parser` - Parse cookies (for JWT refresh tokens)
  - CORS - Cross-origin resource sharing
  - Request logging (development only)
- Route mounting
- Error handling middleware

### `src/config/database.js`

- MongoDB connection with Mongoose
- Connection event handlers (error, disconnect, reconnect)
- Graceful disconnect on shutdown
- Connection pooling and retry logic

### Middleware

#### `src/middleware/cors.js`

- Configures CORS for frontend URLs
- Allows credentials (cookies)
- Supports multiple origins

#### `src/middleware/errorHandler.js`

- Global error handler
- Handles specific errors:
  - Mongoose validation errors
  - Duplicate key errors (11000)
  - JWT errors (invalid/expired tokens)
  - Cast errors (invalid ObjectId)
- Returns consistent JSON error responses

#### `src/middleware/notFound.js`

- 404 handler for undefined routes
- Returns JSON response with request details

### Routes

#### `src/routes/index.js`

- Health check endpoint: `GET /api/health`
- Returns server status and timestamp

## Environment Variables

Create `.env` file in backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_assessment_system

# JWT
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
FRONTEND_URL=http://localhost:5173

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=assignment-documents
```

## Running the Server

### Development

```bash
npm run dev
```

Runs with nodemon for auto-restart on file changes.

### Production

```bash
npm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

**Response:**

```json
{
  "success": true,
  "message": "AI Assessment System API is running",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

### Root

```
GET /
```

**Response:**

```json
{
  "success": true,
  "message": "AI-Integrated Student Assessment System API",
  "version": "1.0.0",
  "documentation": "/api/health",
  "endpoints": {
    "health": "GET /api/health"
  }
}
```

## Error Handling

All errors return consistent JSON format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "status": 400,
    "details": ["Additional error details"]
  }
}
```

### Error Types

- **400 Bad Request**: Validation errors, invalid data
- **401 Unauthorized**: Invalid/expired JWT tokens
- **403 Forbidden**: CORS policy violations
- **404 Not Found**: Route not found
- **409 Conflict**: Duplicate key errors
- **500 Internal Server Error**: Unexpected errors

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Root endpoint
curl http://localhost:5000/

# Non-existent route (should return 404)
curl http://localhost:5000/api/nonexistent
```

### Expected Output on Startup

```
==================================================
🚀 AI Assessment System Backend Server
==================================================
📍 Server running at: http://localhost:5000
🌍 Environment: development
🔗 Health check: http://localhost:5000/api/health
==================================================

✅ MongoDB connected successfully
📊 Database: ai_assessment_system
🌐 Host: cluster.mongodb.net
```

## Graceful Shutdown

The server handles shutdown signals gracefully:

1. Receives SIGTERM/SIGINT signal
2. Stops accepting new connections
3. Closes existing connections
4. Disconnects from MongoDB
5. Exits process

Press `Ctrl+C` to trigger graceful shutdown.

## Next Steps

1. Add authentication routes (`/api/auth`)
2. Add assignment routes (`/api/assignment`)
3. Add submission routes (`/api/submission`)
4. Add AI chat routes (`/api/ai`)
5. Add analytics routes (`/api/analytics`)
6. Create Mongoose models
7. Add authentication middleware
8. Add file upload handling

## Security

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation including:

- 🔒 **HTTP Security Headers** - Helmet configuration (CSP, HSTS, etc.)
- 🚦 **Rate Limiting** - AI chat (20/30min per submission), Auth (5/15min), Uploads (10/hour)
- 📁 **File Upload Security** - Magic bytes validation, filename sanitization, size limits
- 🌐 **CORS Configuration** - Strict whitelist, credentials support
- 🐛 **Error Handling** - Stack traces hidden in production
- 🔐 **Authentication** - JWT with refresh tokens, bcrypt password hashing
- 📋 **Security Checklist** - Pre/post deployment tasks

## Monitoring & Observability

See [APPLICATION_INSIGHTS.md](./APPLICATION_INSIGHTS.md) for Azure Application Insights setup and Kusto queries.

### Key Metrics Tracked

- **HTTP Response Time** - All routes, P50/P95/P99 percentiles
- **OpenAI API Calls** - Duration, token usage, cost estimation
- **AI Chat Usage** - Requests per student, error rate
- **Submissions** - Per day, average scores, AI usage correlation
- **Database Performance** - Query duration, slow queries
- **Memory Usage** - Heap, RSS (every 5 minutes)

### Custom Events

- `ai_chat_request` - Student asks AI during assignment
- `ai_chat_error` - AI chat fails
- `submission_submitted` - Student submits assignment
- `assignment_generated` - Instructor generates assignment
- `openai_api_call` - OpenAI API call with token usage
- `http_error` - HTTP errors (4xx, 5xx)
- `slow_request` - Requests >5 seconds

### Quick Setup

1. Create Application Insights resource in Azure Portal
2. Copy Connection String
3. Add to `.env`:
   ```bash
   APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
   ```
4. Restart backend - metrics will appear in Live Metrics Stream
5. Build dashboards using Kusto queries from docs

**Quick Reference:**

- Rate limit for AI chat: **20 requests per 30 minutes per submission**
- File upload limit: **10 MB** (configurable via `MAX_FILE_SIZE_MB`)
- Allowed file types: **PDF, DOCX, TXT** (validated by MIME type + magic bytes)
- CORS: Only `FRONTEND_URL` allowed in production
