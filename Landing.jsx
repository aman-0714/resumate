import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useEffect, useRef, useState } from 'react';

// Animated counter hook
const useCountUp = (target, suffix = '', duration = 1800) => {
  const [display, setDisplay] = useState('0' + suffix);
  const rafRef = useRef(null);
  const observerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observerRef.current?.disconnect();
        const isFloat = String(target).includes('.');
        const numTarget = parseFloat(target);
        const start = performance.now();
        const tick = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = eased * numTarget;
          setDisplay((isFloat ? val.toFixed(1) : Math.round(val).toString()) + suffix);
          if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observerRef.current.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
    };
  }, [target, suffix, duration]);

  return { display, ref: containerRef };
};

const CounterStat = ({ value, suffix, label }) => {
  const { display, ref } = useCountUp(value, suffix);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-brand-400 font-display tabular-nums">
        {display}
      </div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );
};

const features = [
  {
    icon: '📄',
    title: 'Resume Parsing',
    desc: 'Upload your PDF resume and we instantly extract your skills, experience, education, and contact details.',
    color: 'from-blue-500/10 to-blue-600/5',
    border: 'hover:border-blue-500/40',
  },
  {
    icon: '🤖',
    title: 'AI Analysis',
    desc: 'Get a comprehensive ATS score, keyword match score, structure score, and personalized suggestions.',
    color: 'from-purple-500/10 to-purple-600/5',
    border: 'hover:border-purple-500/40',
  },
  {
    icon: '🎯',
    title: 'Job Role Matching',
    desc: 'Paste any job description and get a detailed match score showing exactly what you need to add.',
    color: 'from-orange-500/10 to-orange-600/5',
    border: 'hover:border-orange-500/40',
  },
  {
    icon: '🚀',
    title: 'Career Guidance',
    desc: 'Get curated course recommendations, project ideas, and career path guidance for your target role.',
    color: 'from-green-500/10 to-green-600/5',
    border: 'hover:border-green-500/40',
  },
];

const steps = [
  {
    num: '01',
    icon: '⬆️',
    title: 'Upload Resume',
    desc: 'Drag & drop your PDF or DOC resume. We parse it instantly — no account needed to start.',
  },
  {
    num: '02',
    icon: '🤖',
    title: 'AI Analysis',
    desc: 'Our AI scores your resume on ATS compatibility, keyword density, formatting, and structure.',
  },
  {
    num: '03',
    icon: '📈',
    title: 'Get Insights',
    desc: 'Receive actionable suggestions to improve your score and land more interview calls.',
  },
];

const testimonials = [
  {
    name: 'Priya S.',
    role: 'Software Engineer',
    text: 'My ATS score went from 54 to 88 in one round of edits. Got 3 interview calls that week!',
    avatar: 'P',
    score: { before: 54, after: 88 },
  },
  {
    name: 'Rahul M.',
    role: 'Data Analyst',
    text: 'The keyword matching feature is a game changer. Knew exactly what to add for each job.',
    avatar: 'R',
    score: { before: 61, after: 91 },
  },
  {
    name: 'Anjali K.',
    role: 'Product Manager',
    text: 'So easy to use. Uploaded my resume and had a full breakdown in under 30 seconds.',
    avatar: 'A',
    score: { before: 47, after: 79 },
  },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-500/4 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            AI-Powered Resume Optimizer
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-display text-white leading-tight mb-6 tracking-tight">
            Land More Interviews<br />
            <span className="text-brand-400">with a Better Resume</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Resumate analyzes your resume against ATS systems, matches it to job descriptions,
            and gives you actionable feedback to stand out from thousands of applicants.
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
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-lg px-8 py-4 border border-slate-700 hover:border-slate-500 rounded-xl">
                  Login
                </Link>
              </>
            )}
          </div>
          <p className="text-slate-600 text-sm mt-6">Free to start · No credit card required · Instant results</p>
        </div>
      </section>

      {/* Sample Score Preview */}
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="card text-center border-slate-700/60">
            <p className="text-slate-400 text-sm uppercase tracking-widest font-medium mb-6">Sample Analysis Output</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
              {[
                { label: 'ATS Score', score: 87, barColor: 'bg-green-400', textColor: 'text-green-400' },
                { label: 'Keyword Match', score: 74, barColor: 'bg-yellow-400', textColor: 'text-yellow-400' },
                { label: 'Structure', score: 92, barColor: 'bg-green-400', textColor: 'text-green-400' },
                { label: 'Overall', score: 83, barColor: 'bg-brand-400', textColor: 'text-brand-400' },
              ].map(({ label, score, barColor, textColor }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`text-4xl font-bold font-display ${textColor}`}>{score}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-1000`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-2">Sample scores — your results will be personalized based on your actual resume</p>
          </div>
        </div>
      </section>

      {/* Stats Banner — Animated Counters */}
      <section className="py-14 px-4 bg-brand-500/5 border-y border-brand-500/10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            <CounterStat value={10000} suffix="+" label="Resumes Analyzed" />
            <CounterStat value={85} suffix="%" label="Avg Score Improvement" />
            <CounterStat value={3} suffix="x" label="More Interview Calls" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white text-center mb-2">How It Works</h2>
          <p className="text-slate-400 text-center mb-16">Three simple steps to a better resume</p>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            {steps.map((step, i) => (
              <div key={step.num} className="flex flex-col items-center text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-4 relative z-10">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div className="text-xs text-brand-500/60 font-bold uppercase tracking-widest mb-1">{step.num}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-y border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white text-center mb-2">Everything You Need to Get Hired</h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">One platform to analyze, optimize, and match your resume to any job.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className={`card bg-gradient-to-br ${f.color} ${f.border} transition-all duration-300 group`}>
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-display text-white text-center mb-2">Loved by Job Seekers</h2>
          <p className="text-slate-400 text-center mb-14">Real results from real users</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="card hover:border-slate-600 transition-all duration-200 flex flex-col">
                <div className="text-brand-400 text-2xl mb-3">❝</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-5 flex-1">"{t.text}"</p>
                {/* Before / After score pill */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 font-medium">
                    Before: {t.score.before}
                  </span>
                  <span className="text-slate-600 text-xs">→</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
                    After: {t.score.after}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card bg-gradient-to-br from-brand-500/10 to-slate-900 border-brand-500/20">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-4">Ready to Optimize Your Resume?</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Join thousands of job seekers getting more interviews with AI-powered resume analysis. Start free — no credit card required.
            </p>
            <Link to={user ? '/upload' : '/signup'} className="btn-primary text-lg px-10 py-4 inline-block">
              {user ? 'Upload Resume →' : 'Get Started Free →'}
            </Link>
            <p className="text-slate-600 text-xs mt-5">Free forever · No spam · Instant analysis</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-display font-bold text-white text-lg">
            Resu<span className="text-brand-400">mate</span>
            <span className="text-slate-600 font-normal font-sans text-sm ml-3">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Contact'].map(link => (
              <a key={link} href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
