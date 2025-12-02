# Hướng Dẫn Tạo Tài Khoản Giảng Viên (Instructor Account)

## 🎯 Có 3 Cách Tạo Tài Khoản Giảng Viên:

---

## 1️⃣ Cách 1: Đăng Ký Qua Frontend (Khuyến Nghị)

### Bước 1: Chạy Backend và Frontend

```powershell
# Terminal 1 - Backend
cd C:\workspace\DoAnChuyenNganh\backend
npm run dev

# Terminal 2 - Frontend
cd C:\workspace\DoAnChuyenNganh\frontend
npm run dev
```

### Bước 2: Truy Cập Trang Đăng Ký

- Mở browser: `http://localhost:5173/register`
- Click vào link **"Are you an instructor? Register as Instructor"**
- Hoặc truy cập trực tiếp: `http://localhost:5173/register/instructor`

### Bước 3: Điền Form Đăng Ký

- **Họ và Tên**: Nguyễn Văn A
- **Email**: instructor@example.com
- **Khoa/Bộ Môn**: Khoa Công Nghệ Thông Tin
- **Mật Khẩu**: password123 (tối thiểu 6 ký tự)
- **Xác Nhận Mật Khẩu**: password123

### Bước 4: Đăng Ký

- Click button **"Đăng Ký"**
- Nếu thành công → Tự động đăng nhập và chuyển đến `/instructor/dashboard`
- Nếu lỗi → Xem thông báo lỗi trên màn hình

---

## 2️⃣ Cách 2: Tạo Qua Script Interactive (Dễ Nhất)

```powershell
cd C:\workspace\DoAnChuyenNganh\backend
node create-instructor.js
```

**Script sẽ hỏi:**

```
👤 Tên giảng viên: Nguyễn Văn A
📧 Email: instructor1@example.com
🔒 Mật khẩu (tối thiểu 6 ký tự): password123
🏢 Khoa/Bộ môn: Khoa Công Nghệ Thông Tin
```

**Kết quả:**

```
✅ Tạo tài khoản giảng viên thành công!

📄 Thông tin tài khoản:
   ├─ ID: 691234567890abcdef123456
   ├─ Tên: Nguyễn Văn A
   ├─ Email: instructor1@example.com
   ├─ Vai trò: instructor
   ├─ Khoa: Khoa Công Nghệ Thông Tin
   └─ Ngày tạo: 2025-11-13T10:30:00.000Z

🔑 Đăng nhập với:
   URL: http://localhost:5173/login
   Email: instructor1@example.com
   Password: password123
```

---

## 3️⃣ Cách 3: Test API Trực Tiếp

### A. Dùng Script Test

```powershell
cd C:\workspace\DoAnChuyenNganh\backend
node test-instructor-register.js
```

### B. Dùng PowerShell

```powershell
$body = @{
    name = "Dr. Nguyễn Thị B"
    email = "instructor2@example.com"
    password = "password123"
    department = "Khoa Toán Học"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/instructor/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### C. Dùng curl

```bash
curl -X POST http://localhost:5000/api/auth/instructor/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Trần Văn C",
    "email": "instructor3@example.com",
    "password": "password123",
    "department": "Khoa Vật Lý"
  }'
```

---

## 📊 Kiểm Tra Tài Khoản Đã Tạo

### Xem Tất Cả Users (Bao Gồm Instructors)

```powershell
cd C:\workspace\DoAnChuyenNganh\backend
node list-users.js
```

**Kết quả sẽ hiển thị:**

```
📊 Total users in database: 5

👤 User #1:
   ID: 69157f7b1bdc480367faf193
   Name: Dr. Nguyễn Văn A
   Email: instructor@example.com
   Role: instructor
   Department: Khoa Công Nghệ Thông Tin
   ...
```

### Xóa User (Nếu Cần)

```powershell
cd C:\workspace\DoAnChuyenNganh\backend
node delete-user.js instructor@example.com
```

---

## 🔐 Đăng Nhập Sau Khi Tạo

### Frontend Login Page

1. Truy cập: `http://localhost:5173/login`
2. Chọn **"Login as Instructor"** (nếu có)
3. Nhập:
   - Email: `instructor@example.com`
   - Password: `password123`
4. Click **"Login"**
5. Sẽ chuyển đến: `/instructor/dashboard`

### API Login (Test)

```powershell
$body = @{
    email = "instructor@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/instructor/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

---

## 🛠️ Troubleshooting

### ❌ "Email already registered"

- Email đã tồn tại trong database
- **Giải pháp**: Dùng email khác hoặc xóa user cũ:
  ```powershell
  node delete-user.js old-email@example.com
  ```

### ❌ "Password must be at least 6 characters"

- Mật khẩu quá ngắn
- **Giải pháp**: Dùng mật khẩu ≥ 6 ký tự

### ❌ Backend không chạy

- **Kiểm tra**: Port 5000 có bị chiếm không?
  ```powershell
  Get-NetTCPConnection -LocalPort 5000
  ```
- **Giải pháp**: Kill process hoặc đổi port

### ❌ MongoDB connection error

- **Kiểm tra**: `.env` file có `MONGODB_URI` đúng không?
- **Giải pháp**: Kiểm tra connection string trong `.env`

---

## 📝 API Endpoints

| Method | Endpoint                        | Description          | Auth    |
| ------ | ------------------------------- | -------------------- | ------- |
| POST   | `/api/auth/instructor/register` | Đăng ký instructor   | Public  |
| POST   | `/api/auth/instructor/login`    | Login instructor     | Public  |
| POST   | `/api/auth/student/register`    | Đăng ký student      | Public  |
| POST   | `/api/auth/student/login`       | Login student        | Public  |
| GET    | `/api/auth/me`                  | Get current user     | Private |
| POST   | `/api/auth/logout`              | Logout               | Private |
| POST   | `/api/auth/refresh`             | Refresh access token | Private |

---

## 📂 Files Tham Khảo

### Backend

- `backend/src/routes/auth.js` - Routes cho registration/login
- `backend/src/models/User.js` - User schema
- `backend/create-instructor.js` - Script tạo instructor interactive
- `backend/test-instructor-register.js` - Script test API
- `backend/list-users.js` - Xem tất cả users
- `backend/delete-user.js` - Xóa user

### Frontend

- `frontend/src/pages/InstructorRegisterPage.jsx` - Trang đăng ký instructor
- `frontend/src/pages/RegisterPage.jsx` - Trang đăng ký student
- `frontend/src/contexts/AuthContext.jsx` - Auth context với register function
- `frontend/src/App.jsx` - Routes config

---

## ✅ Checklist Sau Khi Tạo

- [ ] Đã tạo tài khoản instructor thành công
- [ ] Đã thấy user trong database (qua `list-users.js`)
- [ ] Đăng nhập thành công qua frontend
- [ ] Truy cập `/instructor/dashboard` không bị lỗi 403
- [ ] Access token và refresh token hoạt động

---

## 🎯 Quick Commands

```powershell
# Tạo instructor interactive
cd backend; node create-instructor.js

# Test API registration
cd backend; node test-instructor-register.js

# Xem tất cả users
cd backend; node list-users.js

# Xóa user
cd backend; node delete-user.js email@example.com

# Chạy backend
cd backend; npm run dev

# Chạy frontend
cd frontend; npm run dev
```

---

**✨ Hoàn Thành!** Bây giờ bạn có thể tạo và quản lý tài khoản giảng viên.
