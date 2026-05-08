// src/api.js — Single source of truth for all API calls
const BASE_URL = 'https://resumate-ns85.onrender.com';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

// ── Auth ──────────────────────────────────────────────
export const apiSignup = (data) =>
  fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const apiLogin = (data) =>
  fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const apiGetMe = () =>
  fetch(`${BASE_URL}/api/auth/me`, { headers: getAuthHeaders() }).then((r) => r.json());

// ── Resume ────────────────────────────────────────────
export const apiUploadResume = (formData) =>
  fetch(`${BASE_URL}/api/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    body: formData,
  }).then((r) => r.json());

export const apiGetMyResumes = () =>
  fetch(`${BASE_URL}/api/resume/my-resumes`, { headers: getAuthHeaders() }).then((r) => r.json());

export const apiDeleteResume = (id) =>
  fetch(`${BASE_URL}/api/resume/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  }).then((r) => r.json());

// ── Analyze ───────────────────────────────────────────
export const apiAnalyzeResume = (resumeId, jobRole) =>
  fetch(`${BASE_URL}/api/analyze/${resumeId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jobRole }),
  }).then((r) => r.json());

export const apiGetJobRoles = () =>
  fetch(`${BASE_URL}/api/analyze/job-roles`).then((r) => r.json());

// ── Career ────────────────────────────────────────────
export const apiGetCareerGuidance = (resumeId) =>
  fetch(`${BASE_URL}/api/career/${resumeId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then((r) => r.json());

// ── Job Match ─────────────────────────────────────────
export const apiJobMatch = (payload) =>
  fetch(`${BASE_URL}/api/job-match`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  }).then((r) => r.json());

// ── ML / Skill Gap ────────────────────────────────────
export const apiSkillGap = (resumeText, targetRole = 'software_engineer') =>
  fetch(`${BASE_URL}/api/ml/skill-gap`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ resumeText, targetRole }),
  }).then((r) => r.json());

export const apiMLStatus = () =>
  fetch(`${BASE_URL}/api/ml/status`).then((r) => r.json());

// ── Named-export object aliases (for pages that use resumeAPI.getAll() style) ─
export const resumeAPI = {
  getAll:     apiGetMyResumes,
  deleteById: apiDeleteResume,
  upload:     apiUploadResume,
};

export { BASE_URL };
