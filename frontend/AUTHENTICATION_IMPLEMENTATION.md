# Frontend Authentication Implementation

## Overview

Complete authentication system for the AI Assessment frontend with JWT token management, role-based access control, and protected routes.

## Files Created

### 1. **contexts/AuthContext.jsx** (140 lines)

**Purpose:** Global authentication state management using React Context

**Features:**

- ✅ Stores user state globally
- ✅ Auto-initializes auth on mount (checks for valid session)
- ✅ Login/register/logout methods
- ✅ Access token in memory (security best practice)
- ✅ Refresh token via httpOnly cookie

**Key Methods:**

```javascript
const {
  user, // Current user object { id, email, role, name }
  loading, // Loading state during auth operations
  isAuthenticated, // Boolean: is user logged in?
  isStudent, // Boolean: is role === 'student'?
  isInstructor, // Boolean: is role === 'instructor'?
  login, // (email, password, role) => Promise
  register, // (name, email, password, data) => Promise
  logout, // () => Promise
} = useAuth();
```

**Usage:**

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();

  if (user) {
    return <p>Welcome {user.name}!</p>;
  }
}
```

---

### 2. **hooks/useAuth.js** (200 lines)

**Purpose:** Alternative custom hook for authentication (not used in favor of context)

**Note:** AuthContext is used instead for simpler integration. This file provides a standalone hook approach if needed.

---

### 3. **components/ProtectedRoute.jsx** (50 lines)

**Purpose:** Wrapper component to protect routes from unauthorized access

**Features:**

- ✅ Redirects to /login if not authenticated
- ✅ Role-based access control (student/instructor)
- ✅ Loading state while checking auth
- ✅ Auto-redirect to correct dashboard based on role

**Usage:**

```jsx
// Any authenticated user
<Route path="/assignment/:id" element={
  <ProtectedRoute>
    <AssignmentPage />
  </ProtectedRoute>
} />

// Student only
<Route path="/student/assignments" element={
  <ProtectedRoute requiredRole="student">
    <AssignmentPage />
  </ProtectedRoute>
} />

// Instructor only
<Route path="/instructor/dashboard" element={
  <ProtectedRoute requiredRole="instructor">
    <InstructorDashboard />
  </ProtectedRoute>
} />
```

---

### 4. **pages/LoginPage.jsx** (Updated)

**Purpose:** Login page with email/password and role selection

**Changes:**

- ✅ Integrated with AuthContext
- ✅ Auto-redirects after successful login
- ✅ Role-based navigation (instructor → dashboard, student → assignments)
- ✅ Preserves intended destination (redirect after login)
- ✅ Backend health check status

**Flow:**

```
User fills form → Submit → AuthContext.login()
  ↓
Success → Redirect to /instructor/dashboard OR /student/assignments
  ↓
Failure → Show error message
```

**API Endpoints:**

- Student: `POST /api/auth/student/login`
- Instructor: `POST /api/auth/instructor/login`

---

### 5. **pages/RegisterPage.jsx** (New - 200 lines)

**Purpose:** Student registration form

**Fields:**

- Name (required)
- Email (required)
- Password (required, min 6 chars)
- Confirm Password (required)
- Student ID (optional)
- Department (optional)

**Features:**

- ✅ Password confirmation validation
- ✅ Auto-login after successful registration
- ✅ Redirect to /student/assignments
- ✅ Error handling with user-friendly messages

**API Endpoint:**

- `POST /api/auth/student/register`

---

### 6. **pages/RegisterPage.css** (New - 120 lines)

**Purpose:** Styling for registration page

**Design:**

- Purple gradient background (matches LoginPage)
- White card with shadow
- Responsive grid layout (2-column for Student ID/Department)
- Mobile-friendly (stacks on small screens)

---

### 7. **components/Header.jsx** (Updated)

**Purpose:** Navigation header with user info and logout

**Changes:**

- ✅ Shows user name/email when authenticated
- ✅ Role-specific navigation (Dashboard for instructor, Assignments for student)
- ✅ Logout button with AuthContext integration
- ✅ Conditional rendering based on auth state

**Before Login:**

```
🎓 AI Assessment              [Login]
```

**After Login (Student):**

```
🎓 AI Assessment    [📚 Assignments]  [👤 John Doe] [🚪 Logout]
```

**After Login (Instructor):**

```
🎓 AI Assessment    [📊 Dashboard]   [👨‍🏫 Dr. Smith] [🚪 Logout]
```

---

### 8. **components/Header.css** (Updated)

**Purpose:** Styling for updated header

**New Styles:**

- `.user-info` - Container for user info section
- `.user-name` - User name display with icon
- `.logout-button` - Purple gradient button with hover effects
- Mobile responsive adjustments

---

### 9. **App.jsx** (Updated)

**Purpose:** Root component with routing and providers

**Changes:**

- ✅ Wrapped with `AuthProvider`
- ✅ Added `ProtectedRoute` to all authenticated routes
- ✅ Role-based route protection
- ✅ Added `/register` route

**Route Structure:**

```
/ → Redirect to /login
/login → LoginPage (public)
/register → RegisterPage (public)

