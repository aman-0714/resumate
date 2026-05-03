import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resumeAPI } from './src/api.js';
import { useAuth } from './AuthContext.jsx';
import ScoreGauge from './ScoreGauge.jsx';

// Robustly extract score regardless of which field name the API uses
const getScore = (resume) => {
  const a = resume?.analysis;
  if (!a) return 0;
  const s = a.overallScore ?? a.score ?? a.overall ?? a.totalScore ?? a.finalScore ?? 0;
  return typeof s === 'number' ? Math.round(s) : 0;
};

// Animated count-up hook
const useCountUp = (target, duration = 1000) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return count;
};

const ScoreBar = ({ label, value, max = 100, colorOverride, delay = 0 }) => {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = colorOverride ||
    (pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500');

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="mb-3" ref={ref}>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-medium text-white">{value}{max !== 100 ? `/${max}` : ''}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: animated ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, suffix = '', icon, color }) => {
  const animated = useCountUp(value);
  const colorMap = {
    brand: 'from-brand-500/10 to-transparent border-brand-500/20',
    green: 'from-green-500/10 to-transparent border-green-500/20',
    yellow: 'from-yellow-500/10 to-transparent border-yellow-500/20',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
  };
  const textMap = {
    brand: 'text-brand-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
  };
  return (
    <div className={`card bg-gradient-to-br ${colorMap[color] || colorMap.brand} transition-all duration-200 hover:scale-[1.02]`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-bold font-display ${textMap[color] || textMap.brand}`}>
        {animated}{suffix}
      </div>
      <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const { data } = await resumeAPI.getAll();
        setResumes(data.resumes || []);
      } catch (err) {
        setError('Failed to load resumes. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    setDeletingId(id);
    try {
      await resumeAPI.deleteById(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
    } catch {
      alert('Failed to delete resume. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Computed stats (robustly uses getScore helper)
  const analyzed = resumes.filter(r => getScore(r) > 0);
  const avgScore = analyzed.length
    ? Math.round(analyzed.reduce((sum, r) => sum + getScore(r), 0) / analyzed.length)
    : 0;
  const bestScore = analyzed.length
    ? Math.max(...analyzed.map(r => getScore(r)))
    : 0;

  // Recent activity — last 3 resumes sorted by date
  const recentResumes = [...resumes]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const stats = [
    { label: 'Total Resumes', value: resumes.length, icon: '📄', color: 'brand' },
    { label: 'Analyzed',      value: analyzed.length, icon: '✅', color: 'green' },
    { label: 'Avg Score',     value: avgScore, suffix: '', icon: '📊', color: 'yellow' },
    { label: 'Best Score',    value: bestScore, suffix: '', icon: '🏆', color: 'blue' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-400 mt-1">Manage and analyze your resumes</p>
          </div>
          <Link to="/upload" className="btn-primary whitespace-nowrap flex items-center gap-2">
            <span>+</span> Upload Resume
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Score Overview + Recent Activity side by side */}
        {(analyzed.length > 0 || recentResumes.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Score Overview */}
            {analyzed.length > 0 && (
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-white">Score Overview</h2>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
                    {analyzed.length} resume{analyzed.length > 1 ? 's' : ''} analyzed
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <ScoreBar label="Average Score" value={avgScore} delay={100} />
                  <ScoreBar label="Best Score" value={bestScore} delay={200} />
                  <ScoreBar
                    label="Analyzed Rate"
                    value={resumes.length ? Math.round((analyzed.length / resumes.length) * 100) : 0}
                    delay={300}
                  />
                  <ScoreBar
                    label="Scores ≥ 70"
                    value={analyzed.filter(r => getScore(r) >= 70).length}
                    max={Math.max(analyzed.length, 1)}
                    delay={400}
                  />
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentResumes.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentResumes.map((r) => {
                    const score = getScore(r);
                    const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';
                    return (
                      <button
                        key={r._id}
                        onClick={() => navigate(`/analyze/${r._id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-lg shrink-0">📄</div>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium truncate group-hover:text-brand-400 transition-colors">
                              {r.fileName}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-bold shrink-0 ml-2 ${score > 0 ? scoreColor : 'text-slate-600'}`}>
                          {score > 0 ? score : '—'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {resumes.length > 3 && (
                  <p className="text-xs text-slate-600 text-center mt-3">
                    +{resumes.length - 3} more below
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '⬆️', label: 'Upload Resume', desc: 'Add a new resume to analyze', to: '/upload', primary: true },
            { icon: '🎯', label: 'Job Match', desc: 'Match your resume to a job listing', to: '/job-match' },
            { icon: '📈', label: 'Improve Score', desc: 'Get tips to boost your ATS score', to: analyzed[0] ? `/analyze/${analyzed[0]._id}` : '/upload' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className={`card flex items-start gap-3 hover:border-brand-500/40 transition-all duration-200 group ${a.primary ? 'border-brand-500/30 bg-brand-500/5' : ''}`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200 inline-block">{a.icon}</span>
              <div>
                <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">{a.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Resume List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Your Resumes</h2>
          {resumes.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
              {resumes.length} file{resumes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-800 rounded w-1/3 mb-6" />
                <div className="h-24 bg-slate-800 rounded mb-4" />
                <div className="h-9 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card text-center py-12 border-red-500/20">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
          </div>
        ) : resumes.length === 0 ? (
          <div className="card text-center py-20 border-dashed border-slate-700">
            <div className="text-6xl mb-5 animate-bounce">📄</div>
            <h3 className="text-2xl font-bold text-white mb-2">No resumes yet</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Upload your first resume to get an instant AI-powered analysis and ATS score.
            </p>
            <Link to="/upload" className="btn-primary inline-block text-lg px-8 py-3">
              Upload My Resume →
            </Link>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
              {['ATS Score', 'Keyword Match', 'Job Matching'].map(tip => (
                <div key={tip} className="p-3 rounded-xl bg-slate-800/50 text-xs text-slate-500">{tip}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume, i) => {
              const score = getScore(resume);
              const isAnalyzed = score > 0;
              return (
                <div
                  key={resume._id}
                  className="card hover:border-slate-600 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 flex flex-col group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-sm" title={resume.fileName}>
                        {resume.fileName}
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(resume.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase font-medium ml-2 shrink-0">
                      {resume.fileType || 'PDF'}
                    </span>
                  </div>

                  {/* Score display */}
                  {isAnalyzed ? (
                    <div className="flex justify-center py-2 mb-3">
                      <ScoreGauge score={score} label="Overall Score" size={110} />
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-800/40 rounded-xl py-8 text-center mb-3 border border-dashed border-slate-700 group-hover:border-brand-500/30 transition-colors">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="text-slate-500 text-sm">Not analyzed yet</p>
                      <p className="text-slate-600 text-xs mt-1">Click Analyze to get your score</p>
                    </div>
                  )}

                  {/* Score breakdown (only if analyzed) */}
                  {isAnalyzed && resume.analysis && (
                    <div className="mb-3 space-y-1">
                      {resume.analysis.ats?.score != null && (
                        <ScoreBar label="ATS" value={Math.round((resume.analysis.ats.score / 10) * 100)} />
                      )}
                      {resume.analysis.keywords?.score != null && (
                        <ScoreBar label="Keywords" value={Math.round((resume.analysis.keywords.score / 10) * 100)} />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => navigate(`/analyze/${resume._id}`)}
                      className="btn-primary flex-1 text-sm py-2.5"
                    >
                      {isAnalyzed ? '🔄 Re-Analyze' : '🚀 Analyze'}
                    </button>
                    <button
                      onClick={() => handleDelete(resume._id)}
                      disabled={deletingId === resume._id}
                      className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700 text-sm disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === resume._id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
