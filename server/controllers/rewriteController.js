// controllers/rewriteController.js
// AI-powered resume rewriter using Anthropic Claude API
'use strict';

const path = require('path');
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

  const systemPrompt = `You are a professional resume writer and ATS optimization expert with 15+ years of experience helping candidates land jobs at top companies.

Rewrite the resume below for a ${roleTitle} role following ALL rules below precisely.

═══════════════════════════════════════
OUTPUT FORMAT — STRICTLY REQUIRED
═══════════════════════════════════════

Use ONLY these section headings in UPPERCASE, in this exact order:
  SUMMARY
  EDUCATION
  SKILLS
  EXPERIENCE   (if any jobs/internships exist)
  PROJECTS     (if any projects exist)
  ACHIEVEMENTS (if any exist)

Under each heading, follow these rules:

SUMMARY
  • 3-4 sentences max. Strong value proposition for ${roleTitle}.
  • No first-person pronouns.

EDUCATION
  • One line per degree: Degree | Institution | Year | Score (if given)
  • Include ALL entries from the original — do not drop any.

SKILLS
  • Format as labelled rows (no bullets), e.g.:
      Languages     : Python, C++, JavaScript
      Frameworks    : React, Node.js, Express
      Tools         : Git, Docker, VS Code
      Concepts      : REST APIs, OOP, Data Structures
  • Incorporate ATS keywords for ${roleTitle}: ${roleKeywords}
  • Only add skills plausible from the candidate's background.

EXPERIENCE / PROJECTS
  • Every entry must have:
      Title / Company / Role  |  Date range
      • Bullet 1 (action verb + tech + impact)
      • Bullet 2
      • Bullet 3 (optional)
  • Each bullet starts with a strong action verb (Engineered, Architected, Automated, Optimized, Deployed, Integrated, Spearheaded, Reduced, Increased, Designed, Built, Implemented, Developed, Led, etc.)
  • Each bullet max 20 words.
  • Add quantified impact wherever reasonably inferable (%, ms, users, etc.)
  • Remove all first-person pronouns.

ACHIEVEMENTS
  • Bullet list of certifications, awards, publications, competitions.
  • Keep all original achievements; improve wording only.

═══════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════
- Do NOT invent companies, degrees, job titles, or fake metrics.
- Do NOT change name, contact info, or actual work history.
- Do NOT use markdown (no **, no #, no backticks).
- Do NOT add commentary, preamble, or code fences.
- Plain text only. Indentation with spaces is fine.
- Return ONLY the improved resume text — nothing else.`;

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

