import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  apiUploadResume, apiGetMyResumes, apiAnalyzeResume,
  apiGetCareerGuidance, apiGetJobRoles, apiJobMatch, apiDeleteResume,
} from './src/api';

export default function App() {
  const { user, login, signup, logout } = useAuth();

  // Auth form state
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMsg, setAuthMsg] = useState('');

  // App state
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [jobRoles, setJobRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [career, setCareer] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [jobMatch, setJobMatch] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      apiGetMyResumes().then((r) => r.success && setResumes(r.resumes));
      apiGetJobRoles().then((r) => r.success && setJobRoles(r.roles));
    }
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    const res = authMode === 'login'
      ? await login(authForm.email, authForm.password)
      : await signup(authForm.name, authForm.email, authForm.password);
    if (!res.success) setAuthMsg(res.message);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('resume', file);
    const res = await apiUploadResume(fd);
    setUploading(false);
    if (res.success) {
      setMsg('✅ Resume uploaded!');
      const updated = await apiGetMyResumes();
      if (updated.success) setResumes(updated.resumes);
    } else {
      setMsg('❌ ' + res.message);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResume) return setMsg('Select a resume first.');
    setAnalyzing(true);
    setAnalysis(null);
    setCareer(null);
    setJobMatch(null);
    const res = await apiAnalyzeResume(selectedResume._id, selectedRole);
    setAnalyzing(false);
    if (res.success) setAnalysis(res.analysis);
    else setMsg('❌ ' + res.message);
  };

  const handleCareer = async () => {
    if (!selectedResume) return;
    const res = await apiGetCareerGuidance(selectedResume._id);
    if (res.success) setCareer(res.guidance);
  };

  const handleJobMatch = async () => {
    if (!selectedResume || !jobDesc.trim()) return setMsg('Select resume and paste a job description.');
    const res = await apiJobMatch({ resumeId: selectedResume._id, jobDescription: jobDesc });
    if (res.success) setJobMatch(res);
    else setMsg('❌ ' + res.message);
  };

  const handleDelete = async (id) => {
    await apiDeleteResume(id);
    setResumes((r) => r.filter((x) => x._id !== id));
    if (selectedResume?._id === id) setSelectedResume(null);
  };

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.authCard}>
          <h1 style={styles.brand}>⬡ Resumate</h1>
          <p style={styles.tagline}>AI-Powered Resume Optimizer</p>
          <div style={styles.tabs}>
            {['login', 'signup'].map((m) => (
              <button key={m} style={authMode === m ? styles.activeTab : styles.tab}
                onClick={() => setAuthMode(m)}>
                {m === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>
          <form onSubmit={handleAuth} style={styles.form}>
            {authMode === 'signup' && (
              <input style={styles.input} placeholder="Full Name" value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
            )}
            <input style={styles.input} placeholder="Email" type="email" value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input style={styles.input} placeholder="Password" type="password" value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            {authMsg && <p style={styles.error}>{authMsg}</p>}
            <button style={styles.btn} type="submit">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.brand}>⬡ Resumate</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#aaa' }}>Hi, {user.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div style={styles.main}>
        {/* LEFT PANEL */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle}>📄 My Resumes</h3>
          <label style={styles.uploadBtn}>
            {uploading ? 'Uploading…' : '+ Upload Resume (PDF/DOC)'}
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} hidden />
          </label>
          {resumes.length === 0 && <p style={styles.muted}>No resumes yet. Upload one above.</p>}
          {resumes.map((r) => (
            <div key={r._id} style={selectedResume?._id === r._id ? styles.resumeCardActive : styles.resumeCard}
              onClick={() => { setSelectedResume(r); setAnalysis(null); setCareer(null); setJobMatch(null); }}>
              <span>📄 {r.fileName}</span>
              <button style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}>✕</button>
            </div>
          ))}

          {selectedResume && (
            <>
              <h3 style={styles.sectionTitle}>🎯 Target Role</h3>
              <select style={styles.select} value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="">-- Select Job Role --</option>
                {jobRoles.map((r) => (
                  <option key={r.key} value={r.key}>{r.title}</option>
                ))}
              </select>
              <button style={styles.analyzeBtn} onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? 'Analyzing…' : '🔍 Analyze Resume'}
              </button>
              {analysis && (
                <button style={{ ...styles.analyzeBtn, background: '#6c47ff', marginTop: 8 }} onClick={handleCareer}>
                  🚀 Get Career Guidance
                </button>
              )}
            </>
          )}

          {msg && <p style={styles.msg}>{msg}</p>}
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.content}>
          {!selectedResume && (
            <div style={styles.empty}>
              <p style={{ fontSize: 48 }}>📋</p>
              <p>Upload and select a resume to get started</p>
            </div>
          )}

          {analysis && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📊 Analysis Results</h2>
              <div style={styles.scoreRow}>
                {[
                  ['Overall', analysis.overallScore],
                  ['ATS', analysis.atsScore],
                  ['Keywords', analysis.keywordScore],
                  ['Structure', analysis.structureScore],
                  ['Skills', analysis.skillsScore],
                ].map(([label, score]) => (
                  <div key={label} style={styles.scoreBox}>
                    <div style={styles.scoreNum(score)}>{score}</div>
                    <div style={styles.scoreLabel}>{label}</div>
                  </div>
                ))}
              </div>
              {analysis.detailedFeedback && (
                <p style={styles.feedback}>{analysis.detailedFeedback}</p>
              )}
              {analysis.strengths?.length > 0 && (
                <><h4 style={styles.subTitle}>✅ Strengths</h4>
                  <ul>{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>
              )}
              {analysis.suggestions?.length > 0 && (
                <><h4 style={styles.subTitle}>💡 Suggestions</h4>
                  <ul>{analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></>
              )}
              {analysis.missingKeywords?.length > 0 && (
                <><h4 style={styles.subTitle}>🔍 Missing Keywords</h4>
                  <div style={styles.tags}>
                    {analysis.missingKeywords.map((k, i) => (
                      <span key={i} style={styles.tag}>{k}</span>
                    ))}
                  </div></>
              )}

              {/* Job Match Section */}
              <h3 style={styles.cardTitle}>🔗 Job Description Match</h3>
              <textarea style={styles.textarea} rows={5} placeholder="Paste the job description here…"
                value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
              <button style={styles.analyzeBtn} onClick={handleJobMatch}>Match Now</button>
              {jobMatch && (
                <div style={styles.matchBox}>
                  <p><strong>Match Score:</strong> {jobMatch.score}%</p>
                  <p><strong>Matched Keywords:</strong> {jobMatch.matchedKeywords?.join(', ')}</p>
                  <p><strong>Missing Keywords:</strong> {jobMatch.missingKeywords?.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {career && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🚀 Career Guidance</h2>
              <h4 style={styles.subTitle}>📚 Recommended Courses</h4>
              <ul>
                {career.recommendedCourses?.map((c, i) => (
                  <li key={i}><a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> — {c.platform}</li>
                ))}
              </ul>
              <h4 style={styles.subTitle}>🛠️ Skills to Learn</h4>
              <div style={styles.tags}>
                {career.skillsToLearn?.map((s, i) => <span key={i} style={styles.tag}>{s}</span>)}
              </div>
              <h4 style={styles.subTitle}>💼 Career Paths</h4>
              <ul>{career.careerPaths?.map((p, i) => <li key={i}>{p}</li>)}</ul>
              <h4 style={styles.subTitle}>🔨 Project Ideas</h4>
              <ul>{career.recommendedProjects?.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #222', background: '#111' },
  brand: { color: '#fff', margin: 0, fontSize: 22, fontWeight: 700 },
  tagline: { color: '#888', fontSize: 13, margin: 0 },
  main: { display: 'flex', height: 'calc(100vh - 65px)' },
  panel: { width: 280, borderRight: '1px solid #222', padding: 20, overflowY: 'auto', background: '#111' },
  content: { flex: 1, padding: 28, overflowY: 'auto' },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', color: '#888', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  uploadBtn: { display: 'block', background: '#1a1a1a', border: '1px dashed #444', color: '#aaa', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 13, marginBottom: 12 },
  resumeCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: '1px solid #2a2a2a', fontSize: 13 },
  resumeCardActive: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1e2a3a', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: '1px solid #4a9eff', fontSize: 13 },
  deleteBtn: { background: 'none', border: 'none', color: '#f66', cursor: 'pointer', fontSize: 14 },
  select: { width: '100%', background: '#1a1a1a', color: '#ddd', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 10 },
  analyzeBtn: { width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  logoutBtn: { background: '#1a1a1a', color: '#aaa', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  muted: { color: '#555', fontSize: 13 },
  msg: { marginTop: 10, fontSize: 13, color: '#aaa' },
  empty: { textAlign: 'center', color: '#555', marginTop: 80, fontSize: 16 },
  card: { background: '#111', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#fff' },
  subTitle: { color: '#aaa', fontSize: 14, marginTop: 16, marginBottom: 6 },
  scoreRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  scoreBox: { textAlign: 'center', background: '#1a1a1a', borderRadius: 10, padding: '12px 16px', minWidth: 70 },
  scoreNum: (s) => ({ fontSize: 28, fontWeight: 800, color: s >= 70 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }),
  scoreLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  feedback: { background: '#1a1a1a', borderRadius: 8, padding: 14, fontSize: 14, lineHeight: 1.6, color: '#ccc', marginBottom: 12 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: { background: '#1e2a3a', color: '#60a5fa', padding: '4px 10px', borderRadius: 20, fontSize: 12 },
  textarea: { width: '100%', background: '#1a1a1a', color: '#ddd', border: '1px solid #333', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10, resize: 'vertical', boxSizing: 'border-box' },
  matchBox: { background: '#1a1a1a', borderRadius: 8, padding: 14, fontSize: 13, marginTop: 10 },
  authCard: { maxWidth: 400, margin: '80px auto', background: '#111', border: '1px solid #222', borderRadius: 16, padding: 36 },
  tabs: { display: 'flex', marginBottom: 20, borderBottom: '1px solid #222' },
  tab: { flex: 1, padding: '10px', background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: 14 },
  activeTab: { flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: '2px solid #3b82f6', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { background: '#1a1a1a', border: '1px solid #333', color: '#ddd', borderRadius: 8, padding: '10px 14px', fontSize: 14 },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  error: { color: '#f87171', fontSize: 13 },
};