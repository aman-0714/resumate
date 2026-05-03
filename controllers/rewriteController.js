// controllers/rewriteController.js
// AI-powered resume rewriter using HuggingFace Mistral (free tier)
// Rewrites the user's resume for a specific job role without changing facts.
'use strict';

const Resume = require('../models/Resume');
const { JOB_ROLE_KEYWORDS, normalizeJobRole } = require('../utils/aiScorer');

// ─── Weak → Strong verb substitution map ─────────────────────────────────────
const VERB_MAP = {
  'worked on':         'Developed',
  'worked with':       'Collaborated on',
  'worked':            'Executed',
  'helped':            'Supported',
  'assisted':          'Collaborated on',
  'was responsible for': 'Managed',
  'was involved in':   'Contributed to',
  'involved in':       'Contributed to',
  'did':               'Executed',
  'made':              'Produced',
  'tried':             'Implemented',
  'got':               'Achieved',
  'handled':           'Managed',
  'did work':          'Executed',
};

// ─── Rule-based local rewriter (fallback if HF is unavailable) ───────────────
const ruleBasedRewrite = (rawText, parsedData, effectiveRole) => {
  const lines = rawText.split('\n');
  const roleData = JOB_ROLE_KEYWORDS[effectiveRole];
  const topSkills = (parsedData?.skills || []).slice(0, 5).join(', ') || 'relevant technologies';
  const roleTitle = roleData?.title || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'the target role');

  const rewritten = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Replace bullet weak verbs
    if (/^[\•\-\*▪►◆▸·–]\s+/i.test(trimmed) || /^\d+[\.\)]\s+/i.test(trimmed)) {
      let content = trimmed.replace(/^[\•\-\*▪►◆▸·–\d\.\)]\s*/, '');
      content = content.replace(/^I\s+(am|was|have|worked|helped|built|led)\b\s*/i, '');
      for (const [weak, strong] of Object.entries(VERB_MAP)) {
        const re = new RegExp(`^${weak}\\b`, 'i');
        if (re.test(content)) {
          content = content.replace(re, strong);
          break;
        }
      }
      return '• ' + content.charAt(0).toUpperCase() + content.slice(1);
    }

    return line;
  });

  // Prepend summary if missing
  const hasSummary = /\b(summary|objective|profile|about)\b/i.test(rawText);
  if (!hasSummary) {
    const summary = [
      '',
      'PROFESSIONAL SUMMARY',
      '─────────────────────',
      `Results-driven ${roleTitle} with hands-on experience in ${topSkills}.`,
      `Passionate about delivering high-quality solutions and driving measurable impact.`,
      `Seeking a ${roleTitle} role to apply technical expertise and contribute to team success.`,
      '',
    ].join('\n');
    rewritten.unshift(summary);
  }

  return rewritten.join('\n');
};

// ─── HuggingFace AI rewrite ───────────────────────────────────────────────────
const hfRewrite = async (rawText, parsedData, effectiveRole) => {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey || apiKey === 'your_hf_api_key_here') {
    console.warn('[Rewriter] HF_API_KEY not set — using rule-based rewriter.');
    return null;
  }

  const roleData  = JOB_ROLE_KEYWORDS[effectiveRole];
  const roleTitle = roleData?.title || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'a professional role');
  const roleKeywords = roleData
    ? [...roleData.required, ...roleData.preferred].slice(0, 10).join(', ')
    : 'relevant industry skills';

  const systemPrompt = `You are a professional resume writer and ATS optimization expert.
Your task is to improve the given resume.

IMPORTANT RULES:
- Do NOT change the person's facts, education, or experience.
- Do NOT add fake information, fake companies, fake degrees, or fake projects.
- Do NOT invent metrics — only add numbers if they can be reasonably inferred.
- Only rewrite and improve existing content.

GOALS:
1. Replace weak verbs (like "worked", "assisted") with strong action verbs (Spearheaded, Engineered, Optimized).
2. Add missing industry-relevant keywords naturally for ATS — focus on: ${roleKeywords}.
3. Improve bullet points to be impact-driven and results-oriented.
4. Keep sentences concise and professional (each bullet under 20 words).
5. Ensure proper resume structure: Summary, Skills, Experience, Projects, Education.
6. Remove first-person pronouns (I, my, me).

STYLE:
- Use bullet points starting with strong action verbs for experience and projects.
- Keep tone professional and human-like.
- Maintain clean formatting.

Return ONLY the improved resume text. No explanations, no markdown fences, no commentary.`;

  const prompt = `<s>[INST] ${systemPrompt}

TARGET ROLE: ${roleTitle}

RESUME TO IMPROVE:
${rawText.slice(0, 3000)}
[/INST]</s>`;

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens:   1200,
            temperature:      0.4,
            return_full_text: false,
            stop:             ['</s>', '[INST]'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 503) {
        console.warn('[Rewriter] HF model warming up (503) — falling back to rule-based rewriter.');
      } else {
        console.error('[Rewriter] HF API error:', response.status, errText);
      }
      return null;
    }

    const data = await response.json();
    const text = Array.isArray(data)
      ? (data[0]?.generated_text || '')
      : (data?.generated_text || '');

    if (!text || text.trim().length < 100) {
      console.warn('[Rewriter] HF returned empty/short text — falling back to rule-based.');
      return null;
    }

    console.log('[Rewriter] ✅ HF AI rewrite successful');
    return text.trim();

  } catch (err) {
    console.error('[Rewriter] HF error:', err.message);
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
      _id: req.params.resumeId,
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

    // Normalize job role — fall back to what was used during analysis
    const normalizedRole = normalizeJobRole(jobRole)
      || normalizeJobRole(resume.analysis?.selectedJobRole)
      || null;

    const effectiveRole = normalizedRole || null;
    const roleTitle = JOB_ROLE_KEYWORDS[effectiveRole]?.title
      || (effectiveRole ? effectiveRole.replace(/-/g, ' ') : 'General Professional');

    console.log(`[Rewriter] Rewriting for role: ${effectiveRole || 'auto'} — resume: ${resume._id}`);

    // Try AI first, fall back to rule-based
    const aiText   = await hfRewrite(resume.rawText, resume.parsedData, effectiveRole);
    const rewrittenText = aiText || ruleBasedRewrite(resume.rawText, resume.parsedData, effectiveRole);
    const method   = aiText ? 'ai' : 'rule-based';

    return res.json({
      success:       true,
      method,
      roleUsed:      effectiveRole || 'auto',
      roleTitle,
      originalText:  resume.rawText,
      rewrittenText,
      message:       aiText
        ? `Resume optimized for ${roleTitle} using AI.`
        : `Resume improved for ${roleTitle} using smart rule-based rewriting. Set HF_API_KEY for AI-powered rewrites.`,
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
