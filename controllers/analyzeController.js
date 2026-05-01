// controllers/analyzeController.js
const Resume = require('../models/Resume');
const { scoreResume, JOB_ROLE_KEYWORDS } = require('../utils/aiScorer');

// @POST /api/analyze/:resumeId
const analyzeResume = async (req, res) => {
  try {
    const { jobRole } = req.body;
    const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id });

    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    if (!resume.rawText) return res.status(400).json({ success: false, message: 'Resume text not available. Please re-upload.' });

    const result = await scoreResume(resume.rawText, resume.parsedData, jobRole);

    resume.analysis = {
      ...result,
      selectedJobRole: jobRole || '',
      analyzedAt: new Date(),
    };
    await resume.save();

    res.json({
      success: true,
      message: 'Analysis complete!',
      analysis: resume.analysis,
    });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ success: false, message: 'Analysis failed. Please try again.' });
  }
};

// @GET /api/analyze/job-roles  — list all supported job roles
const getJobRoles = (req, res) => {
  const roles = Object.entries(JOB_ROLE_KEYWORDS).map(([key, val]) => ({
    key,
    title: val.title,
  }));
  res.json({ success: true, roles });
};

module.exports = { analyzeResume, getJobRoles };
