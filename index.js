// src/api/index.js  — centralised API service
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
  getMe:  ()     => api.get('/auth/me'),
}

// ─── Resume ────────────────────────────────────────────────────────────────────
export const resumeAPI = {
  upload:      (formData) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll:      ()   => api.get('/resume/my-resumes'),
  getById:     (id) => api.get(`/resume/${id}`),
  deleteById:  (id) => api.delete(`/resume/${id}`),
}

// ─── Analyze ───────────────────────────────────────────────────────────────────
export const analyzeAPI = {
  analyze:      (resumeId, jobRole) => api.post(`/analyze/${resumeId}`, { jobRole }),
  getJobRoles:  ()                  => api.get('/analyze/job-roles'),
}

// ─── Career ────────────────────────────────────────────────────────────────────
export const careerAPI = {
  getGuidance: (resumeId, jobRole) => api.post(`/career/${resumeId}`, { jobRole }),
}

export default api