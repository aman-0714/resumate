// routes/jobMatchRoutes.js
const express  = require('express');
const router   = express.Router();
const { matchJob, extractKW } = require('../controllers/jobMatchController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/job-match          — full match (auth optional via resumeId)
router.post('/', matchJob);

// POST /api/job-match/keywords — keyword extraction utility (no auth needed)
router.post('/keywords', extractKW);

module.exports = router;
