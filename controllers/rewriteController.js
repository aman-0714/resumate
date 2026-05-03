// controllers/rewriteController.js
// AI-powered resume rewriter using Anthropic Claude API
'use strict';

const Resume = require('../models/Resume');
const { JOB_ROLE_KEYWORDS, normalizeJobRole } = require('../utils/aiScorer');

// ─── Rule-based fallback (used only if Claude API key is missing) ─────────────
const VERB_MAP = {
  'worked on':           'Developed',
  'worked with':         'Collaborated on',
  'worked':              'Executed',
  'helped':              'Supported',
  'assisted':            'Collaborated on',
  'was responsible for': 'Managed',
  'was involved in':     'Contributed to',
  'involved in':         'Contributed to',
  'did':                 'Executed',
  'made':                'Produced',
  'tried':               'Implemented',
  'got':                 'Achieved',
  'handled':             'Managed',
};

const ruleBasedRewrite = (rawText, parsedData, effectiveRole) => {
  const lines = rawText.split('\n');
  const roleData = JOB_ROLE_KEYWORDS[effectiveRole];
  const topSkills = (parsedData?.skills || []).slice(0, 5).join(', ') || 'relevant technologies';
  const roleTitle = roleData?.title || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'the target role');

  const rewritten = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (/^[\•\-\*▪►◆▸·–]\s+/i.test(trimmed) || /^\d+[\.\)]\s+/i.test(trimmed)) {
      let content = trimmed.replace(/^[\•\-\*▪►◆▸·–\d\.\)]\s*/, '');
      content = content.replace(/^I\s+(am|was|have|worked|helped|built|led)\b\s*/i, '');
      for (const [weak, strong] of Object.entries(VERB_MAP)) {
        const re = new RegExp(`^${weak}\\b`, 'i');
        if (re.test(content)) { content = content.replace(re, strong); break; }
      }
      return '• ' + content.charAt(0).toUpperCase() + content.slice(1);
    }
    return line;
  });

  const hasSummary = /\b(summary|objective|profile|about)\b/i.test(rawText);
  if (!hasSummary) {
    const summary = [
      '', 'PROFESSIONAL SUMMARY', '─────────────────────',
      `Results-driven ${roleTitle} with hands-on experience in ${topSkills}.`,
      `Passionate about delivering high-quality solutions and driving measurable impact.`,
      `Seeking a ${roleTitle} role to apply technical expertise and contribute to team success.`, '',
    ].join('\n');
    rewritten.unshift(summary);
  }
  return rewritten.join('\n');
};