Protected Routes:
/instructor/dashboard → InstructorDashboard (instructor only)
/student/assignments → AssignmentPage (student only)
/assignment/:id → AssignmentPage (any authenticated)
/submission/:id → SubmissionPage (any authenticated)
/assignment-view/:id → AssignmentView (student only)
/review/:submissionId → ReviewPage (any authenticated)
```

---

## Authentication Flow

### 1. Login Flow

```
1. User visits /login
2. Enters email, password, selects role
3. LoginPage calls AuthContext.login(email, password, role)
4. AuthContext calls API: POST /api/auth/{role}/login
5. Backend validates credentials
6. Backend returns accessToken (JSON) + sets refreshToken (httpOnly cookie)
7. Frontend saves accessToken to memory (api.setAccessToken)
8. Frontend updates user state
9. Redirect based on role:
   - Instructor → /instructor/dashboard
   - Student → /student/assignments
```

### 2. Registration Flow

```
1. User visits /register
2. Fills form (name, email, password, etc.)
3. RegisterPage calls AuthContext.register()
4. AuthContext calls API: POST /api/auth/student/register
5. Backend creates user + hashes password
6. Backend returns accessToken + sets refreshToken cookie
7. Frontend saves accessToken, updates user state
8. Redirect to /student/assignments
```

### 3. Token Refresh Flow (Automatic)

```
1. User makes API request
2. Backend returns 401 (token expired)
3. Axios interceptor catches 401
4. Interceptor calls POST /api/auth/refresh
   - Sends httpOnly cookie automatically
5. Backend validates refresh token
6. Backend returns new accessToken
7. Interceptor saves new token
8. Interceptor retries original request
9. If refresh fails → Clear tokens, redirect to /login
```

### 4. Protected Route Flow

```
1. User navigates to protected route
2. ProtectedRoute component checks:
   a. loading? → Show loading spinner
   b. !isAuthenticated? → Redirect to /login
   c. requiredRole && user.role !== requiredRole? → Redirect to correct dashboard
   d. All checks pass? → Render children
