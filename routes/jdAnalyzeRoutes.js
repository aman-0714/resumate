// routes/jdAnalyzeRoutes.js
const express  = require('express');
const router   = express.Router();
const { analyzeJD } = require('../controllers/jdAnalyzeController');
const { protect }   = require('../middleware/authMiddleware');

// POST /api/jd-analyze  — full ATS + NLP + job-match analysis
// Auth is optional: logged-in users can attach a resumeId; guests send raw resumeText
router.post('/', protect, analyzeJD);

module.exports = router;