// ─── Claude (Anthropic) AI rewrite ───────────────────────────────────────────
const claudeRewrite = async (rawText, parsedData, effectiveRole) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.warn('[Rewriter] ANTHROPIC_API_KEY not set — using rule-based fallback.');
    return null;
  }

  const roleData     = JOB_ROLE_KEYWORDS[effectiveRole];
  const roleTitle    = roleData?.title || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'a professional role');
  const roleKeywords = roleData
    ? [...(roleData.required || []), ...(roleData.preferred || [])].slice(0, 12).join(', ')
    : 'relevant industry skills';

  const systemPrompt = `You are an expert resume writer and ATS optimization specialist with 15+ years of experience helping candidates land jobs at top companies.

Your job is to SUBSTANTIALLY improve the given resume for a ${roleTitle} role. You must make REAL, MEANINGFUL changes — not cosmetic ones.

═══════════════════════════════════════
WHAT YOU MUST DO (ALL of these):
═══════════════════════════════════════

1. PROFILE / SUMMARY
   - Write a compelling 3-4 sentence professional summary that highlights the candidate's strongest value proposition for ${roleTitle}.
   - Make it specific to their actual background, not generic.

2. EDUCATION
   - Keep all existing education entries.
   - If percentage/CGPA is present, keep it. If secondary/high school details exist, include them with grades.
   - Format clearly with institution, degree, dates, and scores.

3. SKILLS SECTION
   - Expand and restructure into categorized rows: Languages, Frameworks & Libraries, Tools & Platforms, Concepts.
   - Add ATS-critical keywords for ${roleTitle}: ${roleKeywords}.
   - Only add skills that are plausible given their existing profile — do NOT fabricate.

4. EXPERIENCE / PROJECTS (most important section)
   - Rewrite EVERY bullet point to start with a strong action verb (Engineered, Architected, Spearheaded, Optimized, Automated, Deployed, Integrated, etc.).
   - Add quantified impact wherever reasonably inferable (e.g., "reducing load time by X%", "improving accuracy to X%").
   - Add tech stack details to each project/experience if not already there.
   - If the project bullets are vague, make them specific and technical.
   - Expand thin bullet points into 2-3 strong bullets.

5. ACHIEVEMENTS / CERTIFICATIONS
   - Keep all existing ones.
   - Format them clearly as bullet points.

═══════════════════════════════════════
STRICT RULES:
═══════════════════════════════════════
- Do NOT invent fake companies, fake degrees, or fake job titles.
- Do NOT change the person's real name, contact info, or actual work history.
- Do NOT add fake metrics you cannot reasonably infer.
- Remove all first-person pronouns (I, my, me, we).
- Use clean plain-text formatting (no markdown, no asterisks, no bold/italic markers).
- Sections must be in this order: Name/Contact, Profile, Education, Skills, Projects/Experience, Achievements.

Return ONLY the improved resume text. No commentary, no explanations, no code fences.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     systemPrompt,
        messages: [
          {
            role:    'user',
            content: `TARGET ROLE: ${roleTitle}\n\nRESUME TO IMPROVE:\n${rawText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Rewriter] Claude API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    if (!text || text.trim().length < 100) {
      console.warn('[Rewriter] Claude returned empty/short text — falling back to rule-based.');
      return null;
    }

    console.log('[Rewriter] ✅ Claude AI rewrite successful');
    return text.trim();

  } catch (err) {
    console.error('[Rewriter] Claude error:', err.message);
    return null;
  }
};

// ─── Main controller ──────────────────────────────────────────────────────────
// POST /api/rewrite/:resumeId
// Body: { jobRole: string }
const rewriteResume = async (req, res) => {
  try {
    const { jobRole } = req.body;

    const resume = await Resume.findOne({
      _id:  req.params.resumeId,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }
    if (!resume.rawText || resume.rawText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Resume text is too short or not available. Please re-upload.',
      });
    }

    const normalizedRole = normalizeJobRole(jobRole)
      || normalizeJobRole(resume.analysis?.selectedJobRole)
      || null;

    const effectiveRole = normalizedRole || null;
    const roleTitle = JOB_ROLE_KEYWORDS[effectiveRole]?.title
      || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'General Professional');

    console.log(`[Rewriter] Rewriting for role: ${effectiveRole || 'auto'} — resume: ${resume._id}`);

    // Try Claude first, fall back to rule-based
    const aiText        = await claudeRewrite(resume.rawText, resume.parsedData, effectiveRole);
    const rewrittenText = aiText || ruleBasedRewrite(resume.rawText, resume.parsedData, effectiveRole);
    const method        = aiText ? 'ai' : 'rule-based';

    return res.json({
      success:       true,
      method,
      roleUsed:      effectiveRole || 'auto',
      roleTitle,
      originalText:  resume.rawText,
      rewrittenText,
      message: aiText
        ? `Resume optimized for ${roleTitle} using Claude AI.`
        : `Resume improved for ${roleTitle} using rule-based rewriting. Add ANTHROPIC_API_KEY to .env for AI-powered rewrites.`,
    });

  } catch (err) {
    console.error('[rewriteController]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Rewrite failed. Please try again.',
      error:   process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

module.exports = { rewriteResume };
