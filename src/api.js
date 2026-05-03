import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — log user out if token expired
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
  getMe:  ()     => api.get('/auth/me'),
};

// ─── Resume ───────────────────────────────────────────────────────────────────
export const resumeAPI = {
  upload:      (formData) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll:      ()   => api.get('/resume/my-resumes'),
  getById:     (id) => api.get(`/resume/${id}`),
  deleteById:  (id) => api.delete(`/resume/${id}`),
  autoFix:     (id) => api.post(`/resume/${id}/auto-fix`),
};

// ─── Analysis ─────────────────────────────────────────────────────────────────
export const analyzeAPI = {
  analyze:      (resumeId, data) => api.post(`/analyze/${resumeId}`, data),
  getJobRoles:  ()               => api.get('/analyze/job-roles'),
};

// ─── Resume Rewriter ──────────────────────────────────────────────────────────
export const rewriteAPI = {
  rewrite: (resumeId, data) => api.post(`/rewrite/${resumeId}`, data),
};

// ─── Career ───────────────────────────────────────────────────────────────────
export const careerAPI = {
  getGuidance: (resumeId, data) => api.post(`/career/${resumeId}`, data),
};

// ─── Job Match ────────────────────────────────────────────────────────────────
export const jobMatchAPI = {
  match:           (data) => api.post('/job-match', data),
  extractKeywords: (data) => api.post('/job-match/keywords', data),
};

export default api;
