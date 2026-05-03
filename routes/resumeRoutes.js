// routes/resumeRoutes.js

const express = require('express');
const router = express.Router();

const { 
  uploadResume, 
  getMyResumes, 
  getResumeById, 
  deleteResume 
} = require('../controllers/resumeController');

const { protect } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

// Existing routes
router.post('/upload', protect, upload.single('resume'), handleUploadError, uploadResume);
router.get('/my-resumes', protect, getMyResumes);
router.get('/:id', protect, getResumeById);
router.delete('/:id', protect, deleteResume);

// ✅ NEW analyze route
router.post('/analyze', (req, res) => {
  console.log("Analyze route hit");

  res.json({
    success: true,
    message: "Analyze API working",
    received: req.body
  });
});

module.exports = router;