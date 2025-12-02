# Authentication Middleware Documentation

## Overview

JWT-based authentication system with access tokens (short-lived) and refresh tokens (long-lived, httpOnly cookies).

## Files Created

### `backend/src/middleware/auth.js`

Main authentication middleware with:

- JWT verification from `Authorization: Bearer <token>`
- Role-based access guards (student, instructor)
- Token signing utilities
- Refresh token management

### `backend/src/routes/auth.js`

Authentication routes for testing and token management:

- Test login endpoint
- Token refresh endpoint
- Protected test routes
- Logout endpoint

## Middleware Functions

### `auth.authenticate`

Verifies JWT access token from Authorization header. Attaches user to `req.user`.

**Usage:**

```javascript
router.get('/protected', auth.authenticate, (req, res) => {
  // req.user = { id, email, role }
});
```

**Response on failure (401):**

```json
{
  "success": false,
  "error": {
    "message": "No token provided" | "Token expired" | "Invalid token",
    "status": 401,
    "code": "TOKEN_EXPIRED" | "INVALID_TOKEN"
  }
}
```

### `auth.student`

Only allows authenticated users with `role: 'student'`.

**Usage:**

```javascript
router.post('/submission/start', auth.student, (req, res) => {
  // Only students can access
});
```

**Response on role mismatch (403):**

```json
{
  "success": false,
  "error": {
    "message": "Access denied. Student role required.",
    "status": 403,
    "required": "student",
    "current": "instructor"
  }
}
```

### `auth.instructor`

Only allows authenticated users with `role: 'instructor'`.

**Usage:**

```javascript
router.post('/assignment/generate', auth.instructor, (req, res) => {
  // Only instructors can access
});
```

## Token Management Functions

### `auth.signTokens(user)`

Generates access and refresh tokens for a user.

**Parameters:**

```javascript
user = {
  id: 'user-id',
  email: 'user@example.com',
  role: 'student' | 'instructor',
};
```

**Returns:**

```javascript
{
  accessToken: 'eyJhbGc...',  // Expires in 15 minutes
  refreshToken: 'eyJhbGc...'  // Expires in 7 days
}
```

**Usage:**

```javascript
const { accessToken, refreshToken } = auth.signTokens(user);
auth.setRefreshTokenCookie(res, refreshToken);
res.json({ success: true, accessToken, user });
```

### `auth.setRefreshTokenCookie(res, refreshToken)`

Sets refresh token as httpOnly cookie.

**Cookie Options:**

- `httpOnly: true` - Cannot be accessed by JavaScript
- `secure: true` (production only) - HTTPS only
- `sameSite: 'strict'` - CSRF protection
- `maxAge: 7 days`
- `path: '/api/auth/refresh'` - Only sent to refresh endpoint

### `auth.clearRefreshTokenCookie(res)`

Clears refresh token cookie (logout).

### `auth.verifyRefreshToken(token)`

Verifies refresh token and returns decoded payload.

## API Routes

### Test Login (Development Only)

**Endpoint:** `POST /api/auth/test-login`

**Request Body:**

```json
{
  "email": "student@test.com",
  "role": "student"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Test login successful",
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "test-1730000000000",
    "email": "student@test.com",
    "role": "student"
  },
  "note": "This is a test endpoint..."
}
```

**Sets Cookie:** `refreshToken` (httpOnly)

### Get Current User

**Endpoint:** `GET /api/me`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "test-1730000000000",
    "email": "student@test.com",
    "role": "student"
  },
  "message": "User authenticated successfully"
}
```

### Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Requires:** `refreshToken` cookie

**Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "message": "Access token refreshed successfully"
}
```

**Response on expired refresh token (401):**

```json
{
  "success": false,
  "error": {
    "message": "Refresh token expired. Please login again.",
    "status": 401,
    "code": "REFRESH_TOKEN_EXPIRED"
  }
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Clears `refreshToken` cookie.

### Student-Only Test Route

**Endpoint:** `GET /api/auth/student-only`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Requires:** `role: 'student'`

**Response (200):**

```json
{
  "success": true,
  "message": "Welcome, student!",
  "user": {
    "id": "test-1730000000000",
    "email": "student@test.com",
    "role": "student"
  }
}
```

### Instructor-Only Test Route

**Endpoint:** `GET /api/auth/instructor-only`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Requires:** `role: 'instructor'`

## Testing Guide

### 1. Start Server

```bash
cd backend
npm run dev
```

### 2. Generate Test Token

**As Student:**

```bash
curl -X POST http://localhost:5000/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","role":"student"}' \
  -c cookies.txt