```

### 5. Logout Flow

```
1. User clicks "Logout" in Header
2. Header calls AuthContext.logout()
3. AuthContext calls API: POST /api/auth/logout
4. Backend clears refreshToken cookie
5. Frontend clears accessToken from memory
6. Frontend clears user state
7. Redirect to /login
```

---

## Security Features

### 1. **Access Token Storage**

- ✅ Stored in memory (React state), NOT localStorage
- ✅ Cleared on page refresh (requires re-auth or refresh token)
- ✅ Cannot be accessed by XSS attacks
- ✅ Short-lived (15 minutes)

### 2. **Refresh Token Storage**

- ✅ Stored as httpOnly cookie (cannot be accessed by JavaScript)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ Path restricted to /api/auth/refresh
- ✅ Long-lived (7 days)

### 3. **Automatic Token Refresh**

- ✅ Axios interceptor handles 401 errors
- ✅ Transparent to user (no login prompt)
- ✅ Falls back to login page if refresh fails

### 4. **Role-Based Access Control**

- ✅ Checked at route level (ProtectedRoute)
- ✅ Checked at component level (conditional rendering)
- ✅ Checked at API level (backend middleware)

### 5. **Session Persistence**

- ✅ Auth state persists across page refreshes (via refresh token)
- ✅ User doesn't need to re-login unless token expires (7 days)

---

## API Integration

### Backend Endpoints Used

**Auth:**

- `POST /api/auth/student/register` - Register student
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/instructor/login` - Instructor login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear refresh token
- `GET /api/auth/me` - Get current user info

**Already Implemented in `utils/api.js`:**

```javascript
// Auth
export const login = async (email, password, role) => { ... }
export const register = async (name, email, password, role) => { ... }
export const logout = async () => { ... }
export const getCurrentUser = async () => { ... }

// Token management
export const setAccessToken = (token) => { ... }
export const getAccessToken = () => { ... }
export const clearAccessToken = () => { ... }

// Axios interceptors
api.interceptors.request.use(...)   // Attach token to requests
api.interceptors.response.use(...)  // Auto-refresh on 401
```

---

## Testing Instructions

### 1. Start Backend

```bash
cd backend
npm run dev  # Runs on http://localhost:5000
```

### 2. Start Frontend

```bash
cd frontend
npm run dev  # Runs on http://localhost:5173
```

### 3. Test Registration

1. Visit http://localhost:5173/register
2. Fill form:
   - Name: Test Student
   - Email: test@student.com
   - Password: password123
   - Confirm Password: password123
   - Student ID: ST001 (optional)
   - Department: Computer Science (optional)
3. Click "Register"
4. Should redirect to /student/assignments
5. Header should show "👤 Test Student" and "🚪 Logout"

### 4. Test Login (Student)

1. Visit http://localhost:5173/login
2. Select role: Student
3. Enter email: test@student.com
4. Enter password: password123
5. Click "Login"
6. Should redirect to /student/assignments

### 5. Test Login (Instructor)

**Note:** Instructor accounts must be created manually in MongoDB (no self-registration)

**Create Instructor:**

