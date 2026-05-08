// routes/mlRoutes.js
// ─── ML API Routes ────────────────────────────────────────────────────────────
// GET  /api/ml/status           → check if models are trained
// POST /api/ml/predict          → run ML prediction on raw text
// POST /api/ml/skill-gap        → run skill gap analysis only
// GET  /api/ml/training-report  → get last training report

'use strict';

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { predictCompanyFit, getMLInsights, getSkillGapReport } = require('../utils/mlPredictor');

const MODELS_DIR  = path.join(__dirname, '..', '..', 'ml', 'models');
const REPORT_PATH = path.join(MODELS_DIR, 'training_report.json');

// GET /api/ml/status
router.get('/status', (req, res) => {
  const trained = fs.existsSync(REPORT_PATH);
  let report = null;
  if (trained) {
    try { report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')); } catch {}
  }
  res.json({
    success:         true,
    modelsAvailable: trained,
    skillGapReady:   true,   // skill_gap module is pure-Python, always available
    accuracy:        report?.accuracy ?? null,
    datasetSize:     report?.dataset_size ?? null,
    labelClasses:    report?.label_classes ?? [],
    clusterCount:    Object.keys(report?.cluster_summaries ?? {}).length,
  });
});

// GET /api/ml/training-report
router.get('/training-report', (req, res) => {
  if (!fs.existsSync(REPORT_PATH)) {
    return res.status(404).json({ success: false, message: 'Models not trained yet.' });
  }
  try {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    res.json({ success: true, report });
  } catch {
    res.status(500).json({ success: false, message: 'Could not read training report.' });
  }
});

// POST /api/ml/predict
// Body: { resumeText: string, targetRole?: string }
router.post('/predict', async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'resumeText required (min 50 chars).' });
    }
    const insights = await getMLInsights(resumeText, targetRole || 'software_engineer');
    res.json({ success: true, ...insights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ml/skill-gap
// Body: { resumeText: string, targetRole?: string }
// Returns skill gap report without company-fit prediction (faster)
router.post('/skill-gap', async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'resumeText required (min 50 chars).' });
    }
    const report = await getSkillGapReport(resumeText, targetRole || 'software_engineer');
    if (!report) {
      return res.status(500).json({ success: false, message: 'Skill gap analysis failed. Check Python setup.' });
    }
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