```

**As Instructor:**

```bash
curl -X POST http://localhost:5000/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@test.com","role":"instructor"}' \
  -c cookies.txt
```

**Save the `accessToken` from response.**

### 3. Test Protected Route

**Get Current User:**

```bash
curl http://localhost:5000/api/me \
  -H "Authorization: Bearer <accessToken>"
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "id": "test-...",
    "email": "student@test.com",
    "role": "student"
  },
  "message": "User authenticated successfully"
}
```

### 4. Test Role-Based Access

**Student accessing student-only route (✅ Success):**

```bash
curl http://localhost:5000/api/auth/student-only \
  -H "Authorization: Bearer <student-token>"
```

**Student accessing instructor-only route (❌ Forbidden):**

```bash
curl http://localhost:5000/api/auth/instructor-only \
  -H "Authorization: Bearer <student-token>"
```

**Response (403):**

```json
{
  "success": false,
  "error": {
    "message": "Access denied. Instructor role required.",
    "status": 403,
    "required": "instructor",
    "current": "student"
  }
}
```

### 5. Test Token Refresh

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "new-token...",
  "message": "Access token refreshed successfully"
}
```

### 6. Test Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## PowerShell Testing Commands

### Generate Token

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/test-login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"student@test.com","role":"student"}' `
  -SessionVariable session

$token = ($response.Content | ConvertFrom-Json).accessToken
Write-Host "Token: $token"
```

### Test /api/me

```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:5000/api/me" `
  -Headers $headers | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

### Test Refresh

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/refresh" `
  -Method POST `
  -WebSession $session | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

## Environment Variables Required

```env
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**Generate JWT_SECRET:**

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

```bash
# Linux/Mac
openssl rand -base64 32
```

## Token Payload Structure

### Access Token

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "student" | "instructor",
  "iat": 1730000000,
  "exp": 1730000900
}
```

### Refresh Token

```json
{
  "id": "user-id",
  "type": "refresh",
  "iat": 1730000000,
  "exp": 1730604800
}
```

## Security Features

1. **Access Token in Header**: Not stored in localStorage (XSS protection)
2. **Refresh Token in httpOnly Cookie**: Cannot be accessed by JavaScript (XSS protection)
3. **SameSite Cookie**: CSRF protection
4. **Secure Cookie (production)**: HTTPS only
5. **Short-lived Access Token**: 15 minutes (minimize damage if leaked)
6. **Long-lived Refresh Token**: 7 days (user convenience)
7. **Path-restricted Cookie**: Only sent to `/api/auth/refresh`

## Integration with Frontend

### Login Flow

```javascript
// 1. User logs in
const response = await axios.post('/api/auth/test-login', {
  email: 'student@test.com',
  role: 'student',
});

// 2. Store access token in memory (not localStorage!)
const accessToken = response.data.accessToken;

// 3. Refresh token is automatically stored in httpOnly cookie
```

### Making Authenticated Requests

```javascript
// Include token in Authorization header
const response = await axios.get('/api/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### Token Refresh

```javascript
// When access token expires (401 with TOKEN_EXPIRED code)
try {
  const response = await axios.get('/api/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
} catch (error) {
  if (error.response?.data?.error?.code === 'TOKEN_EXPIRED') {
    // Refresh token
    const refreshResponse = await axios.post('/api/auth/refresh');
    const newAccessToken = refreshResponse.data.accessToken;

    // Retry original request with new token
    return axios.get('/api/me', {
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
  }
}
```

## Next Steps

1. Create User model with password hashing
2. Implement proper login with email/password
3. Implement registration with validation
4. Add password reset functionality
5. Add email verification
6. Store refresh tokens in database for revocation
7. Add rate limiting for auth endpoints
8. Add login attempt tracking
