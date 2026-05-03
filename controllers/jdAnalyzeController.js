// controllers/jdAnalyzeController.js
// Handles the full ATS + NLP + job-match analysis driven by the prompt:
//   1. ATS Check        — structure, clarity, action verbs, score, verdict
//   2. Skill Gap        — matched / missing skills, match %
//   3. Job-Role Match   — match score, role fit (Low / Medium / High)
//   4. Analysis         — strengths, weaknesses, issues, suggestions
//   5. Summary          — 2-3 line overall evaluation
//
// Uses:  Claude claude-sonnet-4-20250514  via @anthropic-ai/sdk
//        Falls back to rule-based scoring if API key is absent.

const Anthropic = require('@anthropic-ai/sdk');
const Resume    = require('../models/Resume');

// ─── helpers ──────────────────────────────────────────────────────────────────

const safeJSON = (text) => {
  // strip possible markdown fences
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

const roleFit = (score) =>
  score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low';

const atsVerdict = (score) =>
  score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Average' : 'Poor';

// ─── rule-based fallback ──────────────────────────────────────────────────────

const ruleBased = (parsedData, jobDescription, jobRole) => {
  const resumeText = [
    (parsedData?.skills   || []).join(' '),
    (parsedData?.experience || []).map(e => `${e.title} ${e.description}`).join(' '),
    (parsedData?.education  || []).map(e => `${e.degree} ${e.institution}`).join(' '),
    (parsedData?.summary    || ''),
  ].join(' ').toLowerCase();

  // tokenise JD
  const jdWords = jobDescription.toLowerCase().match(/\b[a-z][a-z0-9+#.]{1,}/g) || [];
  const STOP = new Set(['and','or','the','a','an','in','on','at','to','for','of','with','is','are',
    'you','we','will','be','have','that','this','as','by','from','it','its','not','but']);
  const jdKeywords = [...new Set(jdWords.filter(w => !STOP.has(w) && w.length > 2))];

  const matched = jdKeywords.filter(kw => resumeText.includes(kw));
  const missing = jdKeywords.filter(kw => !resumeText.includes(kw)).slice(0, 15);
  const matchPct = jdKeywords.length > 0
    ? Math.round((matched.length / jdKeywords.length) * 100) : 0;

  const atsScore  = Math.min(100, Math.round(
    (matchPct * 0.50) +
    ((parsedData?.experience?.length > 0 ? 1 : 0) * 15) +
    ((parsedData?.skills?.length > 0 ? 1 : 0)      * 15) +
    ((parsedData?.education?.length > 0 ? 1 : 0)   * 10) +
    ((parsedData?.summary ? 1 : 0)                  * 10)
  ));

  const jobMatch = Math.min(100, Math.round(matchPct * 0.7 + atsScore * 0.3));

  return {
    ats: { score: atsScore, verdict: atsVerdict(atsScore) },
    jobMatch: { matchScore: jobMatch, roleFit: roleFit(jobMatch) },
    skills: { matched: matched.slice(0, 20), missing: missing.slice(0, 10), matchPercentage: matchPct },
    analysis: {
      strengths:   ['Relevant skills detected in resume', 'Experience section present'],
      weaknesses:  ['Keyword density could be improved', 'Quantifiable achievements may be missing'],
      issues:      matchPct < 30 ? ['Low keyword match with job description'] : [],
      suggestions: [
        'Tailor your resume keywords to mirror the job description.',
        'Quantify your achievements with numbers and percentages.',
        'Add a concise professional summary aligned to the target role.',
      ],
    },
    summary: `Rule-based analysis (Claude API unavailable). ATS score: ${atsScore}/100, Job match: ${jobMatch}/100.`,
  };
};

// ─── controller ──────────────────────────────────────────────────────────────

const analyzeJD = async (req, res) => {
  try {
    const { resumeId, parsedData: bodyParsed, jobDescription, jobRole } = req.body;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ success: false, message: 'jobDescription is required.' });
    }

    // ── Resolve parsedData ───────────────────────────────────────────────────
    let parsedData = bodyParsed || null;

    if (!parsedData && resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
      if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
      parsedData = resume.parsedData || null;
    }

    if (!parsedData) {
      return res.status(400).json({
        success: false,
        message: 'Provide parsedData (JSON) or a valid resumeId.',
      });
    }

    // ── Try Claude claude-sonnet-4-20250514 ──────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      console.warn('[jdAnalyze] No API key — using rule-based fallback.');
      const fallback = ruleBased(parsedData, jobDescription, jobRole);
      return res.json({ success: true, source: 'rule-based', ...fallback });
    }

    const client = new Anthropic({ apiKey });

    const prompt = `Act as an advanced ATS (Applicant Tracking System) and NLP engineer.

You are given:
1. Parsed Resume Data (JSON)
2. Job Description (text)
3. Target Job Role

Your job is to analyze the resume and provide intelligent insights.

---

TASKS:

1. ATS CHECK
- Evaluate resume quality based on:
  - Structure (education, skills, experience, projects)
  - Clarity and completeness
  - Use of action verbs
- Provide ATS score (0–100)
- Provide verdict: Poor | Average | Good | Excellent

---

2. SKILL GAP DETECTION
- Extract key skills from the job description
- Compare with resume skills
- Identify:
  - matched skills
  - missing skills (important ones only)
- Calculate match percentage

---

3. JOB-ROLE MATCHING
- Compare resume with job description
- Calculate match score (0–100)
- Determine role fit: Low | Medium | High

---

4. ANALYSIS
Generate:
- strengths (3–5 points)
- weaknesses (3–5 points)
- issues (critical problems only)
- suggestions (specific and actionable improvements)

---

INPUT:

Resume Data:
${JSON.stringify(parsedData, null, 2)}

Job Description:
${jobDescription}

Job Role:
${jobRole || 'Not specified'}

---

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "ats": {
    "score": number,
    "verdict": "Poor | Average | Good | Excellent"
  },
  "jobMatch": {
    "matchScore": number,
    "roleFit": "Low | Medium | High"
  },
  "skills": {
    "matched": [],
    "missing": [],
    "matchPercentage": number
  },
  "analysis": {
    "strengths": [],
    "weaknesses": [],
    "issues": [],
    "suggestions": []
  },
  "summary": "2-3 line overall evaluation"
}

---

RULES:
- Return ONLY valid JSON
- Do NOT include explanations outside JSON
- Do NOT leave fields empty
- Missing skills must be relevant to the job role
- Suggestions must be specific (not generic)
- Keep output concise and professional`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw    = message.content.find(c => c.type === 'text')?.text || '';
    const result = safeJSON(raw);

    // Normalise & validate required keys
    const response = {
      ats: {
        score:   Number(result.ats?.score   ?? 0),
        verdict: result.ats?.verdict        ?? atsVerdict(result.ats?.score ?? 0),
      },
      jobMatch: {
        matchScore: Number(result.jobMatch?.matchScore ?? 0),
        roleFit:    result.jobMatch?.roleFit           ?? roleFit(result.jobMatch?.matchScore ?? 0),
      },
      skills: {
        matched:         Array.isArray(result.skills?.matched)  ? result.skills.matched  : [],
        missing:         Array.isArray(result.skills?.missing)  ? result.skills.missing  : [],
        matchPercentage: Number(result.skills?.matchPercentage  ?? 0),
      },
      analysis: {
        strengths:   Array.isArray(result.analysis?.strengths)   ? result.analysis.strengths   : [],
        weaknesses:  Array.isArray(result.analysis?.weaknesses)  ? result.analysis.weaknesses  : [],
        issues:      Array.isArray(result.analysis?.issues)      ? result.analysis.issues      : [],
        suggestions: Array.isArray(result.analysis?.suggestions) ? result.analysis.suggestions : [],
      },
      summary: result.summary ?? '',
    };

    return res.json({ success: true, source: 'claude', ...response });

  } catch (err) {
    console.error('[jdAnalyzeController] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'JD analysis failed. Please try again.',
      error:   process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

module.exports = { analyzeJD };
