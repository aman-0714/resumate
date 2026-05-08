// routes/rewriteRoutes.js
const express = require('express');
const router  = express.Router();
const { rewriteResume, downloadRewrittenPDF } = require('../controllers/rewriteController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/rewrite/:resumeId          — AI-powered resume rewrite (returns JSON)
router.post('/:resumeId', protect, rewriteResume);

// POST /api/rewrite/:resumeId/pdf      — Generate & stream a formatted PDF of the rewritten resume
router.post('/:resumeId/pdf', protect, downloadRewrittenPDF);

module.exports = router;
