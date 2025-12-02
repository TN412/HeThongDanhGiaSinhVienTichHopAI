# Frontend - AI-Integrated Student Assessment System

## 🎯 Tổng Quan

Giao diện người dùng cho hệ thống đánh giá sinh viên tích hợp AI, được xây dựng với React, Vite, và Material Design inspired UI.

## ✨ Tính Năng Chính

### 👨‍🏫 Giảng Viên (Instructor)

1. **Tạo Bài Tập với AI** (`AssignmentCreatePage`)
   - Upload tài liệu (PDF, DOCX, TXT)
   - AI tự động tạo câu hỏi trắc nghiệm hoặc tự luận
   - Review và chỉnh sửa câu hỏi trước khi xuất bản
   - Cấu hình: số lượng câu, độ khó, loại câu hỏi

2. **Dashboard Tổng Quan** (`InstructorDashboard`)
   - Thống kê: Tổng bài tập, bài làm, cần chấm, AI skill trung bình
   - Bảng submissions với filter và search
   - Xem chi tiết điểm số (Content + AI Skill + Final)
   - Xem log AI của sinh viên
   - Chấm bài tự luận
   - Export CSV

### 👨‍🎓 Sinh Viên (Student)

1. **Danh Sách Bài Tập** (`StudentAssignmentListPage`)
   - Browse tất cả bài tập đã publish
   - Filter theo loại câu hỏi (trắc nghiệm/tự luận/mixed)
   - Search theo tiêu đề/mô tả
   - Xem metadata: deadline, điểm số, số câu, AI allowed
   - Bắt đầu làm bài

2. **Làm Bài Tập** (`AssignmentTakingPage`)
   - Hiển thị câu hỏi từng câu một
   - Navigation: Previous, Next, Question Navigator (grid)
   - Auto-save mỗi 30 giây
   - AI Chat Sidebar (toggleable)
   - Progress bar
   - Submit với confirmation
   - Beforeunload warning để tránh mất dữ liệu

3. **Xem Kết Quả** (`StudentResultsPage`)
   - 3 điểm số: Content, AI Skill, Final (weighted)
   - Chi tiết từng câu hỏi (đáp án đúng/sai, giải thích)
   - Thống kê sử dụng AI (số lần hỏi, độc lập, chất lượng prompt)
   - Feedback tự động từ hệ thống
   - Nhận xét từ giảng viên (nếu có)

## 🎨 Design System

### Color Palette

```css
--primary-color: #2196f3 /* Blue - primary actions */ --success-color: #4caf50
  /* Green - success states */ --danger-color: #f44336 /* Red - errors, warnings */
  --warning-color: #ff9800 /* Orange - warnings */ --info-color: #00bcd4 /* Cyan - info messages */
  --gray-50: #fafafa /* Backgrounds */ --gray-900: #212121 /* Text */;
```

### Typography

- Font Family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- Base Font Size: 16px
- Line Height: 1.6
- Headings: h1 (32px) → h6 (14px)

### Component Library

- **Buttons**: `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-outline`
- **Cards**: `.card`, `.card-header`, `.card-body`, `.card-footer`
- **Forms**: `.form-control`, `.form-label`, `.form-error`, `.form-help`
- **Grid**: `.grid-2`, `.grid-3`, `.grid-4` (responsive)
- **Badges**: `.badge-primary`, `.badge-success`, etc.
- **Alerts**: `.alert-info`, `.alert-success`, `.alert-danger`, `.alert-warning`
- **Progress**: `.progress`, `.progress-bar`
- **Loading**: `.loading`, `.loading-lg`

### Spacing System

- Base unit: 8px
- Utilities: `.mt-1` (8px), `.mt-2` (16px), `.mt-3` (24px), `.mt-4` (32px)
- Gap utilities: `.gap-1`, `.gap-2`, `.gap-3`

### Responsive Design

- Mobile-first approach
- Breakpoint: 768px
- Grid columns collapse to 1 on mobile
- Font sizes scale down on mobile

## 📁 Cấu Trúc Thư Mục

