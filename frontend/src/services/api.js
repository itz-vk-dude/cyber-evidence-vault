import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle session expiration (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url?.includes('/api/auth/login') ||
                          error.config.url?.includes('/api/auth/verify-otp') ||
                          error.config.url?.includes('/api/auth/enable-otp');
      if (!isAuthRoute) {
        localStorage.removeItem('vault_token');
        localStorage.removeItem('vault_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (username, email, password) => api.post('/api/auth/register', { username, email, password }),
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  resendOTP: (tempToken) => api.post('/api/auth/resend-otp', { temp_token: tempToken }),
  setupOTP: (tempToken) => api.get(`/api/auth/setup-otp?temp_token=${encodeURIComponent(tempToken)}`),
  enableOTP: (tempToken, secret, otpCode) => api.post('/api/auth/enable-otp', {
    temp_token: tempToken,
    secret,
    otp_code: otpCode,
  }),
  verifyOTP: (tempToken, otpCode) => api.post('/api/auth/verify-otp', {
    temp_token: tempToken,
    otp_code: otpCode,
  }),
  getMe: () => api.get('/api/auth/me'),
};

export const evidenceService = {
  list: () => api.get('/api/evidence'),
  get: (id) => api.get(`/api/evidence/${id}`),
  verifyIntegrity: (id) => api.get(`/api/evidence/${id}/verify`),
  download: (id) => api.get(`/api/evidence/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/api/evidence/${id}`),
  upload: (formData, onUploadProgress) => api.post('/api/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
};

export default api;
