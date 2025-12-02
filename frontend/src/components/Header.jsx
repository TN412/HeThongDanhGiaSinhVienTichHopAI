import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">AI Assessment</span>
        </Link>

        <nav className="header-nav">
          {isAuthenticated ? (
            <>
              {user?.role === 'instructor' && (
                <>
                  <Link to="/instructor/dashboard" className="nav-link">
                    📊 Dashboard
                  </Link>
                  <Link to="/instructor/assignments" className="nav-link">
                    📚 Bài Tập
                  </Link>
                </>
              )}
              {user?.role === 'student' && (
                <>
                  <Link to="/student/assignments" className="nav-link">
                    📚 Bài Tập
                  </Link>
                  <Link to="/student/my-submissions" className="nav-link">
                    📊 Bài Đã Làm
                  </Link>
                </>
              )}

              <div className="user-info">
                <span className="user-name">
                  {user?.role === 'instructor' ? '👨‍🏫' : '👤'} {user?.name || user?.email}
                </span>
                <button onClick={handleLogout} className="logout-button">
                  🚪 Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="nav-link">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
