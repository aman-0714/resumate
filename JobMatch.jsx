import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI, jobMatchAPI } from './src/api.js';

const ScoreRing = ({ score, size = 100 }) => {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const offset = circ - (pct / 100) * circ;
  const color =
    pct >= 80 ? '#22c55e' :
    pct >= 60 ? '#eab308' :
    pct >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: size * 0.22, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
      >
        {pct}%
      </text>
    </svg>
  );
};

const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    green:  'bg-green-500/15 text-green-400 border border-green-500/30',
    red:    'bg-red-500/15 text-red-400 border border-red-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    slate:  'bg-slate-800 text-slate-300 border border-slate-700',
  };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const JobMatch = () => {
  const navigate = useNavigate();
  const [resumes, setResumes]         = useState([]);
  const [selectedId, setSelectedId]   = useState('');
  const [resumeText, setResumeText]   = useState('');
  const [useText, setUseText]         = useState(false);
  const [jobDesc, setJobDesc]         = useState('');
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [error, setError]             = useState('');

  // Load user's uploaded resumes for the dropdown
  useEffect(() => {
    resumeAPI.getAll()
      .then(({ data }) => setResumes(data.resumes || []))
      .catch(() => setResumes([]))
      .finally(() => setLoadingResumes(false));
  }, []);

  const handleMatch = async () => {
    if (!jobDesc.trim()) { setError('Please paste a job description.'); return; }
    if (!useText && !selectedId) { setError('Please select a resume or paste resume text.'); return; }
    if (useText && !resumeText.trim()) { setError('Please paste your resume text.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = useText
        ? { resumeText, jobDescription: jobDesc }
        : { resumeId: selectedId, jobDescription: jobDesc };

      const { data } = await jobMatchAPI.match(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Matching failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-white font-medium">Job Match</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white">🎯 Job Role Matching</h1>
          <p className="text-slate-400 mt-1">
            Paste a job description and see exactly how well your resume matches — keyword by keyword.
          </p>
        </div>

        {/* Input card */}
        <div className="card mb-6">

          {/* Resume source toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setUseText(false)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !useText ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              📄 My Uploaded Resumes
            </button>
            <button
              onClick={() => setUseText(true)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                useText ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              ✏️ Paste Resume Text
            </button>
          </div>

          {/* Resume selector OR text area */}
          {!useText ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Resume
              </label>
              {loadingResumes ? (
                <div className="text-slate-500 text-sm">Loading resumes...</div>
              ) : resumes.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-slate-400 text-sm">
                  No resumes uploaded yet.{' '}
                  <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">
                    Upload one first →
                  </button>
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Select a resume --</option>
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>{r.fileName}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Paste Resume Text
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={8}
                placeholder="Paste your resume text here..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 text-sm resize-y font-mono"
              />
            </div>
          )}

          {/* Job description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Job Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here — the more detail, the better the match analysis..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 text-sm resize-y"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {jobDesc.trim().split(/\s+/).filter(Boolean).length} words pasted
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleMatch}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Analyzing Match...
              </>
            ) : (
              '🎯 Analyze Match'
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Score header */}
            <div className="card flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <ScoreRing score={Math.round((result.matchScore ?? result.score ?? 0) * 100) > 100
                  ? Math.round(result.matchScore ?? result.score ?? 0)
                  : Math.round((result.matchScore ?? result.score ?? 0) * 100) || Math.round(result.matchScore ?? result.score ?? 0)} size={120} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {result.verdict || (
                    (result.matchScore ?? result.score ?? 0) >= 0.7 ? '✅ Strong Match' :
                    (result.matchScore ?? result.score ?? 0) >= 0.4 ? '⚡ Moderate Match' :
                    '❌ Weak Match'
                  )}
                </h2>
                {result.summary && (
                  <p className="text-slate-400 text-sm leading-relaxed">{result.summary}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                  {result.matchedKeywords?.length != null && (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      ✓ {result.matchedKeywords.length} keywords matched
                    </span>
                  )}
                  {result.missingKeywords?.length != null && (
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      ✗ {result.missingKeywords.length} keywords missing
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Matched keywords */}
            {result.matchedKeywords?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  ✅ Matched Keywords
                  <span className="text-xs text-slate-500 font-normal ml-1">({result.matchedKeywords.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.matchedKeywords.map((k) => (
                    <Badge key={k} color="green">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {result.missingKeywords?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  ❌ Missing Keywords
                  <span className="text-xs text-slate-500 font-normal ml-1">Add these to improve your match</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((k) => (
                    <Badge key={k} color="red">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3">💡 Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-brand-400 shrink-0">{i + 1}.</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA to rewrite */}
            {selectedId && (
              <div className="card border-brand-500/20 bg-brand-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white mb-1">✨ Improve Your Resume with AI</div>
                  <p className="text-slate-400 text-sm">
                    Automatically rewrite your resume to better match this job description.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/rewrite/${selectedId}`)}
                  className="btn-primary whitespace-nowrap shrink-0"
                >
                  AI Rewriter →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobMatch;
