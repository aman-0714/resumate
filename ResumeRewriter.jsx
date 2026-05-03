import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resumeAPI, rewriteAPI } from './src/api.js';

const JOB_ROLES = [
  { key: 'SOFTWARE-ENGINEERING',   title: 'Software Engineering' },
  { key: 'ELECTRICAL-ENGINEERING', title: 'Electrical Engineering' },
  { key: 'DATA-SCIENCE',           title: 'Data Science / ML' },
  { key: 'INFORMATION-TECHNOLOGY', title: 'Information Technology' },
  { key: 'ENGINEERING',            title: 'Engineering' },
  { key: 'FINANCE',                title: 'Finance' },
  { key: 'ACCOUNTANT',             title: 'Accounting' },
  { key: 'HR',                     title: 'Human Resources' },
  { key: 'HEALTHCARE',             title: 'Healthcare' },
  { key: 'DIGITAL-MEDIA',          title: 'Digital Media' },
  { key: 'MARKETING',              title: 'Marketing' },
  { key: 'DESIGN',                 title: 'Design / UX' },
  { key: 'MANAGEMENT',             title: 'Management' },
  { key: 'SALES',                  title: 'Sales' },
  { key: 'BANKING',                title: 'Banking' },
  { key: 'CONSULTANT',             title: 'Consulting' },
  { key: 'DESIGNER',               title: 'UI/UX Design' },
  { key: 'TEACHER',                title: 'Teaching / Education' },
  { key: 'BUSINESS-DEVELOPMENT',   title: 'Business Development' },
  { key: 'PUBLIC-RELATIONS',       title: 'Public Relations' },
  { key: 'ADVOCATE',               title: 'Legal / Advocate' },
];

// Diff highlighter — marks lines that changed between original and rewritten
const DiffView = ({ original, rewritten }) => {
  const origLines = original.split('\n');
  const newLines  = rewritten.split('\n');
  const maxLen    = Math.max(origLines.length, newLines.length);

  return (
    <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {Array.from({ length: maxLen }).map((_, i) => {
        const o = origLines[i] ?? '';
        const n = newLines[i] ?? '';
        const changed = o.trim() !== n.trim() && n.trim() !== '';
        const added   = !o.trim() && n.trim();
        return (
          <div
            key={i}
            className={`px-2 py-0.5 rounded ${
              added   ? 'bg-blue-500/10 text-blue-300' :
              changed ? 'bg-green-500/10 text-green-300' :
              'text-slate-400'
            }`}
          >
            {n || ' '}
          </div>
        );
      })}
    </div>
  );
};

