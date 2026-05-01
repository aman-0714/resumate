// routes/analyzeRoutes.js
const express = require('express');
const router = express.Router();
const { analyzeResume, getJobRoles } = require('../controllers/analyzeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/job-roles', getJobRoles);
router.post('/:resumeId', protect, analyzeResume);

module.exports = router;
