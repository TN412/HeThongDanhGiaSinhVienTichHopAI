import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { healthCheck } from '../utils/api';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from =
        location.state?.from?.pathname ||
        (user.role === 'instructor' ? '/instructor/dashboard' : '/student/assignments');
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const checkBackendHealth = async () => {
    try {
      const response = await healthCheck();
      console.log('✅ Backend health check:', response);
      setBackendStatus('connected');
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      setBackendStatus('disconnected');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password, role);

      if (result.success) {
        console.log('✅ Login successful:', result.user);
        // Navigation will be handled by useEffect above
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎓 AI Assessment System</h1>
          <p>Hệ thống đánh giá năng lực sinh viên tích hợp AI</p>

          {/* Backend status indicator */}
          <div className={`backend-status ${backendStatus}`}>
            {backendStatus === 'checking' && '🔄 Checking backend...'}
            {backendStatus === 'connected' && '✅ Backend connected'}
            {backendStatus === 'disconnected' && '❌ Backend disconnected'}
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={e => setRole(e.target.value)} required>
              <option value="student">Student (Sinh viên)</option>
              <option value="instructor">Instructor (Giảng viên)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || backendStatus === 'disconnected'}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="login-footer">
            <p>
              Don&apos;t have an account? <a href="/register">Register</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
