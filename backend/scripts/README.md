# Database Setup Scripts

This directory contains scripts for setting up and seeding the database.

## Scripts Overview

### 1. `setup-indexes.js`

Creates all database indexes for optimal query performance.

**What it does:**

- Creates indexes for `users` collection (email, role, isActive, studentId)
- Creates indexes for `assignments` collection (instructorId+status, deadline, status, createdAt)
- Creates indexes for `assignment_submissions` collection (studentId+assignmentId+attemptNumber, status, submittedAt)
- Creates indexes for `ai_logs` collection (submissionId+timestamp, studentId+assignmentId, questionId, promptType, timestamp)
- Validates all critical indexes from documentation are present

**Usage:**

```bash
cd backend
node scripts/setup-indexes.js
```

**Expected Output:**

```
✅ Connected to MongoDB
📊 Creating indexes for all collections...
   - User: 5 indexes
   - Assignment: 5 indexes
   - AssignmentSubmission: 6 indexes
   - AI_Log: 8 indexes
   - Total: 24 indexes
✅ All critical indexes are present!
```

**When to run:**

- After initial deployment
- After changing model schemas
- When index definitions are updated
- If query performance is slow

---

### 2. `seed.js`

Populates the database with sample data for development and testing.

**What it creates:**

- 1 instructor account: `instructor@example.com` / `password123`
- 1 student account: `student@example.com` / `password123`
- 3 sample assignments:
  - **Assignment 1:** JavaScript basics (5 multiple-choice questions, 50 points)
  - **Assignment 2:** System analysis (2 essay questions, 60 points)
  - **Assignment 3:** Full stack web (5 mixed questions, 65 points)
- 2 draft submissions:
  - Student has partially completed Assignment 1 (3/5 questions answered)
  - Student has started Assignment 2 with AI interactions
- 2 AI interaction logs (for essay assignment)

**Usage:**

```bash
cd backend
node scripts/seed.js
```

**Expected Output:**

```
✅ Database seeded successfully!

📊 Seed Summary:
   Users created: 2
   - Instructors: 1
   - Students: 1
   Assignments created: 3
   Submissions created: 2
   AI Logs created: 2

🔐 Login Credentials:
   Instructor: instructor@example.com / password123
   Student: student@example.com / password123
```

**When to run:**

- Setting up development environment
- After clearing database
- Before testing features
- For demo/presentation purposes

⚠️ **Warning:** This script **deletes all existing data** before seeding!

---

## Complete Setup Workflow

### First Time Setup

```bash
# 1. Make sure MongoDB connection string is in .env
echo "MONGODB_URI=your_connection_string" >> .env

# 2. Install dependencies
npm install

# 3. Create indexes
node scripts/setup-indexes.js

# 4. Seed sample data
node scripts/seed.js

# 5. Start the server
npm run dev
```

### Reset Database (Development)

```bash
# Re-seed the database (clears existing data)
node scripts/seed.js

# Recreate indexes if needed
node scripts/setup-indexes.js
```

---

## Sample Data Details

### Instructor Account

- **Name:** Dr. Nguyễn Văn A
- **Email:** instructor@example.com
- **Password:** password123
- **Department:** Khoa Công Nghệ Thông Tin
- **Role:** instructor

### Student Account

- **Name:** Trần Thị B
- **Email:** student@example.com
- **Password:** password123
- **Student ID:** SV2021001
- **Department:** Khoa Công Nghệ Thông Tin
- **Role:** student

### Assignment 1: JavaScript Basics

- **Type:** Multiple Choice
- **Questions:** 5 questions (10 points each)
- **Topics:** Variables (let/const), typeof operator, Array methods, Arrow functions, Promises
- **Total Points:** 50
- **Time Limit:** 30 minutes
- **Allow AI:** Yes
- **Status:** Published
- **Deadline:** 7 days from seed date

### Assignment 2: System Analysis

- **Type:** Essay
- **Questions:** 2 questions (30 points each)
- **Topics:** Requirements analysis, Monolithic vs Microservices
- **Total Points:** 60
- **Time Limit:** 90 minutes
- **Allow AI:** Yes
- **Status:** Published
- **Deadline:** 14 days from seed date

### Assignment 3: Full Stack Web

- **Type:** Mixed (3 multiple-choice + 2 essay)
- **Questions:** 5 total questions
- **Topics:** RESTful API, MongoDB, JWT, API design, React Hooks
- **Total Points:** 65
- **Time Limit:** 60 minutes
- **Allow AI:** Yes
- **Status:** Published
- **Deadline:** 10 days from seed date

### Draft Submission

- **Student:** Trần Thị B
- **Assignment:** Assignment 1 (JavaScript Basics)
- **Progress:** 3/5 questions answered
- **Status:** Draft (not submitted)
- **Time Spent:** 2 hours
- **Tab Switches:** 3
- **Started:** 2 hours before seed time

### AI Interaction Logs

- **2 logs** for Assignment 2 (Essay questions)
- **Topics:** Requirements analysis, functional vs non-functional requirements
- **Prompt Types:** Question, Clarification
- **Total Tokens:** ~1000 tokens
- **Context Provided:** Yes

---

## Testing the Setup

After running both scripts, you can test:

```bash
# 1. Test instructor login
POST http://localhost:5000/api/auth/login
{
  "email": "instructor@example.com",
  "password": "password123"
}

# 2. Test student login
POST http://localhost:5000/api/auth/login
{
  "email": "student@example.com",
  "password": "password123"
}

# 3. Get all assignments (as instructor)
GET http://localhost:5000/api/assignment
Authorization: Bearer {instructor_token}

# 4. Get student's draft submission
GET http://localhost:5000/api/submission/student/{student_id}
Authorization: Bearer {student_token}

# 5. Get AI logs for submission
GET http://localhost:5000/api/ai/logs/{submission_id}
Authorization: Bearer {instructor_token}
```

---

## Troubleshooting

### Error: "Cannot connect to MongoDB"

- Check `.env` file has correct `MONGODB_URI`
- Verify MongoDB Atlas cluster is running (not paused)
- Check network access whitelist includes your IP
- Test connection string with MongoDB Compass

### Error: "Duplicate key error"

- Run `node scripts/seed.js` again (it clears data first)
- Or manually clear collections:
  ```bash
  mongo
  use ai_assessment_db
  db.users.deleteMany({})
  db.assignments.deleteMany({})
  db.assignment_submissions.deleteMany({})
  db.ai_logs.deleteMany({})
  ```

### Error: "Password validation failed"

- The seed script sets plain text password "password123"
- The User model's pre-save hook automatically hashes it with bcrypt
- This is expected behavior

### Warning: "Some critical indexes are missing"

- Check model schema definitions in `src/models/`
- Ensure index declarations match documentation
- Run `setup-indexes.js` again
- Check MongoDB Atlas index creation status

---

## CI/CD Integration

These scripts can be integrated into your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      # After deploying backend...
      - name: Setup Database Indexes
        run: |
          cd backend
          node scripts/setup-indexes.js
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}

      # Only seed in development/staging
      - name: Seed Development Data
        if: github.ref != 'refs/heads/main'
        run: |
          cd backend
          node scripts/seed.js
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI_DEV }}
```

---

## Related Documentation

- **Model Schemas:** `src/models/README.md`
- **API Documentation:** `docs/API.md`
- **Database Design:** `docs/DATABASE.md`
- **Deployment Guide:** `.github/DEPLOYMENT_GUIDE.md`

---

**Last Updated:** November 13, 2025  
**Tested With:** Node.js 20.x, MongoDB 7.x, Mongoose 8.x
