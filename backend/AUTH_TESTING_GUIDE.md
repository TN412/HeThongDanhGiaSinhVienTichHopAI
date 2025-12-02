# Authentication Testing Guide

## Quick Start

### 1. Run Backend Server

```bash
cd backend
npm run dev
```

Server should start on `http://localhost:5000`

---

## Manual Testing with cURL

### Test 1: Register Student

```bash
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "student@test.com",
    "password": "password123",
    "studentId": "ST001",
    "department": "Computer Science"
  }' \
  -c cookies.txt \
  -v
```

**Expected:**

- Status: `201 Created`
- Body contains: `accessToken`, `user` object
- Cookie set: `refreshToken` (httpOnly)

---

### Test 2: Student Login

```bash
curl -X POST http://localhost:5000/api/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123"
  }' \
  -c cookies.txt \
  -v
```

**Expected:**

- Status: `200 OK`
- Body contains: `accessToken`, `user` object with `lastLogin`
- Cookie set: `refreshToken`

---

### Test 3: Get Student Profile

```bash
# Use access token from previous response
ACCESS_TOKEN="your_access_token_here"

curl -X GET http://localhost:5000/api/student/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -v
```

**Expected:**

- Status: `200 OK`
- Body contains: Full user profile including `createdAt`, `lastLogin`

---

### Test 4: Refresh Access Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt \
  -v
```

**Expected:**

- Status: `200 OK`
- Body contains: New `accessToken`
- Cookie remains valid

---

### Test 5: Create Instructor (Manual - via MongoDB)

```javascript
// In MongoDB shell or Compass
db.users.insertOne({
  name: 'Test Instructor',
  email: 'instructor@test.com',
  passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz...', // Hash of "password123"
  role: 'instructor',
  department: 'Computer Science',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

Or use bcrypt to generate hash:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('password123', 10);
console.log(hash);
```

---

### Test 6: Instructor Login

```bash
curl -X POST http://localhost:5000/api/instructor/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@test.com",
    "password": "password123"
  }' \
  -c cookies.txt \
  -v
```

**Expected:**

- Status: `200 OK`
- Body contains: `accessToken`, instructor `user` object

---

### Test 7: Get Instructor Dashboard

```bash
# Use instructor access token
INSTRUCTOR_TOKEN="your_instructor_token_here"

curl -X GET http://localhost:5000/api/instructor/dashboard \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -v
```

**Expected:**

- Status: `200 OK`
- Body contains: Mock dashboard with `stats`, `instructor` info

---

### Test 8: Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt \
  -v
```

**Expected:**

- Status: `200 OK`
- Cookie cleared: `refreshToken=; Max-Age=0`

---

## Testing with Postman

### Setup

1. Create new Collection: "AI Assessment Auth"
2. Add environment variables:
   - `baseURL`: `http://localhost:5000`
   - `accessToken`: (will be set automatically)

### Request 1: Student Register

- **Method:** POST
- **URL:** `{{baseURL}}/api/student/register`
- **Body (JSON):**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@test.com",
    "password": "securePassword123",
    "studentId": "ST12345",
    "department": "Computer Science"
  }
  ```
- **Tests (Scripts tab):**

  ```javascript
  pm.test('Status is 201', () => {
    pm.response.to.have.status(201);
  });

  pm.test('Response has accessToken', () => {
    const jsonData = pm.response.json();
    pm.expect(jsonData.accessToken).to.exist;
    pm.environment.set('accessToken', jsonData.accessToken);
  });

  pm.test('User role is student', () => {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user.role).to.equal('student');
  });
  ```

### Request 2: Student Login

- **Method:** POST
- **URL:** `{{baseURL}}/api/student/login`
- **Body (JSON):**
  ```json
  {
    "email": "john.doe@test.com",
    "password": "securePassword123"
  }
  ```
- **Tests:**

  ```javascript
  pm.test('Status is 200', () => {
    pm.response.to.have.status(200);
  });

  pm.test('lastLogin is updated', () => {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user.lastLogin).to.exist;
  });

  pm.environment.set('accessToken', pm.response.json().accessToken);
  ```

### Request 3: Get Profile

- **Method:** GET
- **URL:** `{{baseURL}}/api/student/profile`
- **Authorization:** Bearer Token
  - Token: `{{accessToken}}`
- **Tests:**

  ```javascript
  pm.test('Status is 200', () => {
    pm.response.to.have.status(200);
  });

  pm.test('Profile includes createdAt', () => {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user.createdAt).to.exist;
  });
  ```

---

## Automated Testing with Jest

### Run All Tests

```bash
cd backend
npm test -- tests/auth.test.js
```

### Run Specific Test Suite

```bash
# Only registration tests
npm test -- tests/auth.test.js -t "POST /api/student/register"

# Only login tests
npm test -- tests/auth.test.js -t "POST /api/student/login"

