// controllers/analyzeController.js
const Resume = require('../models/Resume');
const { scoreResume, JOB_ROLE_KEYWORDS } = require('../utils/aiScorer');

// @POST /api/analyze/:resumeId
const analyzeResume = async (req, res) => {
  try {
    const { jobRole } = req.body;

    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }
    if (!resume.rawText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text not available. Please re-upload your resume.',
      });
    }

    // Run full analysis via Aiscorer v3.1
    const result = await scoreResume(resume.rawText, resume.parsedData, jobRole || null);

    // Save all fields to the analysis subdocument.
    // FIX v3.1: Use result.selectedJobRole (set by scorer) instead of raw jobRole from req.body.
    // This ensures selectedJobRole is always accurate even when auto-detection kicks in.
    resume.analysis = {
      success:         true,
      score:           result.score,
      summary:         result.summary         || '',
      selectedJobRole: result.selectedJobRole || jobRole || '',
      analyzedAt:      new Date(),

      ats: {
        score:   result.ats?.score   ?? 0,
        verdict: result.ats?.verdict ?? '',
        issues:  result.ats?.issues  ?? [],
      },

      sections: {
        education:      result.sections?.education      ?? false,
        experience:     result.sections?.experience     ?? false,
        skills:         result.sections?.skills         ?? false,
        projects:       result.sections?.projects       ?? false,
        certifications: result.sections?.certifications ?? false,
        summary:        result.sections?.summary        ?? false,
        achievements:   result.sections?.achievements   ?? false,
      },

      keywords: {
        matched:         result.keywords?.matched         ?? [],
        relatedMatches:  result.keywords?.relatedMatches  ?? [],
        missing:         result.keywords?.missing         ?? [],
        matchPercentage: result.keywords?.matchPercentage ?? 0,
        score:           result.keywords?.score           ?? 0,
      },

      formatting: {
        bulletPointsDetected: result.formatting?.bulletPointsDetected ?? false,
        totalBulletPoints:    result.formatting?.totalBulletPoints    ?? 0,
        avgBulletLength:      result.formatting?.avgBulletLength      ?? 0,
        readabilityScore:     result.formatting?.readabilityScore     ?? 0,
      },

      actionVerbs: {
        used:      result.actionVerbs?.used      ?? [],
        count:     result.actionVerbs?.count     ?? 0,
        weakVerbs: result.actionVerbs?.weakVerbs ?? [],
      },

      metrics: {
        wordCount:           result.metrics?.wordCount           ?? 0,
        sentenceCount:       result.metrics?.sentenceCount       ?? 0,
        avgWordsPerSentence: result.metrics?.avgWordsPerSentence ?? 0,
      },

      grammar: {
        score:  result.grammar?.score  ?? 0,
        issues: result.grammar?.issues ?? [],
      },

      missingSkills: result.missingSkills ?? [],
      issues:        result.issues        ?? [],
      suggestions:   result.suggestions   ?? [],
      strengths:     result.strengths     ?? [],
      weaknesses:    result.weaknesses    ?? [],
    };

    await resume.save();

    return res.json({
      success:  true,
      message:  'Analysis complete!',
      analysis: resume.analysis,
    });

  } catch (error) {
    console.error('[analyzeController] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Analysis failed. Please try again.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @GET /api/analyze/job-roles  — list all supported job roles (no auth)
const getJobRoles = (req, res) => {
  const roles = Object.entries(JOB_ROLE_KEYWORDS).map(([key, val]) => ({
    key,
    title: val.title,
  }));
  res.json({ success: true, count: roles.length, roles });
};

module.exports = { analyzeResume, getJobRoles };
