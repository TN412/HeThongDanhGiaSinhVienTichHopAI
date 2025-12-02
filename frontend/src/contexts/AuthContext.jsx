import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiClient, * as apiUtils from '../utils/api';

const AuthContext = createContext(null);

/**
 * AuthProvider component
 * Wraps the app and provides authentication state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if we have an access token
      const token = apiUtils.getAccessToken();

      if (!token) {
        // Try to refresh from httpOnly cookie (silently)
        try {
          const response = await fetch('http://localhost:5000/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            // Prevent browser from logging 401 errors to console
            cache: 'no-cache',
          });

          if (response.ok) {
            const data = await response.json();
            apiUtils.setAccessToken(data.accessToken);

            // Get user info
            const userResponse = await apiClient.get('/auth/me');
            setUser(userResponse.data.user);
          } else if (response.status === 401) {
            // Expected - no valid refresh token, user needs to login
            // Don't log error, this is normal
          }
        } catch (refreshError) {
          // Network error or other issues - silently ignore
          // This is expected when no session exists
        }
      } else {
        // Token exists, get user info
        try {
          const userResponse = await apiClient.get('/auth/me');
          setUser(userResponse.data.user);
        } catch (err) {
          apiUtils.clearAccessToken();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, role = 'student') => {
    try {
      const endpoint = role === 'instructor' ? 'instructor' : 'student';
      const response = await apiClient.post(`/auth/${endpoint}/login`, { email, password });

      if (response.data.accessToken) {
        apiUtils.setAccessToken(response.data.accessToken);
      }

      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name, email, password, additionalData = {}, role = 'student') => {
    try {
      console.log('🔵 Sending registration request:', { name, email, role, ...additionalData });

      const endpoint =
        role === 'instructor' ? '/auth/instructor/register' : '/auth/student/register';

      const response = await apiClient.post(endpoint, {
        name,
        email,
        password,
        ...additionalData,
      });

      console.log('✅ Registration response received:', response.data);

      if (response.data.accessToken) {
        apiUtils.setAccessToken(response.data.accessToken);
      }

      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      console.error('❌ Registration error:', err);
      console.error('❌ Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error?.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiUtils.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      apiUtils.clearAccessToken();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: user !== null,
    isStudent: user?.role === 'student',
    isInstructor: user?.role === 'instructor',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
