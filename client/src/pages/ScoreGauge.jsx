// src/components/ScoreGauge.jsx
export default function ScoreGauge({ score, label, size = 'md' }) {
  const color =
    score >= 80 ? 'text-emerald-400' :
    score >= 60 ? 'text-yellow-400'  :
    score >= 40 ? 'text-orange-400'  : 'text-red-400'

  const ring =
    score >= 80 ? 'stroke-emerald-400' :
    score >= 60 ? 'stroke-yellow-400'  :
    score >= 40 ? 'stroke-orange-400'  : 'stroke-red-400'

  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            className={ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-display font-bold text-xl ${color}`}>
          {score}
        </div>
      </div>
      {label && <span className="text-xs text-slate-400 text-center">{label}</span>}
    </div>
  )
}