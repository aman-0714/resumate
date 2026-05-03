const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { autoFixResume } = require('../controllers/autoFixController');

// POST /api/resume/:id/auto-fix
router.post('/:id/auto-fix', protect, autoFixResume);

module.exports = router;
