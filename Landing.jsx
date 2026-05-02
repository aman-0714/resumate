import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const features = [
  {
    icon: '📄',
    title: 'Resume Parsing',
    desc: 'Upload your PDF resume and we instantly extract your skills, experience, education, and contact details.',
  },
  {
    icon: '🤖',
    title: 'AI Analysis',
    desc: 'Get a comprehensive ATS score, keyword match score, structure score, and personalized suggestions.',
  },
  {
    icon: '🎯',
    title: 'Job Role Matching',
    desc: 'Paste any job description and get a detailed match score showing exactly what you need to add.',
  },
  {
    icon: '🚀',
    title: 'Career Guidance',
    desc: 'Get curated course recommendations, project ideas, and career path guidance for your target role.',
  },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium mb-6">
            AI-Powered Resume Optimizer
          </div>
          <h1 className="text-5xl md:text-6xl font-bold font-display text-white leading-tight mb-6">
            Land More Interviews<br />
            <span className="text-brand-400">with a Better Resume</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Resumate analyzes your resume against ATS systems, matches it to job descriptions,
            and gives you actionable feedback to stand out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-4">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary text-lg px-8 py-4">
                  Analyze My Resume Free →
                </Link>
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-lg px-8 py-4 border border-slate-700 rounded-xl">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Score Preview */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="card text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'ATS Score', score: 87 },
                { label: 'Keyword Match', score: 74 },
                { label: 'Structure', score: 92 },
                { label: 'Overall', score: 83 },
              ].map(({ label, score }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="text-4xl font-bold text-brand-400">{score}</div>
                  <div className="text-sm text-slate-400">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-6">Sample analysis scores — your results will be personalized</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white text-center mb-4">
            Everything You Need to Get Hired
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            One platform to analyze, optimize, and match your resume to any job.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card hover:border-brand-500/50 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center card">
          <h2 className="text-3xl font-bold font-display text-white mb-4">
            Ready to Optimize Your Resume?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of job seekers getting more interviews with AI-powered resume analysis.
          </p>
          <Link to={user ? '/upload' : '/signup'} className="btn-primary text-lg px-8 py-4 inline-block">
            {user ? 'Upload Resume →' : 'Get Started Free →'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} Resumate · AI Resume Optimizer
      </footer>
    </div>
  );
};

export default Landing;