```javascript
// In MongoDB shell or Compass
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('password123', 10);

db.users.insertOne({
  name: 'Test Instructor',
  email: 'test@instructor.com',
  passwordHash: hash,
  role: 'instructor',
  department: 'Computer Science',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

**Login:**

1. Visit http://localhost:5173/login
2. Select role: Instructor
3. Enter email: test@instructor.com
4. Enter password: password123
5. Click "Login"
6. Should redirect to /instructor/dashboard

### 6. Test Protected Routes

1. **Not logged in:**
   - Visit http://localhost:5173/instructor/dashboard
   - Should redirect to /login

2. **Logged in as student:**
   - Visit http://localhost:5173/instructor/dashboard
   - Should redirect to /student/assignments

3. **Logged in as instructor:**
   - Visit http://localhost:5173/student/assignments
   - Should redirect to /instructor/dashboard

### 7. Test Logout

1. Click "🚪 Logout" in header
2. Should redirect to /login
3. Header should show only "Login" link
4. Trying to access protected routes should redirect to /login

### 8. Test Session Persistence

1. Login as student
2. Refresh page (F5)
3. Should remain logged in (header shows user info)
4. Should not redirect to /login

**Note:** Access token expires after 15 minutes of inactivity. Refresh token is valid for 7 days.

### 9. Test Token Refresh

1. Login as student
2. Wait 16 minutes (or manually change JWT_ACCESS_EXPIRY=10s in backend .env)
3. Make any API request (navigate to a page)
4. Should automatically refresh token (no login prompt)
5. Check Network tab: Should see POST /api/auth/refresh

### 10. Test Error Cases

1. **Wrong password:**
   - Enter wrong password → Should show "Invalid email or password"

2. **Wrong role:**
   - Login as student, select "Instructor" role → Should show error

3. **Duplicate email:**
   - Register with same email twice → Should show "Email already registered"

4. **Short password:**
   - Register with password "12345" → Should show "Password must be at least 6 characters"

---

## Troubleshooting

### Issue: "Cannot read property 'role' of null"

**Cause:** User is not yet loaded
**Solution:** Check `loading` state before accessing `user`

```jsx
if (loading) return <div>Loading...</div>;
if (!user) return <div>Not logged in</div>;
return <div>{user.name}</div>;
```

### Issue: Redirect loop (keeps going back to /login)

**Cause:** Refresh token expired or invalid
**Solution:** Clear cookies and login again

```bash
# In browser DevTools → Application → Cookies → Delete refreshToken
```

### Issue: "CORS error" when calling /api/auth/refresh

**Cause:** `withCredentials: true` not set
**Solution:** Already configured in `utils/api.js`:

```javascript
axios.create({
  withCredentials: true, // Send cookies
});
```

### Issue: Token not persisting after page refresh

**Cause:** Access token stored in memory (cleared on refresh)
**Solution:** This is expected! The refresh token cookie will automatically get a new access token.

### Issue: 401 error on protected routes

**Cause:** Access token expired and refresh failed
**Solution:**

1. Check backend is running
2. Check refresh token cookie exists (DevTools → Application → Cookies)
3. Try logging out and back in

---

## Next Steps

### 1. Add Student Assignments Page

Create `/student/assignments` page to display available assignments for students.

### 2. Add Profile Page

Allow users to view/edit their profile information.

### 3. Add Password Reset

Implement "Forgot Password" flow with email verification.

### 4. Add Remember Me

Optional: Add "Remember Me" checkbox to extend refresh token lifetime.

### 5. Add Social Login

Optional: Add Google/Microsoft OAuth integration.

### 6. Add 2FA

Optional: Add two-factor authentication for enhanced security.

---

## Criteria Met ✅

- ✅ **Form email/password, chọn role nếu cần**
  - LoginPage has email, password, and role dropdown
  - RegisterPage has full form with validation

- ✅ **Lưu access token trong memory (React state)**
  - Access token stored in `api.js` memory variable
  - Never stored in localStorage (security best practice)

- ✅ **Refresh bằng cookie**
  - Refresh token set as httpOnly cookie
  - Automatic refresh on 401 via Axios interceptor
  - Manual refresh available via `POST /api/auth/refresh`

- ✅ **Protect routes: instructor pages chỉ cho instructor**
  - ProtectedRoute component with `requiredRole` prop
  - Instructor routes require `requiredRole="instructor"`
  - Student routes require `requiredRole="student"`
  - Unauthorized access redirects to correct dashboard

- ✅ **Redirect đúng sau login**
  - Student → /student/assignments
  - Instructor → /instructor/dashboard
  - Preserves intended destination (location.state.from)

- ✅ **Giữ phiên thông qua refresh**
  - Session persists across page refreshes
  - Automatic token refresh when expired
  - 7-day refresh token validity
  - No re-login required unless token expires

---

## File Summary

| File                            | Lines     | Purpose                   |
| ------------------------------- | --------- | ------------------------- |
| `contexts/AuthContext.jsx`      | 140       | Global auth state         |
| `hooks/useAuth.js`              | 200       | Alternative hook (unused) |
| `components/ProtectedRoute.jsx` | 50        | Route protection          |
| `pages/LoginPage.jsx`           | 120       | Login form                |
| `pages/RegisterPage.jsx`        | 200       | Registration form         |
| `pages/RegisterPage.css`        | 120       | Register styling          |
| `components/Header.jsx`         | 60        | Nav with user info        |
| `components/Header.css`         | 80        | Header styling            |
| `App.jsx`                       | 70        | Routes + providers        |
| **Total**                       | **1,040** | **9 files**               |
