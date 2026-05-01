// routes/resumeRoutes.js
const express = require('express');
const router = express.Router();
const { uploadResume, getMyResumes, getResumeById, deleteResume } = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('resume'), handleUploadError, uploadResume);
router.get('/my-resumes', protect, getMyResumes);
router.get('/:id', protect, getResumeById);
router.delete('/:id', protect, deleteResume);

module.exports = router;