```
frontend/
├── src/
│   ├── components/
│   │   ├── AIChat.jsx                  # AI chat sidebar
│   │   ├── Layout.jsx                  # Main layout wrapper
│   │   ├── ProtectedRoute.jsx          # Auth guard
│   │   └── ...
│   ├── contexts/
│   │   ├── AuthContext.jsx             # Auth state management
│   │   └── AssignmentContext.jsx       # Assignment state
│   ├── pages/
│   │   ├── LoginPage.jsx               # Login form
│   │   ├── RegisterPage.jsx            # Student registration
│   │   ├── InstructorRegisterPage.jsx  # Instructor registration
│   │   ├── InstructorDashboard.jsx     # Instructor dashboard
│   │   ├── AssignmentCreatePage.jsx    # Create assignment with AI
│   │   ├── StudentAssignmentListPage.jsx # Browse assignments
│   │   ├── AssignmentTakingPage.jsx    # Take assignment
│   │   └── StudentResultsPage.jsx      # View results
│   ├── styles/
│   │   └── global.css                  # Global design system (500+ lines)
│   ├── utils/
│   │   └── api.js                      # Axios instance + JWT interceptors
│   ├── App.jsx                         # Route configuration
│   └── main.jsx                        # Entry point
├── public/
└── package.json
```

## 🔌 API Endpoints Used

### Authentication

- `POST /student/login` - Student login
- `POST /student/register` - Student registration
- `POST /instructor/login` - Instructor login
- `POST /instructor/register` - Instructor registration

### Assignments (Instructor)

- `POST /assignment/generate` - Upload document + AI generate questions
- `GET /assignment/list` - Get all assignments
- `POST /assignment/:id/publish` - Publish assignment

### Assignments (Student)

- `GET /assignment/list` - Browse published assignments
- `POST /submission/start` - Start assignment (create submission)
- `GET /submission/:id` - Get submission data
- `PUT /submission/:id` - Save draft (auto-save)
- `POST /submission/:id/submit` - Submit final answers

### AI Chat

- `POST /ai/chat` - Send prompt to AI
  - Body: `{ submissionId, questionId, prompt, context }`
  - Response: `{ message, tokensUsed, promptQuality }`

### Analytics (Instructor)

- `GET /submission/instructor/all` - Get all submissions for dashboard

## 🚀 Local Development

### Prerequisites

- Node.js 18+ và npm
- Backend API running on `http://localhost:5000`

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Run Development Server

```bash
npm run dev
# Runs on http://localhost:5173
```

### Build for Production

```bash
npm run build
# Output in dist/
```

## 🧪 Testing

### Manual Testing Checklist

#### Instructor Workflow

- [ ] Login as instructor
- [ ] Navigate to "Tạo bài tập mới"
- [ ] Upload PDF document
- [ ] Configure: 10 questions, multiple-choice, medium difficulty
- [ ] Wait for AI generation (30-60s)
- [ ] Review generated questions
- [ ] Click "Xuất bản bài tập"
- [ ] Return to dashboard
- [ ] Verify assignment appears in list

#### Student Workflow

- [ ] Login as student
- [ ] Browse assignments (filter, search)
- [ ] Click "Bắt đầu làm bài"
- [ ] Answer questions
- [ ] Click AI chat button (🤖)
- [ ] Ask AI a question
- [ ] Navigate between questions (prev/next)
- [ ] Wait 30 seconds, refresh page
- [ ] Verify auto-save worked (answers persist)
- [ ] Fill all questions
- [ ] Click "Nộp bài"
- [ ] Confirm submission
- [ ] View results page
- [ ] Verify scores displayed correctly

#### Dashboard Testing

- [ ] Login as instructor
- [ ] View statistics cards
- [ ] Filter submissions by assignment
- [ ] Filter by status
- [ ] Search by student name
- [ ] Click "Xem chi tiết" on submission
- [ ] Click "Xem log AI"
- [ ] Click "Export CSV"
- [ ] Verify CSV downloads

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📱 Responsive Behavior

### Desktop (>768px)

- Grid layouts: 2, 3, or 4 columns
- AI Chat sidebar: 400px width
- Full navigation visible
- Large font sizes

### Mobile (<768px)

- Grid collapses to 1 column
- AI Chat: Full width overlay
- Hamburger menu
- Smaller font sizes
- Touch-friendly buttons (min 44x44px)

## 🔐 Security Features

### Authentication

- JWT tokens stored in httpOnly cookies (refresh token)
- Access token in memory (not localStorage)
- Automatic token refresh
- Role-based access control (student/instructor)

