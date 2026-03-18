# Hệ Thống Đánh Giá Sinh Viên Tích Hợp AI (AI-Integrated Student Assessment System)

He thong tao bai tap va danh gia nang luc sinh vien tich hop AI cho dai hoc/cao dang. Du an danh gia dong thoi 2 khia canh:

- Nang luc chuyen mon (ket qua bai lam)
- Nang luc su dung AI (chat luong prompt, tinh doc lap, kha nang tu duy)

Muc tieu: cho phep sinh vien dung AI mot cach co kiem soat, va giang vien co dashboard de theo doi chat luong hoc tap thay vi chi xem diem dung/sai.

## 1. Gia Tri San Pham

- Tu dong tao de bai tu tai lieu hoc tap (PDF, DOCX, TXT)
- Sinh vien lam bai co AI tutor theo ngu canh cau hoi
- Luu toan bo tuong tac AI de danh gia ky nang prompt
- Cham diem ket hop noi dung + ky nang su dung AI
- Dashboard phan tich cho giang vien, co logs va bao cao chi tiet

Cong thuc diem tong:

Final Score = Content Score x 70% + AI Skill Score x 30%

## 2. Kien Truc Tong The

- Frontend: React 18 + Vite + React Router
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- AI Service: OpenAI API hoac Azure OpenAI
- File Storage: Azure Blob Storage (luu tai lieu nguon)
- Auth: JWT access token + refresh token cookie
- Monitoring: Application Insights

Kieu trien khai: monorepo voi 2 workspace backend va frontend.

## 3. Chuc Nang Day Du Theo Vai Tro

### 3.1 Giang Vien

1. Tao bai tap thu cong hoac bang AI
- Upload tai lieu PDF/DOCX/TXT
- Chon loai cau hoi: multiple-choice, essay, mixed
- Chon so luong cau hoi va do kho
- AI sinh cau hoi + dap an/rubric + giai thich
- Giang vien review, sua va publish

2. Quan ly vong doi bai tap
- Tao draft
- Chinh sua draft
- Publish cho sinh vien
- Regenerate cau hoi tu cung tai lieu
- Archive khi ket thuc hoc ky

3. Dashboard ket qua
- Danh sach tat ca submissions
- Loc theo bai tap, trang thai, sinh vien
- Xem diem noi dung, AI skill, final
- Xem thong ke su dung AI tren tung bai nop

4. Cham bai tu luan
- Ho tro cham theo rubric
- Cap nhat diem tung cau
- Luu nhan xet tong quan

5. Xem va khai thac AI Logs
- Xem timeline prompt/response cua sinh vien
- Xem prompt quality va metadata token
- Label prompt tot/xau de huan luyen mo hinh sau nay
- Export logs ra CSV/JSON

### 3.2 Sinh Vien

1. Xem danh sach bai tap duoc publish
- Loc va tim kiem bai tap
- Xem deadline, so cau hoi, loai bai

2. Lam bai online
- Tao submission voi trang thai draft
- Tra loi tung cau
- Auto-save dinh ky
- Nop bai khi hoan tat

3. Ho tro AI trong luc lam bai
- Chat voi AI theo ngu canh cau hoi hien tai
- Nhan goi y cai thien prompt theo thoi gian thuc
- Theo doi token su dung

4. Xem ket qua
- Xem Content Score, AI Skill Score, Final Score
- Xem feedback tu he thong va giang vien
- Xem lai bai da nop

## 4. Logic Danh Gia AI Skill

He thong khong cam AI, ma do chat luong su dung AI.

Cac thanh phan chinh:

1. Prompt quality
- Do ro muc tieu
- Co context hay khong
- Do cu the cua cau hoi
- Phat hien anti-pattern (xin dap an truc tiep, prompt qua mo ho)

2. Independence level
- So lan goi AI tren moi cau hoi
- Muc do phu thuoc vao AI

3. Iteration efficiency
- Ti le prompt trung lap
- Kha nang refine prompt theo huong tot hon

4. Dependency analysis
- Phat hien cac mau le thuoc AI
- Xep muc rui ro: Low, Medium, High, Critical

5. WISDOM framework
- Inquiry
- Disruptive Thinking
- Mindfulness

## 5. He Thong API Chinh

### Auth
- POST /api/auth/student/register
- POST /api/auth/instructor/register
- POST /api/auth/student/login
- POST /api/auth/instructor/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

### Assignment
- POST /api/assignment/generate
- POST /api/assignment
- GET /api/assignment/list
- GET /api/assignment/:id
- PUT /api/assignment/:id
- POST /api/assignment/:id/publish
- POST /api/assignment/:id/archive
- POST /api/assignment/:id/regenerate
- DELETE /api/assignment/:id

