// controllers/analyzeController.js
const Resume = require('../models/Resume');
const { scoreResume, JOB_ROLE_KEYWORDS } = require('../utils/aiScorer');
const { getMLInsights }                  = require('../utils/mlPredictor');

// Map frontend job role keys → Python role keys for skill gap analysis
const JOB_ROLE_MAP = {
  'software_engineer':    'software_engineer',
  'frontend_developer':   'frontend_developer',
  'backend_developer':    'backend_developer',
  'fullstack_developer':  'fullstack_developer',
  'full_stack':           'fullstack_developer',
  'data_scientist':       'data_scientist',
  'ml_engineer':          'ml_engineer',
  'devops_engineer':      'devops_engineer',
  'devops':               'devops_engineer',
};

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

    // Normalise job role for Python skill gap analysis
    const roleKey = jobRole
      ? (JOB_ROLE_MAP[jobRole.toLowerCase().replace(/\s+/g, '_')] || 'software_engineer')
      : 'software_engineer';

    // Run ATS scoring + ML insights (with skill gap) in parallel
    const [result, mlInsights] = await Promise.all([
      scoreResume(resume.rawText, resume.parsedData, jobRole || null),
      getMLInsights(resume.rawText, roleKey),
    ]);

    resume.analysis = {
      success:         true,
      score:           result.score,
      summary:         result.summary         || '',
      selectedJobRole: result.selectedJobRole || jobRole || '',
      analyzedAt:      new Date(),

      // ── ML insights block ──────────────────────────────────────────────────
      mlInsights: {
        available:           mlInsights.mlAvailable        ?? false,
        predictedCompanyFit: mlInsights.predictedCompanyFit ?? null,
        fitConfidence:       mlInsights.fitConfidence       ?? null,
        confidenceScores:    mlInsights.confidenceScores    ?? {},
        resumeProfile:       mlInsights.resumeProfile       ?? null,
        resumeCluster:       mlInsights.resumeCluster       ?? null,
        clusterKeywords:     mlInsights.clusterKeywords     ?? [],
        insightSummary:      mlInsights.mlInsightSummary    ?? mlInsights.mlNote ?? '',
      },

      // ── Skill gap block (NEW) ──────────────────────────────────────────────
      skillGap: mlInsights.skillGap
        ? {
            atsScore:         mlInsights.skillGap.atsScore,
            grade:            mlInsights.skillGap.grade,
            targetRole:       mlInsights.skillGap.targetRole,
            summaryMessage:   mlInsights.skillGap.summaryMessage,
            matchedSkills:    mlInsights.skillGap.matchedSkills,
            critical:         mlInsights.skillGap.critical,
            important:        mlInsights.skillGap.important,
            niceToHave:       mlInsights.skillGap.niceToHave,
            scoreBreakdown:   mlInsights.skillGap.scoreBreakdown,
            categoryCoverage: mlInsights.skillGap.categoryCoverage,
          }
        : null,

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