### Input Validation

- File upload: Type (PDF/DOCX/TXT), Size (max 10MB)
- Form validation on all inputs
- XSS prevention (React auto-escapes)
- API error handling

### Data Protection

- Beforeunload warning on unsaved changes
- Auto-save every 30 seconds
- Optimistic UI updates
- Error recovery

## 🎯 Performance Optimizations

### Code Splitting

- React Router lazy loading (future enhancement)
- Dynamic imports for large components

### Asset Optimization

- CSS minification in production
- Tree shaking with Vite
- Gzip compression

### API Optimization

- Debounced search inputs
- Cached API responses (React Query - future)
- Parallel requests with Promise.all

### UX Optimizations

- Loading states everywhere
- Skeleton loaders (future enhancement)
- Optimistic updates
- Error boundaries

## 🐛 Known Issues & Limitations

1. **No Dark Mode** - Only light theme available
2. **No Offline Support** - Requires internet connection
3. **Limited Mobile Optimization** - Some components need better touch targets
4. **No Real-time Updates** - Requires manual refresh (WebSockets future)
5. **Large File Uploads** - May timeout for >10MB files

## 🔮 Future Enhancements

### Phase 1 (High Priority)

- [ ] Add toast notifications (react-toastify)
- [ ] Implement dark mode toggle
- [ ] Add keyboard shortcuts (arrow keys for question navigation)
- [ ] Real-time AI typing indicator
- [ ] Better mobile navigation

### Phase 2 (Medium Priority)

- [ ] PWA support (offline mode)
- [ ] Push notifications for deadlines
- [ ] Real-time collaboration (multiple students)
- [ ] Voice input for AI chat
- [ ] Image upload in essay answers

### Phase 3 (Nice to Have)

- [ ] Analytics dashboard with charts (Chart.js)
- [ ] Export results to PDF
- [ ] Student progress tracking
- [ ] Gamification (badges, leaderboard)
- [ ] AI tutor mode (proactive hints)

## 📚 Documentation

### Key Files to Understand

1. **global.css** - All design system tokens and component styles
2. **AssignmentTakingPage.jsx** - Most complex page with auto-save + AI chat
3. **AIChat.jsx** - AI integration with prompt quality tracking
4. **api.js** - Axios setup with JWT interceptors
5. **App.jsx** - Route configuration with role-based guards

### Code Conventions

- **Component Naming**: PascalCase (e.g., `StudentResultsPage.jsx`)
- **Function Naming**: camelCase (e.g., `handleSubmit`)
- **CSS Classes**: kebab-case (e.g., `.assignment-card`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Vietnamese Comments**: Inline comments in Vietnamese for domain logic
- **English Comments**: JSDoc comments in English

### State Management Patterns

- **Local State**: `useState` for component-specific state
- **Context**: `AuthContext`, `AssignmentContext` for global state
- **Refs**: `useRef` for timers, DOM references (not state)
- **Effects**: `useEffect` for side effects (API calls, timers)

## 🤝 Contributing Guidelines

### Before Making Changes

1. Check existing components in `global.css` before adding new styles
2. Follow Vietnamese language convention for all UI text
3. Test on both desktop and mobile (768px breakpoint)
4. Ensure auto-save works (wait 30 seconds)
5. Check console for errors/warnings

### Pull Request Checklist

- [ ] All new pages use `global.css` classes
- [ ] All UI text in Vietnamese
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Follows existing code patterns

## 📞 Support

### Common Issues

**Q: "Auto-save không hoạt động?"**
A: Kiểm tra:

- Console có lỗi không?
- Status của submission có phải `draft` không?
- API `/submission/:id` có trả về 200 không?

**Q: "AI Chat không gửi được tin nhắn?"**
A: Kiểm tra:

- Backend có bật OpenAI API không?
- Assignment có `allowAI: true` không?
- Console có lỗi CORS không?

**Q: "Upload file bị lỗi?"**
A: Kiểm tra:

- File type (chỉ PDF, DOCX, TXT)
- File size (<10MB)
- Azure Blob Storage credentials trong backend

**Q: "Điểm số không hiển thị?"**
A: Kiểm tra:

- Submission status có phải `submitted` không?
- Backend có chạy auto-grading không?
- Console có lỗi API không?

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

---

**Developed with ❤️ for AI-Integrated Education**
