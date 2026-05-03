// routes/rewriteRoutes.js
const express = require('express');
const router  = express.Router();
const { rewriteResume } = require('../controllers/rewriteController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/rewrite/:resumeId  — AI-powered resume rewrite
router.post('/:resumeId', protect, rewriteResume);

module.exports = router;
