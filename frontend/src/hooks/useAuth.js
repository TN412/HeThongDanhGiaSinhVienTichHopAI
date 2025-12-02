import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../utils/api';

/**
 * Custom hook for authentication management
 * Stores access token in memory, uses httpOnly cookie for refresh token
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  /**
   * Initialize auth state on mount
   * Try to get current user if token exists
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if we have an access token in memory
      const token = api.getAccessToken();

      if (!token) {
        // No token, try to refresh from cookie
        try {
          const response = await fetch('http://localhost:5000/api/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Send httpOnly cookie
          });

          if (response.ok) {
            const data = await response.json();
            api.setAccessToken(data.accessToken);

            // Now get user info
            const userResponse = await api.getCurrentUser();
            setUser(userResponse.user);
          } else {
            // No valid refresh token
            setUser(null);
          }
        } catch (refreshError) {
          console.log('No valid session found');
          setUser(null);
        }
      } else {
        // We have a token, try to get user
        try {
          const userResponse = await api.getCurrentUser();
          setUser(userResponse.user);
        } catch (err) {
          // Token invalid, clear it
          api.clearAccessToken();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login function
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} role - 'student' or 'instructor'
   */
  const login = useCallback(
    async (email, password, role = 'student') => {
      try {
        setLoading(true);
        setError(null);

        // Call login API based on role
        const endpoint = role === 'instructor' ? 'instructor' : 'student';
        const response = await api.api.post(`/${endpoint}/login`, {
          email,
          password,
        });

        // Save access token to memory
        if (response.data.accessToken) {
          api.setAccessToken(response.data.accessToken);
        }

        // Save user info
        setUser(response.data.user);

        // Redirect based on role
        if (role === 'instructor') {
          navigate('/instructor/dashboard');
        } else {
          navigate('/student/assignments');
        }

        return { success: true, user: response.data.user };
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || 'Login failed';
        setError(errorMessage);
        console.error('Login error:', err);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  /**
   * Register function (students only)
   * @param {string} name - Full name
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {object} additionalData - studentId, department, etc.
   */
  const register = useCallback(
    async (name, email, password, additionalData = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.api.post('/student/register', {
          name,
          email,
          password,
          ...additionalData,
        });

        // Save access token to memory
        if (response.data.accessToken) {
          api.setAccessToken(response.data.accessToken);
        }

        // Save user info
        setUser(response.data.user);

        // Redirect to student dashboard
        navigate('/student/assignments');

        return { success: true, user: response.data.user };
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || 'Registration failed';
        setError(errorMessage);
        console.error('Registration error:', err);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  /**
   * Logout function
   * Clears access token and refresh cookie
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Call logout API to clear refresh token cookie
      await api.logout();

      // Clear access token from memory
      api.clearAccessToken();

      // Clear user state
      setUser(null);

      // Redirect to login
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Clear local state anyway
      api.clearAccessToken();
      setUser(null);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  /**
   * Refresh access token manually
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookie
      });

      if (response.ok) {
        const data = await response.json();
        api.setAccessToken(data.accessToken);
        return { success: true, accessToken: data.accessToken };
      } else {
        // Refresh failed, logout
        await logout();
        return { success: false };
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      await logout();
      return { success: false };
    }
  }, [logout]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = user !== null;

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback(
    role => {
      return user?.role === role;
    },
    [user]
  );

  /**
   * Check if user is student
   */
  const isStudent = hasRole('student');

  /**
   * Check if user is instructor
   */
  const isInstructor = hasRole('instructor');

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated,
    isStudent,
    isInstructor,

    // Methods
    login,
    register,
    logout,
    refreshToken,
    hasRole,
  };
};

export default useAuth;
