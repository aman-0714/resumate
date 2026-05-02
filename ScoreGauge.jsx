const ScoreGauge = ({ score = 0, label = 'Score', size = 160 }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const dashOffset = circumference * (1 - clampedScore / 100);

  const getColor = (s) => {
    if (s >= 80) return '#4ade80'; // green
    if (s >= 60) return '#facc15'; // yellow
    if (s >= 40) return '#fb923c'; // orange
    return '#f87171';              // red
  };

  const color = getColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Background ring */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        {/* Score arc */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        {/* Score text */}
        <text
          x="60" y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white"
          style={{ fontSize: '22px', fontWeight: 700, fill: 'white' }}
        >
          {clampedScore}
        </text>
        <text
          x="60" y="74"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '9px', fill: '#94a3b8' }}
        >
          / 100
        </text>
      </svg>
      <span className="text-slate-400 text-sm font-medium">{label}</span>
    </div>
  );
};

export default ScoreGauge;
