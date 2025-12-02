# Authentication API Reference

## Overview

Complete authentication system with JWT tokens, bcrypt password hashing, and role-based access control.

## Student Routes

### 1. Register Student Account

**POST** `/api/student/register`

Register a new student account with email validation and password hashing.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john.doe@university.edu",
  "password": "securePassword123",
  "studentId": "ST12345", // Optional
  "department": "Computer Science" // Optional
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Student account created successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "role": "student",
    "studentId": "ST12345",
    "department": "Computer Science"
  }
}
```

**Set-Cookie Header:**

```
refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=604800
```

**Error Responses:**

- `400` - Missing required fields, invalid email format, or email already exists
- `500` - Server error during registration

**Validation Rules:**

- Email must be unique and valid format
- Password must be at least 6 characters
- Name is required
- Password is hashed with bcrypt (10 salt rounds)

---

### 2. Student Login

**POST** `/api/student/login`

Authenticate student with email and password.

**Request Body:**

```json
{
  "email": "john.doe@university.edu",
  "password": "securePassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "role": "student",
    "studentId": "ST12345",
    "department": "Computer Science"
  }
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid email or password
- `403` - Account deactivated or wrong role (trying to use instructor account)
- `500` - Server error

**Features:**

- Updates `lastLogin` timestamp on successful login
- Returns both access token (JSON) and refresh token (httpOnly cookie)

---

### 3. Get Student Profile

**GET** `/api/student/profile`

Get current student's profile information.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "role": "student",
    "studentId": "ST12345",
    "department": "Computer Science",
    "isActive": true,
    "lastLogin": "2025-11-12T10:30:00.000Z",
    "createdAt": "2025-11-01T08:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - No token provided or invalid token
- `403` - Access denied (not a student)
- `404` - User not found
- `500` - Server error

---

## Instructor Routes

### 4. Instructor Login

**POST** `/api/instructor/login`

Authenticate instructor with email and password.

**Request Body:**

```json
{
  "email": "professor@university.edu",
  "password": "instructorPassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Dr. Jane Smith",
    "email": "professor@university.edu",
    "role": "instructor",
    "department": "Computer Science"
  }
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid email or password
- `403` - Account deactivated or wrong role (trying to use student account)
- `500` - Server error

**Note:** Instructors cannot self-register. Accounts must be created by administrators.

---

### 5. Get Instructor Dashboard

**GET** `/api/instructor/dashboard`

Get instructor dashboard data (currently mock data).

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "success": true,
  "dashboard": {
    "instructor": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Dr. Jane Smith",
      "email": "professor@university.edu",
      "department": "Computer Science"
    },
    "stats": {
      "totalAssignments": 0,
      "totalSubmissions": 0,
      "pendingGrading": 0,
      "avgAISkillScore": 0
    },
    "recentActivity": [],
    "message": "Dashboard data will be populated from actual assignments and submissions"
  }
}
```

**Error Responses:**

- `401` - No token provided or invalid token
- `403` - Access denied (not an instructor)
- `404` - User not found
- `500` - Server error

---

## Common Auth Routes

### 6. Refresh Access Token

**POST** `/api/auth/refresh`

Refresh expired access token using refresh token from httpOnly cookie.

**Cookie:**

```
refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Access token refreshed successfully"
}
```

**Error Responses:**

- `401` - Refresh token not found, expired, or invalid
- `403` - Account deactivated
- `500` - Server error

**Features:**

- Fetches user from database to ensure account is still active
- Clears invalid refresh token cookies automatically
- Returns new access token only (refresh token remains valid)

---

### 7. Logout

**POST** `/api/auth/logout`

Logout user by clearing refresh token cookie.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Set-Cookie Header:**

```
refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=0
```

---

### 8. Get Current User Info

**GET** `/api/auth/me`

Get current user information from JWT token.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john.doe@university.edu",
    "role": "student"
  },
  "message": "User authenticated successfully"
}
```

**Error Responses:**

- `401` - No token provided, expired, or invalid

---

## Authentication Flow

### Registration Flow (Students Only)

```
1. POST /api/student/register
   ├─ Validate email uniqueness
   ├─ Hash password with bcrypt (10 salt rounds)
   ├─ Create user in database
   ├─ Generate access + refresh tokens
   └─ Return access token (JSON) + refresh token (httpOnly cookie)
```

### Login Flow (Students & Instructors)

```
1. POST /api/student/login OR /api/instructor/login
   ├─ Find user by email
   ├─ Verify role matches endpoint
   ├─ Compare password with bcrypt
   ├─ Update lastLogin timestamp
   ├─ Generate access + refresh tokens
   └─ Return access token (JSON) + refresh token (httpOnly cookie)
```

### Token Refresh Flow

```
1. POST /api/auth/refresh
   ├─ Extract refresh token from httpOnly cookie
   ├─ Verify refresh token signature
   ├─ Fetch user from database (ensure active)
   ├─ Generate new access token
   └─ Return new access token (JSON)
```

### Logout Flow

```
1. POST /api/auth/logout
   └─ Clear refresh token cookie (Max-Age=0)
```

---

## Token Structure

### Access Token (Short-lived: 15 minutes)

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john.doe@university.edu",
  "role": "student",
  "iat": 1699800000,
  "exp": 1699800900
}
```

### Refresh Token (Long-lived: 7 days)

```json
{
  "id": "507f1f77bcf86cd799439011",
  "type": "refresh",
  "iat": 1699800000,
  "exp": 1700404800
}
```

