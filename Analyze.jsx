import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resumeAPI, analyzeAPI } from './src/api.js';
import ScoreGauge from './ScoreGauge.jsx';

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
];

const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    green:  'bg-green-500/15 text-green-400 border border-green-500/30',
    red:    'bg-red-500/15 text-red-400 border border-red-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    slate:  'bg-slate-800 text-slate-300 border border-slate-700',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const Section = ({ title, icon, children }) => (
  <div className="card mb-4">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <span>{icon}</span> {title}
    </h3>
    {children}
  </div>
);

const Analyze = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();

  const [resume, setResume]       = useState(null);
  const [jobRole, setJobRole]     = useState('');
  const [analysis, setAnalysis]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await resumeAPI.getById(resumeId);
        setResume(data.resume);
        if (data.resume?.analysis?.overallScore > 0) {
          setAnalysis(data.resume.analysis);
          setJobRole(data.resume.analysis.selectedJobRole || '');
        }
      } catch {
        setError('Failed to load resume.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resumeId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const { data } = await analyzeAPI.analyze(resumeId, { jobRole });
      setAnalysis(data.analysis);
      setJobRole(data.analysis.selectedJobRole || jobRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

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

  const a = analysis;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-white font-medium truncate">{resume?.fileName}</span>
        </div>

        {/* Job Role + Trigger */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Analyze Resume</h2>
          <p className="text-slate-400 text-sm mb-4">
            Select a target job role for precise keyword matching, or leave blank for auto-detection.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
            >
              <option value="">Auto-detect job role</option>
              {JOB_ROLES.map(r => (
                <option key={r.key} value={r.key}>{r.title}</option>
              ))}
            </select>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary whitespace-nowrap"
            >
              {analyzing ? '⏳ Analyzing...' : a ? '🔄 Re-Analyze' : '🚀 Analyze Now'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          {analyzing && (
            <p className="text-slate-400 text-sm mt-3 animate-pulse">
              Running analysis — this takes a few seconds...
            </p>
          )}
        </div>

        {/* ─── Results ─── */}
        {a && (
          <>
            {/* Score Overview */}
            <div className="card mb-4">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreGauge score={a.overallScore ?? a.score ?? 0} label="Overall Score" size={140} />
                <div className="flex-1 w-full">
                  {a.summary && <p className="text-slate-300 text-sm mb-4">{a.summary}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'ATS Score',     value: a.ats?.score,                  unit: '/10' },
                      { label: 'Keywords',      value: a.keywords?.score,             unit: '/10' },
                      { label: 'Grammar',       value: a.grammar?.score,              unit: '/10' },
                      { label: 'Word Count',    value: a.metrics?.wordCount,          unit: '' },
                      { label: 'Bullet Points', value: a.formatting?.totalBulletPoints, unit: '' },
                      { label: 'Keyword Match', value: a.keywords?.matchPercentage,   unit: '%' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-brand-400">{value ?? 0}{unit}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                  {a.selectedJobRole && (
                    <p className="text-slate-500 text-xs mt-3">
                      Analyzed for: <span className="text-slate-300">{a.selectedJobRole}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ATS */}
            {(a.ats?.issues?.length > 0 || a.ats?.verdict) && (
              <Section title="ATS Compatibility" icon="🤖">
                {a.ats.verdict && (
                  <p className="text-sm text-slate-300 mb-3">
                    Verdict: <span className="text-white font-medium">{a.ats.verdict}</span>
                  </p>
                )}
                {a.ats.issues?.length > 0 && (
                  <ul className="space-y-1">
                    {a.ats.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-300 flex gap-2"><span>⚠️</span>{issue}</li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {/* Sections */}
            {a.sections && Object.keys(a.sections).length > 0 && (
              <Section title="Resume Sections Detected" icon="📋">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(a.sections).map(([key, present]) => (
                    <Badge key={key} color={present ? 'green' : 'red'}>
                      {present ? '✓' : '✗'} {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Keywords */}
            {a.keywords && (
              <Section title="Keyword Analysis" icon="🔑">
                {a.keywords.matched?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Matched ({a.keywords.matched.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.keywords.matched.map(k => <Badge key={k} color="green">{k}</Badge>)}
                    </div>
                  </div>
                )}
                {a.keywords.missing?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Missing ({a.keywords.missing.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.keywords.missing.map(k => <Badge key={k} color="red">{k}</Badge>)}
                    </div>
                  </div>
                )}
                {a.keywords.relatedMatches?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Related Matches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.keywords.relatedMatches.map(k => <Badge key={k} color="yellow">{k}</Badge>)}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Strengths & Weaknesses */}
            {(a.strengths?.length > 0 || a.weaknesses?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {a.strengths?.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-3">💪 Strengths</h3>
                    <ul className="space-y-1.5">
                      {a.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-300 flex gap-2"><span>✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.weaknesses?.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-3">⚠️ Weaknesses</h3>
                    <ul className="space-y-1.5">
                      {a.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-red-300 flex gap-2"><span>✗</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {a.suggestions?.length > 0 && (
              <Section title="Suggestions to Improve" icon="💡">
                <ul className="space-y-2">
                  {a.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-brand-400 shrink-0">{i + 1}.</span> {s}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Missing Skills */}
            {a.missingSkills?.length > 0 && (
              <Section title="Skills to Add" icon="🎯">
                <div className="flex flex-wrap gap-2">
                  {a.missingSkills.map(s => <Badge key={s} color="blue">{s}</Badge>)}
                </div>
              </Section>
            )}

            {/* Action Verbs */}
            {a.actionVerbs?.used?.length > 0 && (
              <Section title="Action Verbs" icon="⚡">
                <div className="mb-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    Used ({a.actionVerbs.count})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.actionVerbs.used.slice(0, 20).map(v => <Badge key={v} color="green">{v}</Badge>)}
                  </div>
                </div>
                {a.actionVerbs.weakVerbs?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Weak Verbs to Replace</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.actionVerbs.weakVerbs.map(v => <Badge key={v} color="yellow">{v}</Badge>)}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Issues */}
            {a.issues?.length > 0 && (
              <Section title="Issues Found" icon="🐛">
                <ul className="space-y-1">
                  {a.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-300 flex gap-2"><span>•</span>{issue}</li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Analyze;
