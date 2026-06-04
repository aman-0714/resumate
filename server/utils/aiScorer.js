// utils/aiScorer.js
// ATS Resume Scorer — rule-based scoring using parsed resume data
// Exports: scoreResume(rawText, parsedData, jobRole) → result object
//          JOB_ROLE_KEYWORDS

'use strict';

const { extractSkills, detectSections } = require('./resumeParser');

// ─────────────────────────────────────────────────────────────────
// JOB ROLE KEYWORD MAP
// ─────────────────────────────────────────────────────────────────

const JOB_ROLE_KEYWORDS = {
  software_engineer: {
    title: 'Software Engineer',
    keywords: ['python','javascript','java','git','sql','rest api','data structures',
               'algorithms','oop','react','node.js','docker','linux','agile'],
  },
  frontend_developer: {
    title: 'Frontend Developer',
    keywords: ['react','javascript','typescript','html','css','tailwind','redux',
               'webpack','vite','git','rest api','responsive design','figma'],
  },
  backend_developer: {
    title: 'Backend Developer',
    keywords: ['node.js','python','java','sql','mongodb','postgresql','rest api',
               'docker','git','express','authentication','microservices','aws'],
  },
  fullstack_developer: {
    title: 'Full Stack Developer',
    keywords: ['react','node.js','javascript','sql','mongodb','rest api','git',
               'docker','html','css','express','typescript','aws'],
  },
  data_scientist: {
    title: 'Data Scientist',
    keywords: ['python','machine learning','pandas','numpy','sql','scikit-learn',
               'data analysis','tensorflow','pytorch','statistics','git','jupyter'],
  },
  ml_engineer: {
    title: 'ML Engineer',
    keywords: ['python','tensorflow','pytorch','machine learning','deep learning',
               'scikit-learn','docker','aws','git','sql','nlp','model deployment'],
  },
  devops_engineer: {
    title: 'DevOps Engineer',
    keywords: ['docker','kubernetes','aws','ci/cd','linux','terraform','git',
               'bash','jenkins','ansible','monitoring','nginx'],
  },
  data_analyst: {
    title: 'Data Analyst',
    keywords: ['sql','python','excel','tableau','power bi','data analysis','pandas',
               'statistics','visualization','reporting','git'],
  },
};

// ─────────────────────────────────────────────────────────────────
// ACTION VERBS
// ─────────────────────────────────────────────────────────────────

const STRONG_VERBS = [
  'developed','built','designed','implemented','architected','engineered',
  'deployed','automated','optimized','scaled','led','managed','launched',
  'created','integrated','reduced','increased','improved','delivered',
  'shipped','collaborated','mentored','contributed','resolved','migrated',
  'refactored','tested','analyzed','researched','presented','achieved',
];

const WEAK_VERBS = [
  'worked','helped','assisted','did','made','used','responsible for',
  'involved in','participated in',
];

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

const countBullets = (text) =>
  (text.match(/^\s*[•\-\*\u2022\u25cf\u2013>]\s+/gm) || []).length;

const avgBulletLen = (text) => {
  const lines = (text.match(/^\s*[•\-\*\u2022\u25cf\u2013>]\s+(.+)$/gm) || []);
  if (!lines.length) return 0;
  return Math.round(lines.reduce((s, l) => s + l.split(' ').length, 0) / lines.length);
};

const readabilityScore = (text) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const words     = text.split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return 50;
  const avgWords  = words.length / sentences.length;
  if (avgWords <= 15)       return 90;
  if (avgWords <= 20)       return 75;
  if (avgWords <= 28)       return 60;
  return 45;
};

// ─────────────────────────────────────────────────────────────────
// MAIN SCORER
// ─────────────────────────────────────────────────────────────────

