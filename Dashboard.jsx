import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resumeAPI } from './src/api.js';
import { useAuth } from './AuthContext.jsx';
import ScoreGauge from './ScoreGauge.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const { data } = await resumeAPI.getAll();
        setResumes(data.resumes || []);
      } catch (err) {
        setError('Failed to load resumes.');
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return;
    try {
      await resumeAPI.deleteById(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
    } catch {
      alert('Failed to delete resume.');
    }
  };

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
          <Link to="/upload" className="btn-primary whitespace-nowrap">
            + Upload Resume
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Resumes', value: resumes.length },
            { label: 'Analyzed', value: resumes.filter(r => r.analysis?.overallScore > 0).length },
            { label: 'Avg Score', value: resumes.length ? Math.round(resumes.reduce((sum, r) => sum + (r.analysis?.overallScore || 0), 0) / resumes.length) : 0 },
            { label: 'Best Score', value: resumes.length ? Math.max(...resumes.map(r => r.analysis?.overallScore || 0)) : 0 },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center">
              <div className="text-3xl font-bold text-brand-400">{value}</div>
              <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Resume List */}
        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading resumes...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-16">{error}</div>
        ) : resumes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-white mb-2">No resumes yet</h3>
            <p className="text-slate-400 mb-6">Upload your first resume to get started</p>
            <Link to="/upload" className="btn-primary inline-block">Upload Resume</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div key={resume._id} className="card hover:border-slate-700 transition-colors flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{resume.fileName}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 uppercase ml-2">
                    {resume.fileType}
                  </span>
                </div>

                {resume.analysis?.overallScore > 0 ? (
                  <div className="flex justify-center mb-4">
                    <ScoreGauge score={resume.analysis.overallScore} label="Overall Score" size={120} />
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-xl py-6 text-center mb-4">
                    <p className="text-slate-500 text-sm">Not analyzed yet</p>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => navigate(`/analyze/${resume._id}`)}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    {resume.analysis?.overallScore > 0 ? 'Re-Analyze' : 'Analyze'}
                  </button>
                  <button
                    onClick={() => handleDelete(resume._id)}
                    className="px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm border border-slate-700"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
