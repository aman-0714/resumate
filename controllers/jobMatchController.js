// controllers/jobMatchController.js
const { matchJobRole } = require('../utils/jobMatcher');
const Resume = require('../models/Resume');

// @POST /api/job-match
// Body: { resumeText, jobDescription }  — or pass resumeId to pull from DB
const matchJob = async (req, res) => {
  try {
    const { resumeText, jobDescription, resumeId } = req.body;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ success: false, message: 'jobDescription is required.' });
    }

    let finalResumeText = resumeText;

    // If a resumeId is provided, load rawText from the database instead
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
      if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
      if (!resume.rawText) return res.status(400).json({ success: false, message: 'Resume text not available. Please re-upload.' });
      finalResumeText = resume.rawText;
    }

    if (!finalResumeText || !finalResumeText.trim()) {
      return res.status(400).json({ success: false, message: 'resumeText (or a valid resumeId) is required.' });
    }

    const result = matchJobRole(finalResumeText, jobDescription);

    // Optionally persist the match result on the resume document
    if (resumeId) {
      await Resume.findByIdAndUpdate(resumeId, {
        $set: { jobMatchResult: { ...result, matchedAt: new Date() } },
      });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Job match error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Matching failed.' });
  }
};

// @POST /api/job-match/keywords
// Utility: extract keywords from arbitrary text (resume or JD) for debugging
const extractKW = (req, res) => {
  try {
    const { extractKeywords } = require('../utils/jobMatcher');
    const { text, topN = 30 } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'text is required.' });
    const keywords = extractKeywords(text, topN);
    return res.json({ success: true, keywords });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { matchJob, extractKW };