# Only token refresh tests
npm test -- tests/auth.test.js -t "POST /api/auth/refresh"
```

### Run with Coverage

```bash
npm test -- tests/auth.test.js --coverage
```

**Expected Coverage:**

- Statements: > 90%
- Branches: > 85%
- Functions: > 90%
- Lines: > 90%

---

## Error Case Testing

### Test: Duplicate Email

```bash
# First registration
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Second registration (should fail)
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test2","email":"test@test.com","password":"password456"}'
```

**Expected:**

- Status: `400 Bad Request`
- Error code: `EMAIL_EXISTS`

---

### Test: Short Password

```bash
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"12345"}'
```

**Expected:**

- Status: `400 Bad Request`
- Error: "Password must be at least 6 characters"

---

### Test: Invalid Email Format

```bash
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid-email","password":"password123"}'
```

**Expected:**

- Status: `400 Bad Request`
- Error: "Please provide a valid email address"

---

### Test: Wrong Password

```bash
curl -X POST http://localhost:5000/api/student/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"wrongpassword"}'
```

**Expected:**

- Status: `401 Unauthorized`
- Error: "Invalid email or password"

---

### Test: Role Mismatch

```bash
# Register as student
curl -X POST http://localhost:5000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Try to login as instructor
curl -X POST http://localhost:5000/api/instructor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

**Expected:**

- Status: `403 Forbidden`
- Error: "Use student login endpoint"

---

### Test: Missing Authorization Header

```bash
curl -X GET http://localhost:5000/api/student/profile
```

**Expected:**

- Status: `401 Unauthorized`
- Error: "No token provided"

---

### Test: Invalid Token

```bash
curl -X GET http://localhost:5000/api/student/profile \
  -H "Authorization: Bearer invalid-token-here"
```

**Expected:**

- Status: `401 Unauthorized`
- Error code: `INVALID_TOKEN`

---

### Test: Expired Token

```bash
# Change JWT_ACCESS_EXPIRY to 1s in .env for testing
JWT_ACCESS_EXPIRY=1s

# Register/login
curl -X POST http://localhost:5000/api/student/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -o response.txt

# Wait 2 seconds
sleep 2

# Try to access profile
ACCESS_TOKEN=$(cat response.txt | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
curl -X GET http://localhost:5000/api/student/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected:**

- Status: `401 Unauthorized`
- Error code: `TOKEN_EXPIRED`

---

## Database Validation

### Check User Created

```javascript
// MongoDB shell
db.users.findOne({ email: 'student@test.com' });
```

**Should show:**

- `name`, `email`, `role`, `passwordHash` (hashed)
- `createdAt`, `updatedAt`
- NO plain password

---

### Check Password Hash Format

```javascript
db.users.findOne({ email: 'student@test.com' }, { passwordHash: 1 });
```

**Should start with:** `$2a$10$` (bcrypt format)

---

### Check lastLogin Updated

```javascript
// Before login
db.users.findOne({ email: 'student@test.com' }, { lastLogin: 1 });
// Output: lastLogin not set

// After login (via API)
db.users.findOne({ email: 'student@test.com' }, { lastLogin: 1 });
// Output: lastLogin is recent timestamp
```

---

## Integration Testing Checklist

- [ ] Student can register with valid data
- [ ] Duplicate email is rejected
- [ ] Invalid email format is rejected
- [ ] Short password is rejected
- [ ] Student can login with correct credentials
- [ ] Wrong password is rejected
- [ ] Student can access profile with valid token
- [ ] Invalid token is rejected
- [ ] Expired token is rejected
- [ ] Instructor cannot access student endpoints
- [ ] Student cannot access instructor endpoints
- [ ] Token refresh works with valid refresh token
- [ ] Token refresh fails with invalid refresh token
- [ ] Logout clears refresh token cookie
- [ ] Password is hashed (not stored plain)
- [ ] lastLogin timestamp is updated on login
- [ ] Email is stored lowercase
- [ ] Refresh token is httpOnly (not accessible via JS)

---

## Performance Testing

### Load Test (with Apache Bench)

```bash
# Test 100 concurrent registrations (should fail due to unique email)
ab -n 100 -c 10 -T "application/json" \
  -p register.json \
  http://localhost:5000/api/student/register

# register.json content:
# {"name":"Test","email":"test@test.com","password":"password123"}
```

### Expected Behavior:

- First request: 201 Created
- Remaining 99: 400 Bad Request (duplicate email)
- No 500 errors (proper error handling)

---

## Troubleshooting

### Issue: "Email already registered" on first registration

**Cause:** User exists in database from previous test
**Solution:**

```javascript
// Clear test user
db.users.deleteMany({ email: 'student@test.com' });
```

### Issue: "Cannot set headers after they are sent"

**Cause:** Multiple responses in route handler
**Solution:** Ensure only one `res.json()` or `res.status()` per route

### Issue: Refresh token not working

**Cause:** Cookie not being sent
**Solution:**

- Check `withCredentials: true` in frontend
- Check CORS `credentials: true` in backend
- Verify cookie path matches `/api/auth/refresh`

### Issue: Password comparison fails

**Cause:** Password not hashed properly
**Solution:**

- Check pre-save hook in User model
- Verify `isModified('passwordHash')` works correctly

---

## Next Steps

1. **Frontend Integration**
   - Create login/register forms
   - Implement token storage (memory, not localStorage)
   - Add axios interceptor for auto-refresh

2. **Additional Security**
   - Add rate limiting (express-rate-limit)
   - Implement password reset via email
   - Add account email verification
   - Implement 2FA (optional)

3. **Monitoring**
   - Log failed login attempts
   - Track token refresh frequency
   - Alert on suspicious activity

4. **Documentation**
   - API versioning strategy
   - Deprecation policy
   - Migration guides for breaking changes
