// server.js - Main entry point for Resumate backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// ─── Request Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Static Files (uploaded resumes) ──────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/resume',    require('./routes/resumeRoutes'));
app.use('/api/analyze',   require('./routes/analyzeRoutes'));
app.use('/api/career',    require('./routes/careerRoutes'));
app.use('/api/job-match', require('./routes/jobMatchRoutes'));   // ← NLP matcher
app.use('/api/ml',        require('./routes/mlRoutes'));          // ← ML models


// ─── ATS Quick Analyze (no auth, for standalone ATS page) ─────────────────────
app.post('/api/analyze/ats-quick', async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;
    if (!resumeText) return res.status(400).json({ success: false, message: 'resumeText required' });
    const { scoreResume } = require('./utils/aiScorer');
    const { extractSkills, detectSections } = require('./utils/resumeParser');
    const skills = extractSkills(resumeText);
    const sections = detectSections(resumeText);
    const parsedData = { skills, sections, experience: [], education: [], name: '', email: '', phone: '', summary: '' };
    const result = await scoreResume(resumeText, parsedData, jobRole);
    res.json({
      success: true,
      result: {
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        improvements: result.suggestions.slice(0, 4),
        skills: result.matchedKeywords.slice(0, 8),
        projects: [
          { title: 'Portfolio Project', description: 'Build a project showcasing key skills for ' + jobRole },
          { title: 'Open Source Contribution', description: 'Contribute to a relevant open-source repository' },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Welcome to Resumate API 🚀' });
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Resumate API is running 🚀' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Database Connection & Server Start ───────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
