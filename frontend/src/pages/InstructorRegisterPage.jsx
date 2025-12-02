import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './RegisterPage.css';

function InstructorRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'instructor' ? '/instructor/dashboard' : '/student/assignments');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      // Call register with 'instructor' role
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        { department: formData.department },
        'instructor' // Pass instructor role
      );

      if (result.success) {
        console.log('✅ Instructor registration successful:', result.user);
        // Navigation will be handled by AuthContext
      } else {
        setError(result.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>👨‍🏫 Tạo Tài Khoản Giảng Viên</h1>
          <p>Đăng ký tài khoản giảng viên AI Assessment System</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Họ và Tên *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="instructor@university.edu"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Khoa/Bộ Môn</label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="Khoa Công Nghệ Thông Tin"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật Khẩu *</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={6}
            />
            <small className="form-hint">Tối thiểu 6 ký tự</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác Nhận Mật Khẩu *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
          </button>

          <div className="register-footer">
            <p>
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
            <p>
              <Link to="/register">Đăng ký tài khoản sinh viên</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InstructorRegisterPage;
