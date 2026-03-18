# Hệ Thống Đánh Giá Sinh Viên Tích Hợp AI (AI-Integrated Student Assessment System)

Đây là hệ thống tạo bài tập và đánh giá năng lực sinh viên có tích hợp AI dành cho bối cảnh đại học, cao đẳng.

Dự án đánh giá đồng thời hai khía cạnh:
- Năng lực chuyên môn (kết quả bài làm)
- Năng lực sử dụng AI (chất lượng prompt, mức độ độc lập, khả năng tư duy)

Mục tiêu chính: cho phép sinh viên sử dụng AI một cách có kiểm soát, đồng thời giúp giảng viên theo dõi chất lượng học tập toàn diện thay vì chỉ xem đúng/sai.

## 1. Giá Trị Sản Phẩm

- Tự động tạo đề bài từ tài liệu học tập (PDF, DOCX, TXT)
- Sinh viên làm bài có AI tutor theo ngữ cảnh câu hỏi
- Lưu toàn bộ tương tác AI để đánh giá kỹ năng prompt
- Chấm điểm kết hợp nội dung + kỹ năng sử dụng AI
- Dashboard phân tích cho giảng viên với logs và báo cáo chi tiết

Công thức điểm tổng:

Final Score = Content Score x 70% + AI Skill Score x 30%

## 2. Kiến Trúc Tổng Thể

- Frontend: React 18 + Vite + React Router
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- AI Service: OpenAI API hoặc Azure OpenAI
- File Storage: Azure Blob Storage (lưu tài liệu nguồn)
- Auth: JWT access token + refresh token cookie
- Monitoring: Application Insights

Kiểu triển khai: monorepo với 2 workspace backend và frontend.

## 3. Chức Năng Theo Vai Trò

### 3.1. Giảng viên

1. Tạo bài tập thủ công hoặc bằng AI
- Upload tài liệu PDF/DOCX/TXT
- Chọn loại câu hỏi: multiple-choice, essay, mixed
- Chọn số lượng câu hỏi và độ khó
- AI sinh câu hỏi + đáp án/rubric + giải thích
- Giảng viên review, sửa và publish

2. Quản lý vòng đời bài tập
- Tạo draft
- Chỉnh sửa draft
- Publish cho sinh viên
- Regenerate câu hỏi từ cùng tài liệu
- Archive khi kết thúc học kỳ

3. Dashboard kết quả
- Danh sách tất cả submissions
- Lọc theo bài tập, trạng thái, sinh viên
- Xem điểm nội dung, AI skill, final
- Xem thống kê sử dụng AI trên từng bài nộp

4. Chấm bài tự luận
- Hỗ trợ chấm theo rubric
- Cập nhật điểm từng câu
- Lưu nhận xét tổng quan

5. Xem và khai thác AI logs
- Xem timeline prompt/response của sinh viên
- Xem prompt quality và metadata token
- Label prompt tốt/xấu để huấn luyện mô hình sau này
- Export logs ra CSV/JSON

### 3.2. Sinh viên

1. Xem danh sách bài tập đã publish
- Lọc và tìm kiếm bài tập
- Xem deadline, số câu hỏi, loại bài

2. Làm bài online
- Tạo submission với trạng thái draft
- Trả lời từng câu
- Auto-save định kỳ
- Nộp bài khi hoàn tất

3. Hỗ trợ AI trong lúc làm bài
- Chat với AI theo ngữ cảnh câu hỏi hiện tại
- Nhận gợi ý cải thiện prompt theo thời gian thực
- Theo dõi token sử dụng

4. Xem kết quả
- Xem Content Score, AI Skill Score, Final Score
- Xem feedback từ hệ thống và giảng viên
- Xem lại bài đã nộp

## 4. Logic Đánh Giá AI Skill

Hệ thống không cấm AI, mà đánh giá chất lượng sử dụng AI.

Các thành phần chính:

1. Prompt quality
- Độ rõ mục tiêu
- Có context hay không
- Độ cụ thể của câu hỏi
- Phát hiện anti-pattern (xin đáp án trực tiếp, prompt quá mơ hồ)

2. Independence level
- Số lần gọi AI trên mỗi câu hỏi
- Mức độ phụ thuộc vào AI

3. Iteration efficiency
- Tỷ lệ prompt trùng lặp
- Khả năng refine prompt theo hướng tốt hơn

4. Dependency analysis
- Phát hiện các mẫu lệ thuộc AI
- Xếp mức rủi ro: Low, Medium, High, Critical