const scoreResume = async (rawText, parsedData, jobRole) => {
  const lower       = rawText.toLowerCase();
  const wordCount   = rawText.split(/\s+/).filter(Boolean).length;
  const sentences   = rawText.split(/[.!?]+/).filter(s => s.trim().length > 10).length;

  // ── Sections ──────────────────────────────────────────────────
  const sectionsFound = detectSections(rawText);
  const sections = {
    education:      sectionsFound.includes('education'),
    experience:     sectionsFound.includes('experience'),
    skills:         sectionsFound.includes('skills'),
    projects:       sectionsFound.includes('projects'),
    certifications: sectionsFound.includes('certifications'),
    summary:        sectionsFound.includes('summary') || sectionsFound.includes('objective'),
    achievements:   sectionsFound.includes('achievements') || sectionsFound.includes('awards'),
  };

  // ── Keywords ──────────────────────────────────────────────────
  const roleKey      = jobRole ? jobRole.toLowerCase().replace(/\s+/g, '_') : null;
  const roleData     = roleKey && JOB_ROLE_KEYWORDS[roleKey]
    ? JOB_ROLE_KEYWORDS[roleKey]
    : JOB_ROLE_KEYWORDS['software_engineer'];

  const allKeywords  = roleData.keywords;
  const matched      = allKeywords.filter(k => lower.includes(k));
  const missing      = allKeywords.filter(k => !lower.includes(k));
  const matchPct     = Math.round((matched.length / allKeywords.length) * 100);

  // Related skill matches (from parsed skills that aren't in the main keyword list)
  const parsedSkills = parsedData?.skills || extractSkills(rawText);
  const relatedMatches = parsedSkills.filter(s => !matched.includes(s)).slice(0, 8);

  const keywordScore = Math.round((matchPct / 100) * 10);

  // ── ATS ───────────────────────────────────────────────────────
  let atsScore = 0;
  const atsIssues = [];

  // Contact info
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rawText)) atsScore += 2;
  else atsIssues.push('Missing email address');

  if (/[6-9]\d{9}|\+91[\s-]?\d{10}/.test(rawText)) atsScore += 1;
  else atsIssues.push('Missing phone number');

  // Required sections
  const sectionChecks = [
    ['skills',      sections.skills,      2, 'Add a Skills section'],
    ['education',   sections.education,   2, 'Add an Education section'],
    ['experience',  sections.experience,  2, 'Add an Experience section'],
    ['projects',    sections.projects,    2, 'Add a Projects section'],
    ['summary',     sections.summary,     1, 'Add a Summary/Objective section'],
  ];
  for (const [, present, pts, msg] of sectionChecks) {
    if (present) atsScore += pts;
    else atsIssues.push(msg);
  }

  // Word count
  if (wordCount >= 400)      atsScore += 1;
  else if (wordCount < 200)  atsIssues.push('Resume is too short (under 200 words)');

  const atsMax     = 11;
  const atsNorm    = Math.round((atsScore / atsMax) * 10);
  const atsVerdict = atsNorm >= 8 ? 'ATS Optimized ✅' : atsNorm >= 5 ? 'Partially Optimized 🟡' : 'Needs Work 🔴';

  // ── Formatting ────────────────────────────────────────────────
  const bullets     = countBullets(rawText);
  const avgBLen     = avgBulletLen(rawText);
  const readScore   = readabilityScore(rawText);

  // ── Action verbs ──────────────────────────────────────────────
  const usedVerbs  = STRONG_VERBS.filter(v => lower.includes(v));
  const usedWeak   = WEAK_VERBS.filter(v => lower.includes(v));
  const verbScore  = Math.min(10, Math.round((usedVerbs.length / 6) * 10));

  // ── Grammar (heuristic) ───────────────────────────────────────
  const grammarIssues = [];
  if (usedWeak.length > 0) grammarIssues.push(`Replace weak verbs: ${usedWeak.slice(0, 3).join(', ')}`);
  if (bullets < 5)         grammarIssues.push('Add more bullet points to experience/projects');
  const grammarScore = Math.max(0, 10 - grammarIssues.length * 2);

  // ── Composite score ───────────────────────────────────────────
  // Weighted: ATS(30%) + Keywords(35%) + ActionVerbs(20%) + Grammar(15%)
  const score = Math.min(100, Math.round(
    atsNorm     * 3   +
    keywordScore * 3.5 +
    verbScore   * 2   +
    grammarScore * 1.5
  ));

  // ── Strengths & Weaknesses ────────────────────────────────────
  const strengths  = [];
  const weaknesses = [];
  const suggestions = [];

  if (matched.length >= Math.floor(allKeywords.length * 0.7))
    strengths.push(`Strong keyword match: ${matched.slice(0, 4).join(', ')}`);
  if (sections.projects)    strengths.push('Projects section present — great for showcasing work');
  if (usedVerbs.length >= 5) strengths.push(`Strong action verbs: ${usedVerbs.slice(0, 3).join(', ')}`);
  if (bullets >= 8)          strengths.push('Good use of bullet points for readability');
  if (sections.certifications) strengths.push('Certifications listed — adds credibility');

  if (missing.length > 0) {
    weaknesses.push(`Missing keywords for ${roleData.title}: ${missing.slice(0, 4).join(', ')}`);
    suggestions.push(`Add these skills to your resume: ${missing.slice(0, 4).join(', ')}`);
  }
  if (!sections.summary) {
    weaknesses.push('No professional summary/objective');
    suggestions.push('Add a 2-3 line professional summary at the top');
  }
  if (bullets < 5) {
    weaknesses.push('Too few bullet points');
    suggestions.push('Use bullet points in experience and projects sections');
  }
  if (usedVerbs.length < 3) {
    weaknesses.push('Few strong action verbs');
    suggestions.push('Start bullets with: developed, built, implemented, deployed, optimized');
  }
  if (wordCount < 300) {
    weaknesses.push('Resume is short — add more detail');
    suggestions.push('Expand your experience and project descriptions');
  }

  // ── Missing skills (distinct from keyword gaps) ───────────────
  const missingSkills = missing.slice(0, 8);

  return {
    score,
    summary: `Your resume scored ${score}/100 for ${roleData.title} roles. ${
      score >= 80 ? 'Excellent match!' :
      score >= 60 ? 'Good foundation — a few improvements will help.' :
      'Several areas need attention to pass ATS filters.'
    }`,
    selectedJobRole: roleData.title,

    ats: {
      score:   atsNorm,
      verdict: atsVerdict,
      issues:  atsIssues,
    },

    sections,

    keywords: {
      matched,
      relatedMatches,
      missing,
      matchPercentage: matchPct,
      score: keywordScore,
    },

    formatting: {
      bulletPointsDetected: bullets > 0,
      totalBulletPoints:    bullets,
      avgBulletLength:      avgBLen,
      readabilityScore:     readScore,
    },

    actionVerbs: {
      used:      usedVerbs,
      count:     usedVerbs.length,
      weakVerbs: usedWeak,
    },

    metrics: {
      wordCount,
      sentenceCount:       sentences,
      avgWordsPerSentence: sentences ? Math.round(wordCount / sentences) : 0,
    },

    grammar: {
      score:  grammarScore,
      issues: grammarIssues,
    },

    missingSkills,
    strengths,
    weaknesses,
    suggestions,
    matchedKeywords: matched,
  };
};

module.exports = { scoreResume, JOB_ROLE_KEYWORDS };