---

## Security Features

### Password Security

- ✅ Bcrypt hashing with salt rounds = 10
- ✅ Password minimum length: 6 characters
- ✅ Password never returned in API responses
- ✅ Password hash not included in queries by default (`select: false`)

### Token Security

- ✅ Access token: Stored in memory (frontend), short expiry (15 min)
- ✅ Refresh token: httpOnly cookie, cannot be accessed by JavaScript
- ✅ Refresh token: SameSite=Strict (CSRF protection)
- ✅ Refresh token: Secure flag in production (HTTPS only)
- ✅ Refresh token: Path restricted to `/api/auth/refresh`

### Email Validation

- ✅ Regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ Unique constraint at database level
- ✅ Case-insensitive (converted to lowercase)
- ✅ Trimmed whitespace

### Role-Based Access Control

- ✅ Student routes: Require `role: 'student'`
- ✅ Instructor routes: Require `role: 'instructor'`
- ✅ Role verification at middleware level
- ✅ Role verified again at endpoint level

### Account Status

- ✅ `isActive` flag: Deactivated accounts cannot login
- ✅ `lastLogin` tracking: Monitor account activity

---

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here                # Required
JWT_ACCESS_EXPIRY=15m                          # Default: 15 minutes
JWT_REFRESH_EXPIRY=7d                          # Default: 7 days

# MongoDB Configuration
MONGODB_URI=mongodb+srv://...                  # Required

# Environment
NODE_ENV=development                           # 'production' enables secure cookies
```

---

## Testing

### Run Tests

```bash
cd backend
npm test -- tests/auth.test.js
```

### Test Coverage

- ✅ Student registration (success, validation, duplicates)
- ✅ Student login (success, wrong credentials, wrong role)
- ✅ Student profile (success, unauthorized, wrong role)
- ✅ Instructor login (success, wrong role)
- ✅ Instructor dashboard (success, unauthorized)
- ✅ Token refresh (success, invalid token, missing token)
- ✅ Logout (cookie clearing)

**Total Test Cases:** 25+

---

## Frontend Integration Example

### Registration

```javascript
import axios from 'axios';

const register = async (name, email, password) => {
  const response = await axios.post(
    '/api/student/register',
    {
      name,
      email,
      password,
    },
    {
      withCredentials: true, // Important: Include cookies
    }
  );

  // Store access token in memory (React state, not localStorage)
  const { accessToken, user } = response.data;
  return { accessToken, user };
};
```

### Login

```javascript
const login = async (email, password, role = 'student') => {
  const endpoint = role === 'instructor' ? '/api/instructor/login' : '/api/student/login';

  const response = await axios.post(
    endpoint,
    {
      email,
      password,
    },
    {
      withCredentials: true, // Important: Include cookies
    }
  );

  const { accessToken, user } = response.data;
  return { accessToken, user };
};
```

### Refresh Token

```javascript
const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      '/api/auth/refresh',
      {},
      {
        withCredentials: true, // Important: Send refresh token cookie
      }
    );

    return response.data.accessToken;
  } catch (error) {
    // Refresh token expired, redirect to login
    throw error;
  }
};
```

### API Interceptor (Automatic Token Refresh)

```javascript
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();

        // Update Authorization header
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        // Retry original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### Logout

```javascript
const logout = async () => {
  await axios.post(
    '/api/auth/logout',
    {},
    {
      withCredentials: true,
    }
  );

  // Clear access token from memory
  // Redirect to login page
};
```

---

## Common Errors

### 1. CORS Issues with Credentials

**Problem:** Cookies not being sent/received

**Solution:**

```javascript
// Backend (app.js)
app.use(
  cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true, // Allow cookies
  })
);

// Frontend
axios.defaults.withCredentials = true;
```

### 2. Secure Cookie in Development

**Problem:** Cookies not set in development (HTTP)

**Solution:**

```javascript
// In middleware/auth.js
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Only secure in production
  sameSite: 'strict',
};
```

### 3. Token Expired Error

**Problem:** Access token expired

**Solution:** Implement automatic token refresh with axios interceptor (see example above)

### 4. Email Already Exists

**Problem:** User tries to register with existing email

**Response:**

```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "status": 400,
    "code": "EMAIL_EXISTS"
  }
}
```

### 5. Wrong Role Access

**Problem:** Student trying to access instructor route

**Response:**

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

---

## Next Steps

1. **Implement instructor registration endpoint** (admin only)
2. **Add password reset functionality**
3. **Add email verification**
4. **Implement rate limiting** (prevent brute force attacks)
5. **Add OAuth integration** (Google, Microsoft)
6. **Enhance dashboard** with real assignment/submission data
7. **Add audit logging** (track login attempts, password changes)

---

## API Quick Reference

| Method | Endpoint                    | Auth       | Description      |
| ------ | --------------------------- | ---------- | ---------------- |
| POST   | `/api/student/register`     | Public     | Register student |
| POST   | `/api/student/login`        | Public     | Student login    |
| GET    | `/api/student/profile`      | Student    | Get profile      |
| POST   | `/api/instructor/login`     | Public     | Instructor login |
| GET    | `/api/instructor/dashboard` | Instructor | Get dashboard    |
| POST   | `/api/auth/refresh`         | Public\*   | Refresh token    |
| POST   | `/api/auth/logout`          | Public     | Logout           |
| GET    | `/api/auth/me`              | Any        | Get user info    |

\*Requires refresh token in httpOnly cookie
