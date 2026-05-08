// utils/mlPredictor.js
// ─── Python ML Model Bridge ───────────────────────────────────────────────────
// Calls:
//   1. train_model.py  → company fit + cluster (TF-IDF + LogReg)
//   2. skill_gap/suggester.py → ATS score + skill gap + suggestions
//
// Falls back gracefully if Python/models unavailable.

'use strict';

const { spawn } = require('child_process');
const path      = require('path');

const ML_DIR        = path.join(__dirname, '..', '..', 'ml');
const MODELS_DIR    = path.join(ML_DIR, 'models');
const SKILL_GAP_DIR = path.join(ML_DIR, 'skill_gap');

// ─── Generic Python runner ────────────────────────────────────────────────────

const runPython = (scriptCode, inputText, timeoutMs = 20000) => {
  return new Promise((resolve) => {
    const py = spawn('python3', ['-c', scriptCode], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    py.stdin.write(inputText);
    py.stdin.end();

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      py.kill();
      console.warn('[mlPredictor] Python timeout');
      resolve(null);
    }, timeoutMs);

    py.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !stdout.trim()) {
        console.warn('[mlPredictor] Python exited code', code, stderr.slice(0, 200));
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        console.warn('[mlPredictor] JSON parse error:', stdout.slice(0, 100));
        resolve(null);
      }
    });

    py.on('error', (err) => {
      clearTimeout(timer);
      console.warn('[mlPredictor] spawn error:', err.message);
      resolve(null);
    });
  });
};

// ─── 1. Company fit prediction ────────────────────────────────────────────────

const runPythonPredict = (resumeText) => {
  const mlDirEscaped     = ML_DIR.replace(/\\/g, '/');
  const modelsDirEscaped = MODELS_DIR.replace(/\\/g, '/');

  const scriptCode = `
import sys, json
sys.path.insert(0, '${mlDirEscaped}')
from train_model import predict
text = sys.stdin.read()
result = predict(text, '${modelsDirEscaped}')
print(json.dumps(result))
`;
  return runPython(scriptCode, resumeText);
};

// ─── 2. Skill gap analysis ────────────────────────────────────────────────────

const runSkillGapAnalysis = (resumeText, targetRole = 'software_engineer') => {
  const skillGapDirEscaped = SKILL_GAP_DIR.replace(/\\/g, '/');

  const scriptCode = `
import sys, json
sys.path.insert(0, '${skillGapDirEscaped}')
from suggester import analyze_resume
text = sys.stdin.read()
result = analyze_resume(text, target_role='${targetRole}')
print(json.dumps(result))
`;
  return runPython(scriptCode, resumeText, 25000);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * predictCompanyFit(resumeText)
 * Returns ML prediction or null if models not trained.
 */
const predictCompanyFit = async (resumeText) => {
  if (!resumeText || resumeText.length < 100) return null;
  return await runPythonPredict(resumeText);
};

/**
 * getSkillGapReport(resumeText, targetRole)
 * Returns the full skill gap + ATS score report from suggester.py
 */
const getSkillGapReport = async (resumeText, targetRole = 'software_engineer') => {
  if (!resumeText || resumeText.length < 50) return null;
  return await runSkillGapAnalysis(resumeText, targetRole);
};

/**
 * getMLInsights(resumeText, targetRole)
 * Returns a merged insights object for /api/analyze response.
 * Runs both pipelines in parallel.
 */
const getMLInsights = async (resumeText, targetRole = 'software_engineer') => {
  if (!resumeText || resumeText.length < 100) {
    return { mlAvailable: false, mlNote: 'Resume text too short for ML analysis.' };
  }

  // Run both Python jobs in parallel
  const [prediction, gapReport] = await Promise.all([
    runPythonPredict(resumeText),
    runSkillGapAnalysis(resumeText, targetRole),
  ]);

  // ── Cluster profile mapping ───────────────────────────────────────────────
  const CLUSTER_PROFILES = {
    0: 'Full-Stack Developer',
    1: 'Data / ML Engineer',
    2: 'Backend / Systems Engineer',
    3: 'Frontend / UI Engineer',
    4: 'DevOps / Cloud Engineer',
  };

  // ── Build response ────────────────────────────────────────────────────────
  const mlAvailable = !!(prediction && !prediction.error);
  const gapAvailable = !!(gapReport && gapReport.ats_score !== undefined);

  let result = {
    mlAvailable,
    gapAvailable,
  };

  // Company fit block
  if (mlAvailable) {
    const { predicted_company_fit, confidence, resume_cluster, cluster_keywords } = prediction;
    const profile = CLUSTER_PROFILES[resume_cluster] ?? `Profile Group ${resume_cluster}`;
    const topFit  = predicted_company_fit?.charAt(0).toUpperCase() + predicted_company_fit?.slice(1);
    const fitPct  = Math.round((confidence?.[predicted_company_fit] ?? 0) * 100);

    result = {
      ...result,
      predictedCompanyFit: topFit,
      fitConfidence:       fitPct,
      confidenceScores:    confidence,
      resumeCluster:       resume_cluster,
      resumeProfile:       profile,
      clusterKeywords:     cluster_keywords ?? [],
      mlInsightSummary:    `Your resume profile most closely matches ${profile} candidates. ` +
                           `Based on patterns from software resumes, it scores ${fitPct}% alignment ` +
                           `with ${topFit} hiring criteria.`,
    };
  } else {
    result.mlNote = 'ML models not trained yet. Run: cd ml && python train_model.py';
  }

  // Skill gap block
  if (gapAvailable) {
    result.skillGap = {
      atsScore:        gapReport.ats_score,
      grade:           gapReport.grade,
      targetRole:      gapReport.target_role,
      summaryMessage:  gapReport.summary_message,
      matchedSkills:   gapReport.matched_skills ?? [],
      critical:        gapReport.critical        ?? [],
      important:       gapReport.important       ?? [],
      niceToHave:      gapReport.nice_to_have    ?? [],
      scoreBreakdown:  gapReport.score_breakdown ?? {},
      categoryCoverage: gapReport.category_coverage ?? {},
    };
  } else {
    result.skillGapNote = 'Skill gap analysis unavailable. Check ml/skill_gap/ setup.';
  }

  return result;
};

module.exports = { predictCompanyFit, getSkillGapReport, getMLInsights };
