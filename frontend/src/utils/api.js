import axios from 'axios';

// Base URL từ environment variable hoặc default localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Tạo Axios instance
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 60000, // 60 giây cho AI generation (o4-mini reasoning models chậm hơn)
  withCredentials: true, // CRITICAL: Gửi httpOnly cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store access token in sessionStorage (per-tab isolation)
// Note: sessionStorage is cleared when tab closes, localStorage persists
const TOKEN_KEY = 'access_token';

/**
 * Set access token (called after login/refresh)
 */
export const setAccessToken = token => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

/**
 * Get current access token
 */
export const getAccessToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};

/**
 * Clear access token (logout)
 */
export const clearAccessToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
};

/**
 * Request interceptor - Attach access token to every request
 */
api.interceptors.request.use(
  config => {
    // Nếu có access token, thêm vào Authorization header
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle 401 và auto refresh token
 */
api.interceptors.response.use(
  response => {
    // Response thành công, trả về data
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // Nếu lỗi 401 (Unauthorized) và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Gọi /auth/refresh để lấy access token mới
        // httpOnly cookie (refresh token) sẽ tự động gửi qua withCredentials
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Lưu access token mới
        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);

        // Retry request gốc với token mới
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token cũng fail (hết hạn hoặc invalid)
        // Redirect về login
        console.error('Refresh token failed:', refreshError);
        clearAccessToken();

        // Redirect về login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?session=expired';
        }

        return Promise.reject(refreshError);
      }
    }

    // Lỗi khác (không phải 401) hoặc đã retry rồi
    return Promise.reject(error);
  }
);

/**
 * API Methods
 */

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Auth endpoints
export const login = async (email, password, role = 'student') => {
  const response = await api.post(`/auth/${role}/login`, { email, password });
  // Lưu access token vào memory
  if (response.data.accessToken) {
    setAccessToken(response.data.accessToken);
  }
  return response.data;
};

export const register = async (name, email, password, role = 'student') => {
  const response = await api.post(`/auth/${role}/register`, { name, email, password });
  if (response.data.accessToken) {
    setAccessToken(response.data.accessToken);
  }
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
};

export const getCurrentUser = async () => {
  const response = await api.get('/me');
  return response.data;
};

// Assignment endpoints
export const getAssignments = async () => {
  const response = await api.get('/assignment/list');
  return response.data;
};

export const getAssignment = async id => {
  const response = await api.get(`/assignment/${id}`);
  return response.data;
};

export const createAssignment = async data => {
  const response = await api.post('/assignment', data);
  return response.data;
};

export const generateAssignmentFromDocument = async formData => {
  const response = await api.post('/assignment/generate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Submission endpoints
export const startSubmission = async assignmentId => {
  const response = await api.post('/submission/start', { assignmentId });
  return response.data;
};

export const getSubmission = async id => {
  const response = await api.get(`/submission/${id}`);
  return response.data;
};

export const updateSubmission = async (id, answers) => {
  const response = await api.put(`/submission/${id}`, { answers });
  return response.data;
};

export const submitAssignment = async id => {
  const response = await api.post(`/submission/${id}/submit`);
  return response.data;
};

// AI Chat endpoints
export const sendAIMessage = async (prompt, submissionId, questionId, context) => {
  const response = await api.post('/ai/chat', {
    prompt,
    submissionId,
    questionId,
    context,
  });
  return response.data;
};

export const getAIStats = async submissionId => {
  const response = await api.get(`/ai/stats?submissionId=${submissionId}`);
  return response.data;
};

// Analytics endpoints
export const getSubmissionLogs = async submissionId => {
  const response = await api.get(`/logs/submission/${submissionId}`);
  return response.data;
};

export const getStudentLogs = async (studentId, assignmentId = null, limit = 100) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (assignmentId) params.append('assignmentId', assignmentId);

  const response = await api.get(`/logs/student/${studentId}?${params.toString()}`);
  return response.data;
};

export const getAssignmentAnalytics = async assignmentId => {
  const response = await api.get(`/analytics/assignment/${assignmentId}`);
  return response.data;
};

export const getStudentAnalytics = async studentId => {
  const response = await api.get(`/analytics/student/${studentId}`);
  return response.data;
};

// Instructor endpoints
export const getAllSubmissionsForInstructor = async () => {
  const response = await api.get('/submission/instructor/all');
  return response.data;
};

export const gradeEssaySubmission = async (submissionId, grading) => {
  const response = await api.post(`/submission/${submissionId}/grade`, grading);
  return response.data;
};

export default api;