5. WISDOM framework
- Inquiry
- Disruptive Thinking
- Mindfulness

## 5. Hệ Thống API Chính

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

### AI Chat và AI Assessment
- POST /api/ai/chat
- GET /api/ai-assessment/submission/:id
- GET /api/ai-assessment/submission/:id/summary
- GET /api/ai-assessment/submission/:id/timeline
- GET /api/ai-assessment/submission/:id/prompts/top
- GET /api/ai-assessment/submission/:id/wisdom
- GET /api/ai-assessment/submission/:id/dependency
- GET /api/ai-assessment/submission/:id/rubric
- GET /api/ai-assessment/submission/:id/warnings

### Logs và Analytics
- GET /api/logs/submission/:submissionId
- POST /api/logs/label
- GET /api/logs/export
- GET /api/analytics/assignment/:id
- GET /api/analytics/student/:id

## 6. Bảo Mật và Vận Hành

- Role-based access control (student/instructor)
- JWT access token ngắn hạn + refresh token httpOnly cookie
- Helmet security headers
- Rate limiting cho API và AI chat
- Validate file upload và giới hạn dung lượng
- CORS control theo environment
- Logging + telemetry với Application Insights

## 7. Testing và Chất Lượng Code

- Backend test: Jest + Supertest + mongodb-memory-server
- Frontend test: Vitest + React Testing Library
- Lint/format: ESLint + Prettier
- Coverage threshold được khai báo trong backend package config

Mục tiêu test:
- Auth flow
- Assignment flow
- Submission flow
- AI chat logic
- Analytics và logs
- Utility modules (grading, parser, ai assessment)

## 8. Cấu Trúc Thư Mục Chính

- backend/src/routes: API routes
- backend/src/models: Mongoose models
- backend/src/middleware: auth, security, upload, error handling
- backend/src/utils: document parser, question generator, grading, AI assessment
- frontend/src/pages: pages cho instructor và student
- frontend/src/components: reusable UI components
- frontend/src/contexts: auth và assignment context
- frontend/src/utils: API client và helpers

## 9. Hướng Dẫn Chạy Local

Yêu cầu:
- Node.js 18+
- npm 9+
- MongoDB URI
- OpenAI API key hoặc Azure OpenAI credentials

Các bước:

1. Cài dependencies
- Ở root: npm run install:all

2. Cấu hình backend environment
- Tạo file backend/.env
- Điền các biến tối thiểu:
	- MONGODB_URI
	- OPENAI_API_KEY
	- JWT_SECRET
	- FRONTEND_URL

3. Chạy hệ thống
- Root: npm run dev
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 10. Định Hướng Mở Rộng

- LMS integration (Moodle, Canvas, Google Classroom)
- SSO với hệ thống trường
- AI grading nâng cao cho essay
- Prompt suggestion engine
- Phát hiện nguy cơ học tập sớm dựa trên pattern sử dụng AI

## 11. Thông Tin Dành Cho Nhà Tuyển Dụng

Dự án thể hiện khả năng full-stack và AI integration trong bài toán giáo dục thực tế:

- Phân tích nghiệp vụ và thiết kế luồng dữ liệu end-to-end
- Xây dựng REST API có phân quyền và security best practices
- Tích hợp mô hình AI vào product workflow, không chỉ demo chatbot
- Thiết kế hệ thống scoring có logic đánh giá hành vi sử dụng AI
- Tổ chức codebase monorepo, có test, lint, monitoring

Nếu cần demo cho doanh nghiệp, có thể bắt đầu từ 2 luồng chính:
- Instructor: tạo bài tập bằng tài liệu và publish
- Student: làm bài, chat AI, submit, xem báo cáo điểm và AI skill

## 12. Troubleshooting

### OpenAI API lỗi

- Verify OPENAI_API_KEY hợp lệ
- Kiểm tra billing account có đủ credits
- Test API key:
	curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"

### File upload không hoạt động

- Kiểm tra AZURE_STORAGE_CONNECTION_STRING
- Verify container assignment-documents đã được tạo
- Kiểm tra file size limit (mặc định 10MB)

## 13. Tài Liệu Thêm

- Xem .github/copilot-instructions.md để hiểu rõ architecture và data flow
- API documentation: sẽ bổ sung Swagger/OpenAPI
- Database schema: xem backend/src/models

## 14. License

ISC License

## 15. Team

- Developer: Hồ Đình Tiến Nghĩa

