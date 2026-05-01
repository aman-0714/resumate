// controllers/careerController.js
const Resume = require('../models/Resume');
const { getCareerGuidance } = require('../utils/aiScorer');

// @POST /api/career/:resumeId
const generateCareerGuidance = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });

    const jobRole = resume.analysis?.selectedJobRole || req.body.jobRole;
    const missingSkills = resume.analysis?.missingKeywords || [];

    const guidance = getCareerGuidance(jobRole, missingSkills);
    resume.careerGuidance = guidance;
    await resume.save();

    res.json({ success: true, guidance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate career guidance.' });
  }
};

module.exports = { generateCareerGuidance };
