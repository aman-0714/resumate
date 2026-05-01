// routes/careerRoutes.js
const express = require('express');
const router = express.Router();
const { generateCareerGuidance } = require('../controllers/careerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:resumeId', protect, generateCareerGuidance);

module.exports = router;