### Submission
- POST /api/submission/start
- GET /api/submission/:id
- PUT /api/submission/:id
- POST /api/submission/:id/submit
- POST /api/submission/:id/grade
- GET /api/submission/instructor/all
- GET /api/submission/student/my-submissions

### AI Chat va AI Assessment
- POST /api/ai/chat
- GET /api/ai-assessment/submission/:id
- GET /api/ai-assessment/submission/:id/summary
- GET /api/ai-assessment/submission/:id/timeline
- GET /api/ai-assessment/submission/:id/prompts/top
- GET /api/ai-assessment/submission/:id/wisdom
- GET /api/ai-assessment/submission/:id/dependency
- GET /api/ai-assessment/submission/:id/rubric
- GET /api/ai-assessment/submission/:id/warnings

### Logs va Analytics
- GET /api/logs/submission/:submissionId
- POST /api/logs/label
- GET /api/logs/export
- GET /api/analytics/assignment/:id
- GET /api/analytics/student/:id

## 6. Bao Mat va Van Hanh

- Role-based access control (student/instructor)
- JWT access token ngan han + refresh token httpOnly cookie
- Helmet security headers
- Rate limiting cho API va AI chat
- Validate file upload va gioi han dung luong
- CORS control theo environment
- Logging + telemetry voi Application Insights

## 7. Testing va Chat Luong Code

- Backend test: Jest + Supertest + mongodb-memory-server
- Frontend test: Vitest + React Testing Library
- Lint/format: ESLint + Prettier
- Coverage threshold duoc khai bao trong backend package config

Muc tieu test:
- Auth flow
- Assignment flow
- Submission flow
- AI chat logic
- Analytics va logs
- Utility modules (grading, parser, ai assessment)

## 8. Cau Truc Thu Muc Chinh

- backend/src/routes: API routes
- backend/src/models: Mongoose models
- backend/src/middleware: auth, security, upload, error handling
- backend/src/utils: document parser, question generator, grading, AI assessment
- frontend/src/pages: pages cho instructor va student
- frontend/src/components: reusable UI components
- frontend/src/contexts: auth va assignment context
- frontend/src/utils: API client va helpers

## 9. Huong Dan Chay Local

Yeu cau:
- Node.js 18+
- npm 9+
- MongoDB URI
- OpenAI API key hoac Azure OpenAI credentials

Cac buoc:

1. Cai dependencies
- o root: npm run install:all

2. Cau hinh backend environment
- Tao file backend/.env
- Dien cac bien toi thieu:
	- MONGODB_URI
	- OPENAI_API_KEY
	- JWT_SECRET
	- FRONTEND_URL

3. Chay he thong
- root: npm run dev
- frontend: http://localhost:5173
- backend: http://localhost:5000

## 10. Dinh Huong Mo Rong

- LMS integration (Moodle, Canvas, Google Classroom)
- SSO voi he thong truong
- AI grading nang cao cho essay
- Prompt suggestion engine
- Phat hien nguy co hoc tap som dua tren pattern su dung AI

## 11. Thong Tin Danh Cho Nha Tuyen Dung

Du an the hien kha nang full-stack va AI integration trong bai toan giao duc thuc te:

- Phan tich nghiep vu va thiet ke luong du lieu end-to-end
- Xay dung REST API co phan quyen va security best practices
- Tich hop mo hinh AI vao product workflow, khong chi demo chatbot
- Thiet ke he thong scoring co logic danh gia hanh vi su dung AI
- To chuc codebase monorepo, co test, lint, monitoring

Neu can ban demo cho doanh nghiep, co the bat dau tu 2 luong chinh:
- Instructor: tao bai tap bang tai lieu va publish
- Student: lam bai, chat AI, submit, xem bao cao diem va AI skill

### OpenAI API lỗi

- Verify `OPENAI_API_KEY` hợp lệ
- Kiểm tra billing account có đủ credits
- Test API key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### File upload không hoạt động

- Kiểm tra `AZURE_STORAGE_CONNECTION_STRING`
- Verify container 'assignment-documents' đã được tạo
- Kiểm tra file size limit (mặc định 10MB)

## 📚 Tài Liệu Thêm

- Xem `.github/copilot-instructions.md` để hiểu rõ architecture và data flow
- API Documentation: (sẽ thêm Swagger/OpenAPI)
- Database Schema: Xem `backend/models/`

## 🤝 Contributing

(Thêm hướng dẫn contribute nếu là project mở)

## 📄 License

ISC License

## 👥 Team

- Developer: Hồ Đình Tiến Nghĩa

