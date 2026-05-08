// src/pages/Landing.jsx
import { Link } from 'react-router-dom'

export default function Landing() {
  const features = [
    { icon: '🎯', title: 'ATS Score',       desc: 'Find out if your resume beats Applicant Tracking Systems.' },
    { icon: '🔍', title: 'Keyword Match',   desc: 'Match keywords to 25+ job roles from a curated database.' },
    { icon: '📊', title: 'Deep Analysis',   desc: 'Get scored on structure, skills, experience, and grammar.' },
    { icon: '🗺️', title: 'Career Roadmap',  desc: 'Receive personalised courses, projects, and career paths.' },
  ]

  return (
    <main className="max-w-5xl mx-auto px-6 py-20">
      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-block bg-brand-500/10 text-brand-500 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-brand-500/20">
          AI-Powered Resume Analysis
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Get your resume<br />
          <span className="text-brand-500">hired faster.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
          Upload your resume. Pick your job role. Get an instant AI-powered score with actionable feedback to land interviews.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/signup" className="btn-primary text-base">Analyze My Resume →</Link>
          <Link to="/login"  className="border border-slate-700 hover:border-slate-500 text-slate-300 px-6 py-3 rounded-xl transition-colors">Sign In</Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => (
          <div key={f.title} className="card flex gap-4 items-start">
            <span className="text-3xl">{f.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}