const ResumeRewriter = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();

  const [resume,        setResume]        = useState(null);
  const [jobRole,       setJobRole]       = useState('');
  const [loading,       setLoading]       = useState(true);
  const [rewriting,     setRewriting]     = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState('');
  const [view,          setView]          = useState('split'); // 'split' | 'rewritten' | 'diff'
  const [copied,        setCopied]        = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await resumeAPI.getById(resumeId);
        setResume(data.resume);
        // Pre-select job role from last analysis
        if (data.resume?.analysis?.selectedJobRole) {
          setJobRole(data.resume.analysis.selectedJobRole);
        }
      } catch {
        setError('Failed to load resume.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resumeId]);

  const handleRewrite = async () => {
    setRewriting(true);
    setError('');
    setResult(null);
    setDownloadError('');
    try {
      const { data } = await rewriteAPI.rewrite(resumeId, { jobRole });
      setResult(data);
      setView('split');
    } catch (err) {
      setError(err.response?.data?.message || 'Rewrite failed. Please try again.');
    } finally {
      setRewriting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.rewrittenText) return;
    await navigator.clipboard.writeText(result.rewrittenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── PDF download ─────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!result?.rewrittenText) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const response = await rewriteAPI.downloadPDF(resumeId, {
        rewrittenText: result.rewrittenText,
        fileName: resume?.fileName,
      });

      // response.data is a Blob (responseType: 'blob' set in api.js)
      const blob     = new Blob([response.data], { type: 'application/pdf' });
      const url      = URL.createObjectURL(blob);
      const safeName = (resume?.fileName || 'resume').replace(/\.[^.]+$/, '');
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `${safeName}_optimized.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      setDownloadError('PDF generation failed. Make sure pdfkit is installed on the server (npm install pdfkit).');
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center text-slate-400">
      Loading resume...
    </div>
  );

  if (error && !resume) return (
    <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary">← Back to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <button
            onClick={() => navigate(`/analyze/${resumeId}`)}
            className="text-slate-400 hover:text-white transition-colors text-sm truncate"
          >
            {resume?.fileName}
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-white font-medium">AI Rewriter</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display text-white">✨ AI Resume Rewriter</h1>
          <p className="text-slate-400 mt-1">
            Instantly improve your resume with stronger action verbs, ATS keywords, and impact-driven bullet points.
          </p>
        </div>

        {/* Config card */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Job Role
              </label>
              <select
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
              >
                <option value="">Auto-detect from resume</option>
                {JOB_ROLES.map(r => (
                  <option key={r.key} value={r.key}>{r.title}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                Selecting a role targets ATS keywords specific to that field.
              </p>
            </div>
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="btn-primary whitespace-nowrap flex items-center gap-2 py-2.5"
            >
              {rewriting ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Rewriting...
                </>
              ) : (
                <>✨ {result ? 'Re-Optimize' : 'Optimize Resume'}</>
              )}
            </button>
          </div>

          {/* What it does */}
          {!result && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: '💪', label: 'Strong Action Verbs' },
                { icon: '🔑', label: 'ATS Keywords' },
                { icon: '📊', label: 'Impact Metrics' },
                { icon: '✂️', label: 'Concise Bullets' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl text-xs text-slate-400">
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {rewriting && (
            <div className="mt-4 flex items-center gap-3 text-slate-400 text-sm">
              <span className="animate-pulse">🤖 AI is rewriting your resume. This takes about 10–20 seconds...</span>
            </div>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Status bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  result.method === 'ai'
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                }`}>
                  {result.method === 'ai' ? '🤖 AI-Powered' : '⚙️ Rule-Based'}
                </span>
                <span className="text-slate-400 text-sm">
                  Optimized for <span className="text-white font-medium">{result.roleTitle}</span>
                </span>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                {[
                  { key: 'split',     label: 'Side by Side' },
                  { key: 'rewritten', label: 'Improved Only' },
                  { key: 'diff',      label: 'Diff View' },
                ].map(v => (
                  <button
                    key={v.key}
                    onClick={() => setView(v.key)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      view === v.key
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors border border-slate-700"
              >
                {copied ? '✅ Copied!' : '📋 Copy Text'}
              </button>

              {/* ── PDF Download button ── */}
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 text-sm transition-colors border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full" />
                    Generating PDF...
                  </>
                ) : (
                  <>⬇️ Download PDF</>
                )}
              </button>

              <button
                onClick={() => navigate(`/analyze/${resumeId}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-sm transition-colors border border-brand-500/30"
              >
                📊 Re-Analyze
              </button>
            </div>

            {/* PDF download error */}
            {downloadError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {downloadError}
              </div>
            )}

            {/* Text panels */}
            {view === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Original */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-400 text-sm uppercase tracking-wide">Original</h3>
                    <span className="text-xs text-slate-600">
                      {result.originalText.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-4 overflow-auto max-h-[600px]">
                    <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
                      {result.originalText}
                    </pre>
                  </div>
                </div>

                {/* Improved */}
                <div className="card border-green-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-green-400 text-sm uppercase tracking-wide">✨ Improved</h3>
                    <span className="text-xs text-slate-600">
                      {result.rewrittenText.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-4 overflow-auto max-h-[600px]">
                    <pre className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                      {result.rewrittenText}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {view === 'rewritten' && (
              <div className="card border-green-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-green-400 text-sm uppercase tracking-wide">✨ Improved Resume</h3>
                  <span className="text-xs text-slate-600">
                    {result.rewrittenText.split(/\s+/).length} words
                  </span>
                </div>
                <div className="bg-slate-950 rounded-xl p-6 overflow-auto max-h-[700px]">
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                    {result.rewrittenText}
                  </pre>
                </div>
              </div>
            )}

            {view === 'diff' && (
              <div className="card">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-semibold text-white text-sm uppercase tracking-wide">Diff View</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-green-500/30" />
                      <span className="text-slate-400">Changed</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-blue-500/30" />
                      <span className="text-slate-400">Added</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-slate-700" />
                      <span className="text-slate-400">Unchanged</span>
                    </span>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 overflow-auto max-h-[700px]">
                  <DiffView original={result.originalText} rewritten={result.rewrittenText} />
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-slate-600 mt-4 text-center">
              ⚠️ The AI improves wording only. Always review the output — facts, numbers, and dates are your responsibility.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResumeRewriter;
