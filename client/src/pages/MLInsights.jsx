// MLInsights.jsx
// ─── ML Insights Panel ────────────────────────────────────────────────────────
// Rendered inside Analyze.jsx when mlInsights.available === true.
// Shows: company fit confidence, resume profile, cluster keywords.

import React from 'react';

const PROFILE_ICONS = {
  'Full-Stack Developer':       '🔗',
  'Data / ML Engineer':         '🤖',
  'Backend / Systems Engineer': '⚙️',
  'Frontend / UI Engineer':     '🎨',
  'DevOps / Cloud Engineer':    '☁️',
};

const CompanyBar = ({ company, value }) => {
  const pct   = Math.round((value ?? 0) * 100);
  const color  = company === 'paytm' ? '#00BAF2' : '#FF6B00';
  const label  = company.charAt(0).toUpperCase() + company.slice(1);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

const MLInsights = ({ ml }) => {
  if (!ml || !ml.available) {
    return (
      <div style={{
        background: '#fefce8', border: '1px solid #fde68a',
        borderRadius: 10, padding: '16px 20px', fontSize: 13, color: '#92400e',
        marginTop: 16,
      }}>
        <strong>🤖 ML Insights:</strong> {ml?.insightSummary || 'Train models to unlock AI-powered company fit predictions.'}
      </div>
    );
  }

  const icon = PROFILE_ICONS[ml.resumeProfile] ?? '📄';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      border: '1.5px solid #bae6fd', borderRadius: 14, padding: '20px 24px',
      marginTop: 20, boxShadow: '0 2px 12px rgba(14,165,233,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>🤖</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0369a1' }}>ML Intelligence</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Trained on 150+ real Paytm & Optum resumes</div>
        </div>
      </div>

      {/* Resume Profile */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, background: 'white',
        borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        border: '1px solid #e0f2fe',
      }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Your Resume Profile</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{ml.resumeProfile}</div>
        </div>
      </div>

      {/* Company Fit */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>
          Company Fit Confidence
        </div>
        {Object.entries(ml.confidenceScores || {}).map(([co, val]) => (
          <CompanyBar key={co} company={co} value={val} />
        ))}
      </div>

      {/* Cluster Keywords */}
      {ml.clusterKeywords?.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>
            Defining Skills in Your Profile Group
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ml.clusterKeywords.slice(0, 10).map((kw) => (
              <span key={kw} style={{
                background: '#dbeafe', color: '#1d4ed8',
                fontSize: 11, fontWeight: 600, padding: '3px 10px',
                borderRadius: 20, textTransform: 'lowercase',
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Insight Summary */}
      <div style={{
        marginTop: 14, padding: '10px 14px', background: 'rgba(14,165,233,0.06)',
        borderRadius: 8, fontSize: 12, color: '#0c4a6e', lineHeight: 1.6,
      }}>
        💡 {ml.insightSummary}
      </div>
    </div>
  );
};

export default MLInsights;