// ─── PDF builder helper ───────────────────────────────────────────────────────
// Builds a clean, ATS-friendly PDF from plain rewritten text using pdfkit.
const buildResumePDF = async (rewrittenText, fileName) => {
  // Lazy-require so the server still boots if pdfkit isn't installed yet
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch {
    throw new Error('pdfkit is not installed. Run: npm install pdfkit');
  }

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Fonts ────────────────────────────────────────────────────────────────
    const FONT_BOLD   = 'Helvetica-Bold';
    const FONT_NORMAL = 'Helvetica';
    const COLOR_HEAD  = '#1a1a2e'; // near-black navy
    const COLOR_LINE  = '#4a4a8a'; // muted indigo rule
    const COLOR_TEXT  = '#2d2d2d';
    const COLOR_SUB   = '#555555';

    const PAGE_WIDTH = doc.page.width - 100; // accounting for margins

    // ── Section heading renderer ─────────────────────────────────────────────
    const drawSection = (title) => {
      doc.moveDown(0.6);
      doc
        .font(FONT_BOLD)
        .fontSize(11)
        .fillColor(COLOR_HEAD)
        .text(title.toUpperCase(), { continued: false });
      // horizontal rule
      const y = doc.y + 2;
      doc
        .moveTo(50, y)
        .lineTo(50 + PAGE_WIDTH, y)
        .strokeColor(COLOR_LINE)
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(0.3);
    };

    // ── Parse the plain text into sections ───────────────────────────────────
    const KNOWN_SECTIONS = ['SUMMARY', 'EDUCATION', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'ACHIEVEMENTS'];
    const lines = rewrittenText.split('\n');

    // Separate header block (name + contact) from sections
    // Heuristic: everything before the first known section heading is the header
    let headerLines = [];
    let bodyLines   = [];
    let inBody      = false;
    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (!inBody && KNOWN_SECTIONS.includes(trimmed)) {
        inBody = true;
      }
      if (inBody) bodyLines.push(line);
      else         headerLines.push(line);
    }

    // ── Render header ────────────────────────────────────────────────────────
    const nonEmpty = headerLines.filter(l => l.trim());
    if (nonEmpty.length) {
      // First non-empty line = candidate name
      doc
        .font(FONT_BOLD)
        .fontSize(20)
        .fillColor(COLOR_HEAD)
        .text(nonEmpty[0].trim(), { align: 'center' });

      // Remaining header lines = contact info
      if (nonEmpty.length > 1) {
        doc
          .font(FONT_NORMAL)
          .fontSize(9)
          .fillColor(COLOR_SUB)
          .text(nonEmpty.slice(1).map(l => l.trim()).filter(Boolean).join('  |  '), { align: 'center' });
      }
      doc.moveDown(0.4);
      // full-width divider
      const y = doc.y;
      doc.moveTo(50, y).lineTo(50 + PAGE_WIDTH, y).strokeColor(COLOR_LINE).lineWidth(1.2).stroke();
      doc.moveDown(0.4);
    }

    // ── Render body sections ─────────────────────────────────────────────────
    let i = 0;
    while (i < bodyLines.length) {
      const trimmed = bodyLines[i].trim().toUpperCase();

      if (KNOWN_SECTIONS.includes(trimmed)) {
        drawSection(bodyLines[i].trim());
        i++;

        // Collect lines until next section
        const sectionLines = [];
        while (i < bodyLines.length && !KNOWN_SECTIONS.includes(bodyLines[i].trim().toUpperCase())) {
          sectionLines.push(bodyLines[i]);
          i++;
        }

        if (trimmed === 'SKILLS') {
          // Skills: labelled rows
          for (const line of sectionLines) {
            if (!line.trim()) { doc.moveDown(0.2); continue; }
            if (line.includes(':')) {
              const [label, ...rest] = line.split(':');
              doc
                .font(FONT_BOLD).fontSize(9).fillColor(COLOR_TEXT)
                .text(label.trim() + ': ', { continued: true })
                .font(FONT_NORMAL).fillColor(COLOR_SUB)
                .text(rest.join(':').trim());
            } else {
              doc.font(FONT_NORMAL).fontSize(9).fillColor(COLOR_SUB).text(line.trim());
            }
            doc.moveDown(0.15);
          }

        } else if (trimmed === 'SUMMARY') {
          const paragraphs = sectionLines.filter(l => l.trim()).join(' ');
          doc
            .font(FONT_NORMAL).fontSize(9.5).fillColor(COLOR_TEXT)
            .text(paragraphs, { width: PAGE_WIDTH, lineGap: 2 });
          doc.moveDown(0.3);

        } else {
          // EDUCATION / EXPERIENCE / PROJECTS / ACHIEVEMENTS
          for (const line of sectionLines) {
            const t = line.trim();
            if (!t) { doc.moveDown(0.2); continue; }

            if (t.startsWith('•') || t.startsWith('-')) {
              // bullet
              const bullet = '•  ' + t.replace(/^[•\-]\s*/, '');
              doc
                .font(FONT_NORMAL).fontSize(9.5).fillColor(COLOR_TEXT)
                .text(bullet, { indent: 10, width: PAGE_WIDTH - 10, lineGap: 1.5 });
            } else if (/\|/.test(t)) {
              // sub-header with pipe separators (e.g. role | company | date)
              doc
                .font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_HEAD)
                .text(t, { width: PAGE_WIDTH });
            } else {
              // plain text (e.g. degree line)
              doc
                .font(FONT_NORMAL).fontSize(9.5).fillColor(COLOR_TEXT)
                .text(t, { width: PAGE_WIDTH, lineGap: 1.5 });
            }
            doc.moveDown(0.1);
          }
        }

      } else {
        i++; // skip stray lines between sections
      }
    }

    doc.end();
  });
};

// ─── Main rewrite controller ──────────────────────────────────────────────────
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

// ─── PDF download controller ──────────────────────────────────────────────────
// POST /api/rewrite/:resumeId/pdf
// Body: { rewrittenText: string, fileName?: string }
const downloadRewrittenPDF = async (req, res) => {
  try {
    const { rewrittenText, fileName } = req.body;

    if (!rewrittenText || rewrittenText.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'No rewritten text provided.' });
    }

    // Verify resume ownership
    const resume = await Resume.findOne({
      _id:  req.params.resumeId,
      user: req.user._id,
    });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const pdfBuffer = await buildResumePDF(rewrittenText, fileName || resume.fileName);
    const safeName  = (fileName || resume.fileName || 'resume')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_\- ]/g, '_');

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}_optimized.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error('[downloadRewrittenPDF]', err.message);
    return res.status(500).json({
      success: false,
      message: err.message.includes('pdfkit') ? err.message : 'PDF generation failed.',
    });
  }
};

module.exports = { rewriteResume, downloadRewrittenPDF };
