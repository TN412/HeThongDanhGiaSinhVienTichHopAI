# AI-Integrated Student Assessment System

Hệ thống tạo bài tập và đánh giá năng lực sinh viên tích hợp AI - cho phép sinh viên sử dụng AI trong quá trình học tập và đánh giá cả kiến thức chuyên môn LẪN khả năng sử dụng AI hiệu quả.

## 🎯 Tính Năng Chính

1. **Tạo Bài Tập Tự Động** - Giảng viên upload tài liệu (PDF, DOCX, TXT) và AI tự động tạo câu hỏi trắc nghiệm hoặc tự luận
2. **Hỗ Trợ AI Trong Quá Trình Làm Bài** - Sinh viên được phép hỏi AI bất cứ lúc nào, tất cả tương tác được ghi log
3. **Tự Động Chấm Điểm & Đánh Giá** - Hệ thống tự động chấm trắc nghiệm và tính điểm kỹ năng sử dụng AI
4. **Dashboard Phân Tích** - Giảng viên xem kết quả, log tương tác AI, và đánh giá năng lực sinh viên

**Công thức điểm:** Final Score = Content Score (70%) + AI Skill Score (30%)

## 🛠 Công Nghệ

### Backend

- Node.js + Express
- MongoDB Atlas (Mongoose ODM)
- OpenAI API / Azure OpenAI
- Azure Blob Storage
- JWT Authentication

### Frontend

- React 18 + Vite
- React Router v6
- Axios

## 📋 Yêu Cầu Hệ Thống

- Node.js >= 18.x
- npm >= 9.x
- MongoDB Atlas account
- OpenAI API key hoặc Azure OpenAI endpoint

## 🚀 Cài Đặt và Chạy Cục Bộ (Local Development)

### 1. Clone Repository

```bash
git clone <repository-url>
cd DoAnChuyenNganh
```

### 2. Cài Đặt Dependencies

```bash
# Cài đặt tất cả dependencies cho backend và frontend
npm run install:all

# Hoặc cài đặt riêng lẻ
cd backend
npm install

cd ../frontend
npm install
```

### 3. Cấu Hình Backend

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa file `.env` và điền các thông tin:

```env
# Bắt buộc
OPENAI_API_KEY=sk-your-openai-api-key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_assessment_system
JWT_SECRET=your-secret-key-here

# Azure Blob Storage (bắt buộc cho upload tài liệu)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

**Tạo JWT Secret:**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 4. Chạy Development Server

#### Chạy Backend (Port 5000)

```bash
cd backend
npm run dev
```

#### Chạy Frontend (Port 5173)

```bash
cd frontend
npm run dev
```

#### Hoặc chạy cả hai cùng lúc từ root

```bash
npm run dev
```

### 5. Truy Cập Ứng Dụng

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Docs:** http://localhost:5000/api-docs (sẽ thêm sau)

## 📁 Cấu Trúc Dự Án

```
DoAnChuyenNganh/
├── backend/                 # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── routes/         # API routes (assignment, submission, ai, analytics)
│   │   ├── models/         # Mongoose models
│   │   ├── middleware/     # Auth, upload, error handling
│   │   ├── utils/          # Helpers (documentParser, grading, etc.)
│   │   └── server.js       # Entry point
│   ├── scripts/            # Database setup, seeding
│   ├── .env.example        # Environment variables template
│   └── package.json
│
├── frontend/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/          # React pages (Dashboard, Assignment, etc.)
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React Context (auth, assignment state)
│   │   ├── utils/          # API client, helpers
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
├── .github/
│   └── workflows/          # CI/CD for Azure deployment
│
├── .gitignore
├── package.json            # Monorepo workspace configuration
└── README.md
```

## 🔧 Scripts

### Root (Monorepo)

- `npm run install:all` - Cài đặt dependencies cho tất cả workspaces
- `npm run dev` - Chạy backend và frontend cùng lúc
- `npm run dev:backend` - Chỉ chạy backend
- `npm run dev:frontend` - Chỉ chạy frontend
- `npm run lint` - Lint tất cả code (backend + frontend)
- `npm run lint:fix` - Auto-fix lint issues
- `npm run format` - Format tất cả code với Prettier
- `npm run format:check` - Kiểm tra formatting

### Backend

- `npm run dev` - Chạy development server với nodemon
- `npm start` - Chạy production server
- `npm test` - Chạy tests (sẽ thêm sau)
- `npm run lint` - Lint backend code
- `npm run lint:fix` - Auto-fix lint issues
- `npm run format` - Format code với Prettier

### Frontend

- `npm run dev` - Chạy Vite dev server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Lint frontend code
- `npm run lint:fix` - Auto-fix lint issues
- `npm run format` - Format code với Prettier

## 🗄 Database Setup

Khi chạy lần đầu, backend sẽ tự động kết nối MongoDB Atlas. Bạn có thể chạy scripts để tạo indexes và seed data:

```bash
cd backend
node scripts/setup-indexes.js  # Tạo indexes cho performance
node scripts/seed.js            # (Optional) Seed test data
```

## 🎨 Code Quality

Dự án sử dụng ESLint + Prettier cho code consistency:

- **ESLint**: Phát hiện lỗi code và enforce best practices
- **Prettier**: Auto-format code theo chuẩn
- **EditorConfig**: Đảm bảo consistency giữa các editors (2 spaces, UTF-8, LF)
- **Husky + lint-staged**: Tự động format code trước khi commit

**Xem chi tiết:** [`LINTING.md`](./LINTING.md)

```bash
# Lint toàn bộ project
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format với Prettier
npm run format

# Kiểm tra formatting
npm run format:check
```

**Pre-commit hook** sẽ tự động chạy Prettier và ESLint trên staged files.

## 🔐 Authentication Flow

1. Giảng viên/Sinh viên đăng nhập → Nhận JWT access token (15 phút) + refresh token (7 ngày)
2. Access token lưu trong memory, refresh token trong httpOnly cookie
3. Mọi API request đính kèm access token trong header `Authorization: Bearer <token>`
4. Khi access token hết hạn, tự động refresh bằng refresh token

## 📊 API Endpoints (Overview)

### Assignment Routes

- `POST /api/assignment/generate` - Upload tài liệu + AI tạo câu hỏi
- `GET /api/assignment/:id` - Xem chi tiết bài tập
- `POST /api/assignment/:id/publish` - Publish bài tập

### Submission Routes

- `POST /api/submission/start` - Bắt đầu làm bài
- `PUT /api/submission/:id` - Lưu nháp
- `POST /api/submission/:id/submit` - Nộp bài

### AI Chat Routes

- `POST /api/ai/chat` - Sinh viên hỏi AI (tự động log)

### Analytics Routes

- `GET /api/logs/submission/:submissionId` - Xem log AI
- `GET /api/analytics/assignment/:id` - Thống kê bài tập

## 🚨 Troubleshooting

### Backend không kết nối được MongoDB

- Kiểm tra `MONGODB_URI` trong `.env`
- Đảm bảo IP của bạn được whitelist trong MongoDB Atlas
- Test connection: `mongosh "your-connection-string"`

### Frontend không gọi được API

- Kiểm tra `FRONTEND_URL` trong backend `.env` (CORS)
- Đảm bảo backend đang chạy trên port 5000
- Kiểm tra axios baseURL trong `frontend/src/utils/api.js`

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

- Developer: [Tên bạn]
- Supervisor: [Tên giảng viên hướng dẫn]

---

**Lưu ý:** Đây là project đồ án chuyên ngành. Không được sử dụng cho mục đích thương mại mà không có sự cho phép.
